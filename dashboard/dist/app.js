const escribir = (id, texto) => { document.getElementById(id).textContent = texto; };
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const entero = new Intl.NumberFormat('es-ES');
const dia = texto => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(`${texto}T12:00:00Z`));
document.getElementById('imprimir').addEventListener('click', () => window.print());
try {
  const [resumen, calidad] = await Promise.all(['resumen', 'calidad'].map(async nombre => {
    const respuesta = await fetch(`datos/${nombre}.json`, { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(`No se pudo leer ${nombre}.json (${respuesta.status})`);
    return respuesta.json();
  }));
  if (resumen.generado_en !== calidad.generado_en || resumen.operaciones_validas !== calidad.operaciones_validas || !calidad.balance_correcto) throw new Error('Los informes no corresponden a la misma ejecución validada');
  escribir('ingresos', euros.format(resumen.ingresos_totales));
  escribir('operaciones', entero.format(resumen.operaciones_validas));
  escribir('unidades', entero.format(resumen.unidades_totales));
  escribir('periodo', `${dia(resumen.periodo.desde)} — ${dia(resumen.periodo.hasta)}`);
  escribir('generado', `Generado: ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Madrid' }).format(new Date(resumen.generado_en))} · Madrid`);
  for (const [id, campo] of [['entrada', 'filas_entrada'], ['duplicadas', 'copias_duplicadas_excluidas'], ['incidencias', 'incidencias_excluidas']]) escribir(id, entero.format(calidad[campo]));
  escribir('balance', `✓ Balance verificado: ${calidad.filas_entrada} = ${calidad.operaciones_validas} + ${calidad.copias_duplicadas_excluidas} + ${calidad.incidencias_excluidas}`);
  const barras = document.getElementById('barras');
  const maximo = Math.max(0, ...resumen.ingresos_por_categoria.map(fila => fila.ingresos));
  barras.setAttribute('aria-label', resumen.ingresos_por_categoria.map(fila => `${fila.categoria}: ${euros.format(fila.ingresos)}`).join('; '));
  for (const fila of resumen.ingresos_por_categoria) {
    const bloque = document.createElement('div'); bloque.className = 'barra-fila';
    const cabecera = document.createElement('div'); cabecera.className = 'barra-cabecera';
    const nombre = document.createElement('strong'); nombre.textContent = fila.categoria;
    const importe = document.createElement('span'); importe.textContent = `${euros.format(fila.ingresos)} · ${resumen.ingresos_totales ? (fila.ingresos / resumen.ingresos_totales * 100).toFixed(1).replace('.', ',') : '0'} %`;
    cabecera.append(nombre, importe);
    const pista = document.createElement('div'); pista.className = 'pista';
    const barra = document.createElement('div'); barra.className = 'barra'; barra.style.width = `${maximo ? fila.ingresos / maximo * 100 : 0}%`;
    pista.append(barra); bloque.append(cabecera, pista); barras.append(bloque);
  }
  const filas = [...calidad.duplicados.map(fila => ({ ...fila, tipo: 'Duplicado' })), ...calidad.incidencias.map(fila => ({ ...fila, tipo: 'Incidencia' }))].sort((a, b) => a.fila_csv - b.fila_csv);
  for (const fila of filas) {
    const tr = document.createElement('tr');
    for (const texto of [fila.venta_id || '(vacío)', fila.fila_csv, fila.tipo, fila.motivo]) { const td = document.createElement('td'); td.textContent = texto; tr.append(td); }
    document.getElementById('excluidos').append(tr);
  }
  escribir('estado', '✓ Datos cargados y balance verificado');
} catch (error) {
  escribir('estado', `No se pueden mostrar las métricas: ${error.message}. Ejecuta npm run procesar y abre el dashboard con npm start.`);
  document.getElementById('estado').className = 'error';
}
