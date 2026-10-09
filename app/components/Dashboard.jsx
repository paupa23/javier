'use client';

import { useEffect, useMemo, useState } from 'react';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const entero = new Intl.NumberFormat('es-ES');
const porcentaje = numero => `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(numero)} %`;
const fecha = texto => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(`${texto}T12:00:00Z`));
const colores = ['#8075ff', '#46bba5', '#f5ad62', '#e38eae'];

function Icono({ nombre, size = 20 }) {
  const rutas = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    check: <><path d="m8 12 3 3 5-6"/><path d="m12 3 8 4v5c0 4-5 8-8 9-3-1-8-5-8-9V7l8-4Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 4 9-4V8M12 13v9m-5-16 10 5"/></>,
    sales: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z M9 8h6m-6 4h6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    chart: <><path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{rutas[nombre] ?? rutas.grid}</svg>;
}

function Contador({ valor, moneda = false }) {
  const [visible, setVisible] = useState(valor);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame;
    const inicio = performance.now();
    const avanzar = tiempo => {
      const progreso = Math.min((tiempo - inicio) / 1100, 1);
      setVisible(valor * (1 - Math.pow(1 - progreso, 3)));
      if (progreso < 1) frame = requestAnimationFrame(avanzar);
    };
    frame = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(frame);
  }, [valor]);
  return <span>{moneda ? euros.format(visible) : entero.format(Math.round(visible))}</span>;
}

function Metrica({ titulo, valor, detalle, icono, principal = false, indice }) {
  return <article className={`metric-card reveal ${principal ? 'featured' : ''}`} style={{ '--delay': `${indice * 90}ms` }}>
    <div className="metric-top"><span>{titulo}</span><span className="icon-box"><Icono nombre={icono}/></span></div>
    <strong className="metric-value"><Contador valor={valor} moneda={principal}/></strong>
    <div className="metric-bottom"><span className="mini-dot"/>{detalle}</div>
    {principal && <div className="card-orbit" aria-hidden="true"/>}
  </article>;
}

