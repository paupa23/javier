# Práctica 5074: auditoría de ventas

Pregunta: ¿qué categorías generan más ingresos entre el 1 y el 7 de octubre de 2026? Ingreso significa unidades × precio histórico de cada venta, en EUR; no es beneficio.

## Ejecución

Requiere Node.js, sin dependencias externas. Desde la raíz:

```text
node scripts/procesar.mjs
node --test
node scripts/servir.mjs
```

Abre http://127.0.0.1:3000. También existen los comandos `npm run procesar`, `npm test` y `npm start`. Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` o los comandos Node anteriores.

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

No se ha realizado una revisión con un compañero ni se atribuye una revisión inexistente. La captura y la revisión visual en navegador quedan pendientes si no hay navegador disponible.

## Dashboard y actualización

`dashboard/dist/index.html` carga `datos/resumen.json` y `datos/calidad.json` mediante fetch. Las cards, barras, periodo, fecha, exclusiones y tabla se construyen desde esos JSON. No contienen cifras de resultados escritas a mano. Se usa la zona Europe/Madrid para mostrar la fecha de generación. Las barras horizontales tienen base cero y escala compartida; permiten comparar importes y leer los nombres de las categorías.

El procesamiento guarda por separado `salida/resumen.json`, `salida/calidad.json` y `salida/ventas_enriquecidas.json`. En la misma ejecución copia los tres a `dashboard/dist/datos/`. El último listado permite rastrear cada ingreso hasta su ID y fila CSV. Los importes de resumen se redondean a dos decimales al agregar; en estas fuentes todos los ingresos son enteros.

Para incorporar nuevas ventas: actualizar las fuentes en `datos/`, ejecutar `node scripts/procesar.mjs`, ejecutar `node --test` adaptando los valores esperados si ha cambiado la muestra, revisar incidencias y publicar la carpeta actualizada. En local basta recargar el dashboard. En una publicación hay que desplegar de nuevo; no hay streaming ni ingesta continua. Las fechas fuera del 1–7 de octubre quedan excluidas mientras no se cambie explícitamente el periodo.

Para Vercel: importar el repositorio, dejar Root Directory en la raíz (`.`) y seleccionar «Other» como framework. El archivo `vercel.json` de la raíz configura el comando `node scripts/procesar.mjs` y la salida `dashboard/dist`. Así Vercel sirve el dashboard en `/` y el proceso accede directamente a `scripts/` y `datos/`. Tras subir la configuración a GitHub y desplegar, comprobar que el resumen servido en `/datos/resumen.json` coincide con `salida/resumen.json` y capturar la pantalla. La configuración `dashboard/vercel.json` solo se aplica si se elige `dashboard` como Root Directory; para esta publicación se utiliza la raíz.

Se ha publicado y confirmado una vista privada en Sites: https://auditoria-ventas-javier-5074.kromschroede-2653.chatgpt.site. El archivo `dashboard/.openai/hosting.json` conserva su identidad. El historial Git de `dashboard/` pertenece a esa publicación de Sites y solo contiene el dashboard; para la entrega de GitHub hay que incluir también las fuentes, el proceso, las salidas y la documentación de la raíz. No se ha verificado visualmente la publicación ni se ha generado una captura. La confirmación del despliegue y las comprobaciones HTTP locales son las evidencias disponibles.

## Limitaciones y entrega

Fuentes sintéticas, pequeñas y en memoria. CSV restringido: coma como separador, sin comillas ni comas internas ni saltos dentro de campos. Un formato o cabecera incorrectos detienen la lectura. No hay impuestos, descuentos, costes, devoluciones ni datos personales. Para archivos grandes hay que medir memoria y considerar lectura por partes, persistencia y deduplicación entre lotes. JavaScript usa aritmética binaria; una contabilidad real con reglas complejas de decimales requeriría aritmética decimal explícita.

El documento `ENTREGA.md` contiene las respuestas del cierre y los elementos que deben adjuntarse en el Campus. La ampliación SQL es opcional y no se ha implementado.
