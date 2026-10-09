import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Dashboard from './components/Dashboard';

export const dynamic = 'force-static';

export default async function Page() {
  const [resumen, calidad, ventas] = await Promise.all(['resumen', 'calidad', 'ventas_enriquecidas'].map(async nombre =>
    JSON.parse(await readFile(join(process.cwd(), 'salida', `${nombre}.json`), 'utf8'))
  ));
  if (resumen.generado_en !== calidad.generado_en || !calidad.balance_correcto) {
    throw new Error('Los informes no corresponden a una ejecución validada');
  }
  return <Dashboard resumen={resumen} calidad={calidad} ventas={ventas} />;
}
