# Práctica 5074: auditoría de ventas

Pregunta: ¿qué categorías generan más ingresos entre el 1 y el 7 de octubre de 2026? Ingreso significa unidades × precio histórico de cada venta, en EUR; no es beneficio.

## Ejecución

La aplicación está hecha con **React 19 y Next.js 16 (App Router)**. Requiere Node.js 20.9 o posterior. El script de procesamiento sigue usando solo módulos nativos de Node. Desde la raíz:

```text
npm.cmd install
npm.cmd run dev
```

Abre http://localhost:3000. `npm run dev` procesa las fuentes antes de arrancar Next.js. Para comprobar y ejecutar la versión de producción:

```text
npm.cmd test
npm.cmd run build
npm.cmd start
```

`npm run build` vuelve a generar los informes antes de compilar Next.js. En PowerShell se usa `npm.cmd` si la política de ejecución bloquea `npm.ps1`. En otros terminales basta `npm`.

Los archivos entregados originalmente permanecen intactos en la raíz, incluido el script inicial `procesar.mjs.js`. La implementación completa está en `scripts/procesar.mjs`; no se debe ejecutar el script inicial, cuya ubicación no corresponde a las rutas del enunciado. Se han copiado las fuentes, sin cambios, a `datos/`, que es la entrada del proceso.

## Campos e integración

Se utilizan venta_id, fecha, producto_id, unidades y precio_unitario de `datos/ventas.csv`. Mediante producto_id se obtiene nombre y categoria de `datos/productos.json`. El catálogo se valida antes de procesar: sus campos deben ser textos no vacíos y sus IDs únicos. Un catálogo ambiguo detiene la ejecución para evitar relaciones múltiples.

Se valida cada campo obligatorio antes de convertir números. La fecha debe tener formato YYYY-MM-DD, corresponder a un día real y estar dentro del periodo. Las unidades deben ser enteros positivos representables de forma segura; el precio, un decimal finito no negativo. Se admite precio cero. Un producto desconocido no se inventa.

Se identifica una copia exacta por el mismo venta_id y todos sus campos originales idénticos. Se conserva la primera aparición. IDs distintos nunca se deduplican por parecer ventas iguales. Antes de validar se examinan todas las versiones de cada ID: si difieren, todas las filas de ese ID quedan como incidencias para revisión, incluidas las copias. No hay conflictos de ID en la entrada proporcionada. Si se repite exactamente una fila inválida con ID, su primera aparición es incidencia y la posterior es copia, manteniendo la partición de filas.

## Resultados comprobados

| Indicador | Resultado |
| --- | ---: |
| Filas de ventas | 70 |
| Productos del catálogo | 8 |
| Operaciones válidas | 60 |
| Unidades | 150 |
| Ingresos EUR | 2343 |
| Copias excluidas | 5 |
| Incidencias excluidas | 5 |

| Categoría | Ingresos EUR |
| --- | ---: |
| Hogar | 1088 |
| Deporte | 875 |
| Tecnología | 308 |
| Papelería | 72 |

Hogar genera más ingresos en esta muestra sintética. La suma por categorías es 1088 + 875 + 308 + 72 = **2343 EUR**. El balance de filas es **70 = 60 + 5 + 5**.

Las copias excluidas son V003, V011, V021, V036 y V049 en las filas CSV 62–66. La cabecera es la fila 1.

| Operación | Fila CSV | Incidencia y tratamiento |
| --- | ---: | --- |
| V061 | 67 | Unidades vacías; excluida, sin convertir el vacío en cero |
| V062 | 68 | Precio vacío; excluida |
| V063 | 69 | P99 no existe en el catálogo; excluida |
| V064 | 70 | Unidades −2; excluida |
| V065 | 71 | Precio «gratis» no numérico; excluida |

## Contraste manual y pruebas

Se toma una sola copia de cada operación:

| Operación | Cálculo | Ingreso EUR |
| --- | --- | ---: |
| V001 | 1 × 5 | 5 |
| V002 | 2 × 2 | 4 |
| V003 | 3 × 12 | 36 |
| V004 | 4 × 25 | 100 |

Suma manual: 5 + 4 + 36 + 100 = **145 EUR**, igual a la suma del subconjunto del proceso.

Como contraste independiente del total, los 60 registros válidos contienen 7 ciclos completos de ocho productos y un último grupo de cuatro. Cada ciclo aporta 5 + 4 + 36 + 100 + 8 + 36 + 45 + 80 = 314 EUR y 20 unidades. Por tanto, 7 × 314 + 145 = **2343 EUR** y 7 × 20 + (1 + 2 + 3 + 4) = **150 unidades**. Hogar: 8 × (36 + 100) = 1088; Deporte: 7 × (45 + 80) = 875; Tecnología: 7 × (8 + 36) = 308; Papelería: 8 × (5 + 4) = 72.

