# Todas las Reparaciones (pantalla principal)

Pantalla `/reparaciones` (Reparaciones > Todas las Reparaciones). Es el **dashboard del taller**: tarjetas de resumen arriba y la tabla de todas las reparaciones debajo.

## Tarjetas de resumen (filtran la tabla al pulsarlas)
Por estado: Formulario pendiente, Presupuesto pendiente, Presupuesto enviado, Presupuesto aceptado, Pieza pendiente, Pieza entregada, En reparación, Listos para entrega, Sin reparación, Presupuesto rechazado, Abandonado. Además hay tarjetas de **Garantía**, **Cintas en reparación**, **Mensajería activa** y alertas de **Presupuesto retrasado** (más de 24 horas sin presupuesto desde la recepción) y **Entrega retrasada** (equipos que superan los días prometidos, contados en días laborables).

## Botones de la cabecera
- **Nueva Reparación**: abre el formulario de recepción (nº de resguardo automático, fecha, cliente, teléfono, email, modelo/marca, síntoma, responsable, diagnóstico, piezas, días estimados de entrega, si deja el cargador, forma de pago...).
- **Factura Manual**: crea una factura sin reparación (serie 1 de cobros o serie 3 rectificativa), con estado Cobrada o Pendiente, cliente y líneas.
- **Ticket Manual**: ticket sin reparación; un ticket con importe negativo (anulación) exige un motivo.
- **Formularios Rechazados**: lista de solicitudes de recepción por formulario web que se rechazaron.
- **Transferencias**: enlace a la vista de cobros por transferencia (Reparaciones > Transferencias).
- **Actualizar datos** y filtros por fecha (**Desde / Hasta**, sobre la fecha de recepción) con **Hoy** y **Limpiar**.
- Buscador: por cliente, teléfono, resguardo, equipo...

## Columnas de la tabla
Resguardo, Fecha Recepción, Cliente, Equipo, Estado, **Pago** (indica si hay comprobante de transferencia), Técnico, Días, F. Entrega, Observaciones y Acciones.

## Acciones de cada fila
- **Ver**: abre el **detalle** de la reparación.
- **Confirmar / Rechazar**: para solicitudes en estado **Formulario Pendiente** (el rechazo pide motivo).
- **Copiar email** del cliente.
- **Eliminar**: solo para **superadmin**.

## Detalle de una reparación (ventana lateral)
Cabecera con el **estado actual** y la tarjeta de **acción requerida** (ver la guía de estados y flujo). Pestañas: **Información** (datos del cliente y del equipo, editables mientras no esté entregada y facturada), **Observaciones** (se pueden añadir notas) e **Historial** (registro de cambios). Botones de **estado actual**: marcar garantía, marcar revisión, estados especiales, comprobante de transferencia y **Casillero** (ubicación física del equipo en el local). También: **Imprimir resguardo**, **Imprimir etiqueta** (etiqueta con código de barras para pegar en el equipo; necesita el puente de impresión del PC), firma de recogida y fotos, presupuestos de la reparación y pedidos de pieza.
