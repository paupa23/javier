# Entrega: práctica 5074

Alumno: Javier (confirmar nombre y apellidos antes de entregar).

- Repositorio GitHub accesible al profesor: pendiente de publicar en la cuenta del alumno y pegar la URL.
- Dashboard público en Vercel: pendiente de conectar la cuenta y desplegar; instrucciones en README.md.
- Vista publicada en Sites (privada, acceso del propietario): https://auditoria-ventas-javier-5074.kromschroede-2653.chatgpt.site. Despliegue confirmado; esta vista no sustituye el enlace público de Vercel solicitado para la entrega.
- Resumen: `salida/resumen.json`.
- Calidad: `salida/calidad.json`.
- Trazabilidad adicional: `salida/ventas_enriquecidas.json`.
- Proceso: `scripts/procesar.mjs`.
- Dashboard: `dashboard/dist/`.
- Documentación y comprobaciones: `README.md`.
- Captura complementaria: pendiente de abrir el dashboard y capturar las cards, la gráfica y el balance.

## Respuestas individuales para revisar antes de entregar

**¿Qué incidencia encontraste y cómo la trataste?** V061, fila CSV 67, tiene las unidades vacías. Se registra como incidencia y se excluye del ingreso y de las unidades totales. No se convierte el vacío en cero. Otro ejemplo es V063, cuyo producto P99 no existe en el catálogo.

**¿Cómo sabes que dos filas son copias de una operación?** Comparten venta_id y coinciden exactamente en fecha, producto_id, unidades y precio_unitario. V003 aparece en las filas 4 y 62: se conserva la fila 4 y se excluye la 62. Si el ID cambia, no se trata como copia. Si un ID tiene valores contradictorios, se excluyen todas sus versiones para revisión.

**¿Cómo comprobaste el ingreso total?** Calculé V001–V004 a mano: 5 + 4 + 36 + 100 = 145 EUR y lo contrasté con el proceso. Para el total comprobé los siete ciclos completos y el último grupo: 7 × 314 + 145 = 2343 EUR. También sumé las categorías: 1088 + 875 + 308 + 72 = 2343 EUR. Dos ejecuciones generan las mismas métricas y recuentos, con distinta marca temporal.

**¿Cuándo aparecen nuevas ventas y qué pasos debes realizar?** Aparecen cuando actualizo las fuentes en datos/, ejecuto el script, reviso las salidas y publico una nueva versión. El script copia automáticamente los JSON a dashboard/dist/datos/. En local recargo la página; en Vercel vuelvo a desplegar y compruebo el resumen servido. Las ventas deben estar dentro del periodo definido para entrar en las métricas.

Estas respuestas se han preparado a partir de las comprobaciones ejecutadas; el alumno debe revisarlas y poder explicar las decisiones. No consta una revisión con un compañero.