`node --test` supera seis pruebas: resultados y filas concretas, dos ejecuciones completas con igualdad de resultados salvo fecha, conflictos con versiones anteriores, IDs distintos y precio cero, errores de campos/fechas/números/referencias y catálogo ambiguo/CSV mal formado. También comprueba que los JSON servidos son idénticos a los de salida.

`npm run build` compila correctamente la aplicación Next.js. `npm run test:ui` ejecuta Playwright sobre esa compilación en dos tamaños (escritorio y móvil), usando Microsoft Edge instalado. Comprueba métricas, filtros, búsqueda, ordenación, selección de días, persistencia del modo oscuro, descarga del resumen, ausencia de errores JavaScript y ausencia de desbordamiento de la página. Las dos pruebas han pasado. Para repetirlas, ejecutar primero `npm run build`; si Edge no está instalado, cambiar el canal en `playwright.config.mjs` por un navegador disponible.

Las capturas de la nueva aplicación local están en `evidencias/dashboard-desktop.png` y `evidencias/dashboard-mobile.png`. La captura del enlace público debe hacerse después de desplegar la nueva versión en Vercel.

No se ha realizado una revisión con un compañero ni se atribuye una revisión inexistente.

## Dashboard y actualización

`app/page.jsx` es la página de Next.js: lee los tres JSON de `salida/` durante la compilación y pasa los datos al componente React `app/components/Dashboard.jsx`. `app/layout.jsx` define el documento y sus metadatos; `app/globals.css` contiene el diseño adaptable. Las cards, gráficas, periodo, fecha, exclusiones y tabla proceden de esos JSON, sin resultados escritos a mano. Se usa Europe/Madrid para mostrar la fecha de generación. Las barras horizontales tienen base cero y escala compartida para comparar categorías.

La interfaz incluye contadores y barras animados, transiciones de entrada, modo claro/oscuro persistente, ordenación de categorías, ingresos por día seleccionables, búsqueda por ID/fila/motivo y filtros de duplicados e incidencias. Las animaciones respetan `prefers-reduced-motion`. La exportación abre la impresión del navegador, con estilos para guardar el informe en PDF. Las descargas JSON se sirven desde `public/datos/`, situado en la raíz de Next.js.

El procesamiento guarda por separado `salida/resumen.json`, `salida/calidad.json` y `salida/ventas_enriquecidas.json`. En la misma ejecución copia los tres a `public/datos/` y, por compatibilidad, al dashboard HTML anterior. El último listado permite rastrear cada ingreso hasta su ID y fila CSV. Los importes se redondean a dos decimales al agregar; en estas fuentes todos los ingresos son enteros.

Para incorporar nuevas ventas: actualizar las fuentes en `datos/`, ejecutar el procesamiento y las pruebas (adaptando los valores esperados si cambia la muestra), revisar incidencias y ejecutar `npm run build`. En desarrollo, reiniciar `npm run dev` para regenerar las fuentes y la página. En producción, subir los cambios a GitHub y desplegar de nuevo: la página se genera en la compilación, por lo que recargar sin recompilar no incorpora nuevas fuentes. No hay streaming ni ingesta continua. Las fechas fuera del 1–7 de octubre quedan excluidas mientras no se cambie explícitamente el periodo.

Para Vercel: dejar Root Directory en la raíz (`.`), seleccionar **Next.js** como framework y Build Command `npm run build`. Desactivar cualquier override anterior de Output Directory (`dist` o `dashboard/dist`): debe usarse el valor predeterminado de Next.js. `vercel.json` ya declara `framework: nextjs` y el comando de compilación. Tras subir los cambios y desplegar, comprobar `/` y `/datos/resumen.json` y capturar las cards, gráficas y balance. El enlace del proyecto es https://javier-rouge.vercel.app/; la nueva versión React requiere desplegar estos cambios.

`dashboard/` y `scripts/servir.mjs` conservan la versión HTML inicial como referencia; no son la aplicación Next.js ni deben seleccionarse como raíz en Vercel. La vista privada anterior de Sites conserva ese diseño inicial. El repositorio de entrega es https://github.com/paupa23/javier.

## Limitaciones y entrega

Fuentes sintéticas, pequeñas y en memoria. CSV restringido: coma como separador, sin comillas ni comas internas ni saltos dentro de campos. Un formato o cabecera incorrectos detienen la lectura. No hay impuestos, descuentos, costes, devoluciones ni datos personales. Para archivos grandes hay que medir memoria y considerar lectura por partes, persistencia y deduplicación entre lotes. JavaScript usa aritmética binaria; una contabilidad real con reglas complejas de decimales requeriría aritmética decimal explícita.

El documento `ENTREGA.md` contiene las respuestas del cierre y los elementos que deben adjuntarse en el Campus. La ampliación SQL es opcional y no se ha implementado.
