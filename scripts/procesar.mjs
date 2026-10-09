import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const periodo = { desde: '2026-10-01', hasta: '2026-10-07' };
const campos = ['venta_id', 'fecha', 'producto_id', 'unidades', 'precio_unitario'];
const redondear = numero => Math.round((numero + Number.EPSILON) * 100) / 100;

export function leerCSV(texto) {
  const lineas = texto.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
  const cabecera = lineas.shift().split(',');
  if (cabecera.join(',') !== campos.join(',')) throw new Error('Cabecera CSV inesperada');
  return lineas.map((linea, indice) => {
    const valores = linea.split(',');
    if (valores.length !== campos.length) throw new Error(`Fila ${indice + 2}: número de campos incorrecto`);
    return { ...Object.fromEntries(campos.map((campo, i) => [campo, valores[i]])), fila_csv: indice + 2 };
  });
}

export function procesar(ventas, productos, generado_en = new Date().toISOString()) {
  if (!Array.isArray(productos)) throw new Error('El catálogo debe ser una lista');
  const indice = new Map();
  for (const producto of productos) {
    for (const campo of ['producto_id', 'nombre', 'categoria']) {
      if (typeof producto[campo] !== 'string' || !producto[campo].trim()) throw new Error(`Catálogo: ${campo} obligatorio`);
    }
    if (indice.has(producto.producto_id)) throw new Error(`ID repetido en catálogo: ${producto.producto_id}`);
    indice.set(producto.producto_id, producto);
  }

  // Resolver conflictos antes de aceptar cualquier versión del mismo ID.
  const versiones = new Map();
  const firma = venta => JSON.stringify(campos.map(campo => venta[campo]));
  for (const venta of ventas) {
    if (!venta.venta_id.trim()) continue;
    if (!versiones.has(venta.venta_id)) versiones.set(venta.venta_id, new Set());
    versiones.get(venta.venta_id).add(firma(venta));
  }
  const vistas = new Map();
  const duplicados = [], incidencias = [], validas = [];
  const numero = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  for (const venta of ventas) {
    const { venta_id, fila_csv } = venta;
    if (versiones.get(venta_id)?.size > 1) {
      incidencias.push({ venta_id, fila_csv, motivo: 'ID con datos contradictorios; todas sus versiones quedan excluidas' });
      continue;
    }
    const clave = firma(venta);
    if (venta_id.trim() && vistas.has(clave)) {
      duplicados.push({ venta_id, fila_csv, fila_original: vistas.get(clave), motivo: 'Copia exacta de la misma operación' });
      continue;
    }
    if (venta_id.trim()) vistas.set(clave, fila_csv);
    const motivos = campos.filter(campo => !venta[campo].trim()).map(campo => `Campo obligatorio vacío: ${campo}`);
    const fecha = new Date(`${venta.fecha}T00:00:00Z`);
    if (venta.fecha.trim() && (!/^\d{4}-\d{2}-\d{2}$/.test(venta.fecha) || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== venta.fecha)) {
      motivos.push('Fecha inválida: debe ser un día real en YYYY-MM-DD');
    } else if (venta.fecha.trim() && (venta.fecha < periodo.desde || venta.fecha > periodo.hasta)) motivos.push('Fecha fuera del periodo');
    const unidades = Number(venta.unidades), precio = Number(venta.precio_unitario);
    if (venta.unidades.trim() && (!numero.test(venta.unidades) || !Number.isSafeInteger(unidades) || unidades <= 0)) motivos.push('Unidades: debe ser un entero mayor que cero');
    if (venta.precio_unitario.trim() && (!numero.test(venta.precio_unitario) || !Number.isFinite(precio) || precio < 0)) motivos.push('Precio: debe ser numérico, finito y mayor o igual que cero');
    const producto = indice.get(venta.producto_id);
    if (venta.producto_id.trim() && !producto) motivos.push('Producto inexistente en el catálogo');
    if (!motivos.length && !Number.isFinite(unidades * precio)) motivos.push('Ingreso fuera del rango numérico');
    if (motivos.length) {
      incidencias.push({ venta_id, fila_csv, motivo: motivos.join('; ') });
      continue;
    }
    validas.push({ ...venta, unidades, precio_unitario: precio, nombre: producto.nombre, categoria: producto.categoria, ingreso: unidades * precio });
  }
  const categorias = new Map();
  for (const venta of validas) categorias.set(venta.categoria, (categorias.get(venta.categoria) ?? 0) + venta.ingreso);
  const resumen = {
    periodo, moneda: 'EUR', generado_en,
    operaciones_validas: validas.length,
    unidades_totales: validas.reduce((suma, venta) => suma + venta.unidades, 0),
    ingresos_totales: redondear(validas.reduce((suma, venta) => suma + venta.ingreso, 0)),
    ingresos_por_categoria: [...categorias].map(([categoria, ingresos]) => ({ categoria, ingresos: redondear(ingresos) })).sort((a, b) => b.ingresos - a.ingresos || a.categoria.localeCompare(b.categoria, 'es')),
  };
  const calidad = {
    generado_en, filas_entrada: ventas.length, productos_entrada: productos.length,
    operaciones_validas: validas.length, copias_duplicadas_excluidas: duplicados.length,
    incidencias_excluidas: incidencias.length, duplicados, incidencias,
    balance_correcto: ventas.length === validas.length + duplicados.length + incidencias.length,
  };
  if (!calidad.balance_correcto) throw new Error('El balance de filas no coincide');
  return { resumen, calidad, validas };
}

export async function ejecutar() {
  const raiz = new URL('../', import.meta.url);
  const [texto, catalogo] = await Promise.all([
    readFile(new URL('datos/ventas.csv', raiz), 'utf8'),
    readFile(new URL('datos/productos.json', raiz), 'utf8'),
  ]);
  const { resumen, calidad, validas } = procesar(leerCSV(texto), JSON.parse(catalogo));
  for (const carpeta of ['salida/', 'dashboard/dist/datos/']) await mkdir(new URL(carpeta, raiz), { recursive: true });
  for (const [nombre, resultado] of Object.entries({ resumen, calidad, ventas_enriquecidas: validas })) {
    await writeFile(new URL(`salida/${nombre}.json`, raiz), JSON.stringify(resultado, null, 2) + '\n');
    await copyFile(new URL(`salida/${nombre}.json`, raiz), new URL(`dashboard/dist/datos/${nombre}.json`, raiz));
  }
  console.log(JSON.stringify({ resumen, balance: `${calidad.filas_entrada} = ${validas.length} + ${calidad.copias_duplicadas_excluidas} + ${calidad.incidencias_excluidas}` }, null, 2));
  return { resumen, calidad, validas };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await ejecutar();
