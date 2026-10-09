import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const raiz = new URL('../dashboard/dist/', import.meta.url);
const permitidos = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/estilos.css', ['estilos.css', 'text/css; charset=utf-8']],
  ...['resumen', 'calidad', 'ventas_enriquecidas'].map(nombre => [`/datos/${nombre}.json`, [`datos/${nombre}.json`, 'application/json; charset=utf-8']]),
]);
createServer(async (req, res) => {
  const archivo = permitidos.get(new URL(req.url, 'http://localhost').pathname);
  if (!archivo) { res.writeHead(404).end('No encontrado'); return; }
  try {
    const contenido = await readFile(new URL(archivo[0], raiz));
    res.writeHead(200, { 'Content-Type': archivo[1], 'Cache-Control': 'no-store' }).end(contenido);
  } catch { res.writeHead(500).end('Ejecuta primero npm run procesar'); }
}).listen(3000, '127.0.0.1', () => console.log('Dashboard: http://127.0.0.1:3000'));
