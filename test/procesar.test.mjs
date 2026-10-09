import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leerCSV, procesar, ejecutar } from '../scripts/procesar.mjs';
const raiz = new URL('../', import.meta.url);
const ventas = leerCSV(await readFile(new URL('datos/ventas.csv', raiz), 'utf8'));
const productos = JSON.parse(await readFile(new URL('datos/productos.json', raiz), 'utf8'));
const base = { venta_id: 'X1', fecha: '2026-10-01', producto_id: 'P01', unidades: '1', precio_unitario: '5', fila_csv: 2 };

test('Contraste manual, totales, filas y exclusiones de las fuentes', () => {
  const { resumen, calidad, validas } = procesar(ventas, productos);
  assert.equal(resumen.operaciones_validas, 60);
  assert.equal(resumen.unidades_totales, 150);
  assert.equal(resumen.ingresos_totales, 2343);
  assert.deepEqual(Object.fromEntries(resumen.ingresos_por_categoria.map(f => [f.categoria, f.ingresos])), { Hogar: 1088, Deporte: 875, 'Tecnología': 308, 'Papelería': 72 });
  assert.equal(resumen.ingresos_por_categoria.reduce((s, f) => s + f.ingresos, 0), resumen.ingresos_totales);
  assert.equal(validas.filter(f => ['V001', 'V002', 'V003', 'V004'].includes(f.venta_id)).reduce((s, f) => s + f.ingreso, 0), 5 + 4 + 36 + 100);
  assert.deepEqual(calidad.duplicados.map(f => f.fila_csv), [62, 63, 64, 65, 66]);
  assert.deepEqual(calidad.incidencias.map(f => f.venta_id), ['V061', 'V062', 'V063', 'V064', 'V065']);
  assert.equal(calidad.filas_entrada, calidad.operaciones_validas + calidad.copias_duplicadas_excluidas + calidad.incidencias_excluidas);
});
test('Dos ejecuciones generan iguales métricas, recuentos y copias servidas', async () => {
  const primera = await ejecutar();
  const segunda = await ejecutar();
  for (const resultado of [primera, segunda]) { delete resultado.resumen.generado_en; delete resultado.calidad.generado_en; }
  assert.deepEqual(primera, segunda);
  for (const nombre of ['resumen', 'calidad', 'ventas_enriquecidas']) {
    assert.equal(await readFile(new URL(`salida/${nombre}.json`, raiz), 'utf8'), await readFile(new URL(`dashboard/dist/datos/${nombre}.json`, raiz), 'utf8'));
  }
});
test('Conflictos excluyen también versiones anteriores y sus copias', () => {
  const { calidad, validas } = procesar([base, { ...base, fila_csv: 3 }, { ...base, unidades: '2', fila_csv: 4 }], productos);
  assert.equal(validas.length, 0);
  assert.equal(calidad.incidencias_excluidas, 3);
  assert.equal(calidad.copias_duplicadas_excluidas, 0);
});
test('IDs diferentes no son duplicados; precio cero es válido', () => {
  const { resumen, calidad } = procesar([base, { ...base, venta_id: 'X2', fila_csv: 3 }, { ...base, venta_id: 'X3', precio_unitario: '0', fila_csv: 4 }], productos);
  assert.equal(resumen.operaciones_validas, 3);
  assert.equal(resumen.ingresos_totales, 10);
  assert.equal(calidad.copias_duplicadas_excluidas, 0);
});
test('Vacíos, fechas irreales y fuera de periodo, fracciones y precios inválidos', () => {
  for (const cambio of [{ venta_id: '' }, { unidades: '' }, { precio_unitario: '' }, { fecha: '2026-02-30' }, { fecha: '2026-10-08' }, { unidades: '1.5' }, { unidades: '0' }, { precio_unitario: 'Infinity' }, { precio_unitario: '-1' }, { producto_id: 'P99' }]) {
    const { calidad, validas } = procesar([{ ...base, ...cambio }], productos);
    assert.equal(validas.length, 0, JSON.stringify(cambio));
    assert.equal(calidad.incidencias_excluidas, 1);
  }
});
test('Catálogo ambiguo y CSV mal formado detienen el proceso', () => {
  assert.throws(() => procesar([base], [...productos, productos[0]]), /ID repetido/);
  assert.throws(() => leerCSV('venta_id,fecha,producto_id,unidades,precio_unitario\nX,2026-10-01,P01,1'), /Fila 2/);
});