export default function Dashboard({ resumen, calidad, ventas }) {
  const [tema, setTema] = useState('light');
  const [tipo, setTipo] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('ingresos');
  const [diaActivo, setDiaActivo] = useState(null);
  useEffect(() => {
    try { const guardado = localStorage.getItem('vista-tema'); if (guardado === 'dark') setTema('dark'); } catch {}
  }, []);
  function cambiarTema() {
    const nuevo = tema === 'light' ? 'dark' : 'light';
    setTema(nuevo);
    try { localStorage.setItem('vista-tema', nuevo); } catch {}
  }
  const categorias = useMemo(() => [...resumen.ingresos_por_categoria].sort(orden === 'nombre' ? (a, b) => a.categoria.localeCompare(b.categoria, 'es') : (a, b) => b.ingresos - a.ingresos), [resumen, orden]);
  const dias = useMemo(() => {
    const agrupados = new Map();
    for (let cursor = new Date(`${resumen.periodo.desde}T12:00:00Z`); cursor.toISOString().slice(0, 10) <= resumen.periodo.hasta; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      agrupados.set(cursor.toISOString().slice(0, 10), { ingresos: 0, operaciones: 0 });
    }
    for (const venta of ventas) {
      const grupo = agrupados.get(venta.fecha);
      if (grupo) { grupo.ingresos += venta.ingreso; grupo.operaciones += 1; }
    }
    return [...agrupados].map(([dia, valores]) => ({ dia, ...valores }));
  }, [ventas, resumen]);
  const excluidos = useMemo(() => [...calidad.duplicados.map(fila => ({ ...fila, tipo: 'Duplicado' })), ...calidad.incidencias.map(fila => ({ ...fila, tipo: 'Incidencia' }))].sort((a, b) => a.fila_csv - b.fila_csv), [calidad]);
  const filtrados = excluidos.filter(fila => (tipo === 'Todos' || fila.tipo === tipo) && `${fila.venta_id} ${fila.motivo} ${fila.fila_csv}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  const maxCategoria = Math.max(1, ...categorias.map(fila => fila.ingresos));
  const maxDia = Math.max(1, ...dias.map(dia => dia.ingresos));
  const lider = resumen.ingresos_por_categoria.reduce((mejor, fila) => !mejor || fila.ingresos > mejor.ingresos ? fila : mejor, null);
  const proporcion = calidad.filas_entrada ? calidad.operaciones_validas / calidad.filas_entrada * 100 : 0;
  const destacado = dias[diaActivo ?? 0];
  const generado = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(resumen.generado_en));

  return <div className="dashboard" data-theme={tema}>
    <div className="ambient ambient-one" aria-hidden="true"/><div className="ambient ambient-two" aria-hidden="true"/>
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark"><Icono nombre="chart"/></span>vista<span className="brand-divider"/><span className="brand-caption">Sales analytics</span></a>
      <nav aria-label="Navegación principal"><a href="#resumen" className="nav-active">Resumen</a><a href="#auditoria">Auditoría</a></nav>
      <div className="header-actions"><span className="verified"><span className="status-dot"/>Datos verificados</span><button className="icon-button" onClick={cambiarTema} aria-label={tema === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}><Icono nombre={tema === 'light' ? 'moon' : 'sun'}/></button><span className="avatar" aria-label="Proyecto de Javier">JV</span></div>
    </header>
    <main id="inicio">
      <section className="hero reveal"><div><p className="eyebrow"><span className="purple-dot"/>TU NEGOCIO, EN PERSPECTIVA</p><h1>Cifras claras.<br/><span>Mejores decisiones.</span></h1><p className="hero-description">Una semana de ventas. Cada operación validada.<br className="desktop-break"/> Descubre qué categorías generan más ingresos.</p></div>
        <div className="hero-actions"><span className="period-pill"><Icono nombre="calendar"/>{fecha(resumen.periodo.desde)} — {fecha(resumen.periodo.hasta)}</span><button className="primary-button" onClick={() => window.print()}><Icono nombre="download" size={17}/>Exportar informe</button><small>Actualizado {generado} · Madrid</small></div>
      </section>
      <section className="metric-grid" id="resumen" aria-label="Indicadores principales">
        <Metrica titulo="Ingresos totales" valor={resumen.ingresos_totales} detalle="EUR · Precio histórico de cada venta" icono="chart" principal indice={0}/>
        <Metrica titulo="Operaciones válidas" valor={resumen.operaciones_validas} detalle="Ventas únicas, sin duplicados" icono="sales" indice={1}/>
        <Metrica titulo="Unidades vendidas" valor={resumen.unidades_totales} detalle="Solo operaciones validadas" icono="box" indice={2}/>
      </section>
      <div className="analysis-grid">
        <section className="panel category-panel reveal" style={{ '--delay': '180ms' }}><div className="panel-heading"><div><p className="eyebrow">EL REPARTO DE LA SEMANA</p><h2>Ingresos por categoría</h2></div><label className="sort-label"><span className="sr-only">Ordenar categorías</span><select value={orden} onChange={e => setOrden(e.target.value)}><option value="ingresos">Mayor ingreso</option><option value="nombre">Nombre A–Z</option></select></label></div>
          <div className="category-chart">{categorias.map((fila, index) => {
            const colorIndex = resumen.ingresos_por_categoria.findIndex(c => c.categoria === fila.categoria);
            return <div className="category-row" key={fila.categoria} style={{ '--bar-color': colores[colorIndex % colores.length], '--delay': `${300 + index * 100}ms` }}><div className="category-label"><span><span className="category-dot"/>{fila.categoria}</span><strong>{euros.format(fila.ingresos)} <small>{porcentaje(resumen.ingresos_totales ? fila.ingresos / resumen.ingresos_totales * 100 : 0)}</small></strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${fila.ingresos / maxCategoria * 100}%` }}/></div></div>;
          })}</div>
          {lider && <div className="insight"><span className="insight-icon"><Icono nombre="arrow"/></span><p><strong>{lider.categoria} lidera la semana.</strong> Representa el {porcentaje(resumen.ingresos_totales ? lider.ingresos / resumen.ingresos_totales * 100 : 0)} de los ingresos validados.</p></div>}
          <p className="chart-note">Barras con base cero y escala común para comparar categorías.</p>
        </section>
        <section className="panel quality-panel reveal" style={{ '--delay': '260ms' }}><div className="panel-heading"><div><p className="eyebrow">PRIMERO, LA CALIDAD</p><h2>Datos en los que confiar</h2></div><span className="shield"><Icono nombre="check" size={23}/></span></div>
          <div className="quality-overview"><div className="quality-ring" style={{ '--angle': `${proporcion * 3.6}deg` }}><div><strong>{porcentaje(proporcion)}</strong><span>filas válidas</span></div></div><p><strong>{calidad.operaciones_validas} de {calidad.filas_entrada}</strong><span>filas listas para analizar.<br/>Cada exclusión tiene un motivo.</span></p></div>
          <dl className="quality-list"><div><dt><i className="dot green"/>Operaciones válidas</dt><dd>{calidad.operaciones_validas}</dd></div><div><dt><i className="dot amber"/>Copias excluidas</dt><dd>{calidad.copias_duplicadas_excluidas}</dd></div><div><dt><i className="dot rose"/>Incidencias excluidas</dt><dd>{calidad.incidencias_excluidas}</dd></div></dl>
          <div className="balance"><Icono nombre="check" size={17}/><span>Balance correcto <strong>{calidad.filas_entrada} = {calidad.operaciones_validas} + {calidad.copias_duplicadas_excluidas} + {calidad.incidencias_excluidas}</strong></span></div>
        </section>
      </div>
      <section className="panel daily-panel reveal" style={{ '--delay': '340ms' }}><div className="panel-heading"><div><p className="eyebrow">EL RITMO DE LAS VENTAS</p><h2>Ingresos día a día</h2></div><p className="daily-detail" aria-live="polite">{destacado ? <><strong>{euros.format(destacado.ingresos)}</strong><span>{fecha(destacado.dia)} · {destacado.operaciones} operaciones</span></> : 'Sin ventas'}</p></div>
        <div className="daily-chart" aria-label="Ingresos por día">{dias.map((dia, index) => <button key={dia.dia} className={`day-column ${diaActivo === index ? 'selected' : ''}`} onMouseEnter={() => setDiaActivo(index)} onFocus={() => setDiaActivo(index)} onClick={() => setDiaActivo(index)} aria-label={`${fecha(dia.dia)}: ${euros.format(dia.ingresos)}, ${dia.operaciones} operaciones`} aria-pressed={diaActivo === index}><span className="day-value">{euros.format(dia.ingresos)}</span><span className="day-track"><span className="day-fill" style={{ height: `${dia.ingresos / maxDia * 100}%`, '--delay': `${400 + index * 60}ms` }}/></span><span className="day-label">{new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${dia.dia}T12:00:00Z`))}</span></button>)}</div><p className="chart-note">Selecciona un día para consultar su ingreso y sus operaciones. Valores en EUR.</p>
      </section>
      <section className="panel audit-panel reveal" id="auditoria"><div className="panel-heading"><div><p className="eyebrow">NINGUNA FILA SE PIERDE</p><h2>La auditoría, al detalle <span className="count-pill">{excluidos.length}</span></h2></div><a className="download-link" href="/datos/calidad.json" download><Icono nombre="download" size={17}/>Descargar JSON</a></div>
        <div className="table-toolbar"><div className="filter-tabs" role="group" aria-label="Filtrar registros excluidos">{['Todos', 'Duplicado', 'Incidencia'].map(opcion => <button key={opcion} aria-pressed={tipo === opcion} className={tipo === opcion ? 'active' : ''} onClick={() => setTipo(opcion)}>{opcion === 'Duplicado' ? 'Duplicados' : opcion === 'Incidencia' ? 'Incidencias' : opcion}</button>)}</div><label className="search-field"><Icono nombre="search" size={17}/><span className="sr-only">Buscar por ID, fila o motivo</span><input type="search" placeholder="Buscar operación o motivo…" value={busqueda} onChange={e => setBusqueda(e.target.value)}/></label></div>
        <div className="table-scroll"><table><caption className="sr-only">Registros excluidos y su ubicación en el CSV; la cabecera es la fila 1</caption><thead><tr><th>Operación</th><th>Fila CSV</th><th>Tipo de exclusión</th><th>Motivo</th></tr></thead><tbody>{filtrados.map(fila => <tr key={fila.fila_csv}><td className="sale-id">{fila.venta_id || '(vacío)'}</td><td><span className="row-number">{fila.fila_csv}</span></td><td><span className={`badge ${fila.tipo === 'Duplicado' ? 'duplicate' : 'issue'}`}><i/>{fila.tipo}</span></td><td>{fila.motivo}{fila.fila_original && <small className="original-row">Primera aparición: fila {fila.fila_original}</small>}</td></tr>)}{!filtrados.length && <tr><td colSpan={4} className="empty-state">No hay registros que coincidan. Prueba otro filtro o búsqueda.</td></tr>}</tbody></table></div><div className="table-foot" role="status">Mostrando {filtrados.length} de {excluidos.length} registros excluidos<span>La fila 1 del CSV es la cabecera</span></div>
      </section>
      <footer><span><span className="footer-brand">vista</span> Práctica 5074 · Datos sintéticos</span><div><a href="/datos/resumen.json" download>Resumen JSON <Icono nombre="arrow" size={13}/></a><a href="/datos/ventas_enriquecidas.json" download>Ventas validadas <Icono nombre="arrow" size={13}/></a></div><span>Procesamiento por lotes · Sin actualización en directo</span></footer>
    </main>
  </div>;
}
