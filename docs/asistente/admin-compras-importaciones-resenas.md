# Libro de Compras, Importaciones / DUA y Reporte de reseñas (administradores)

## Libro de Compras (Contabilidad > Libro de Compras)
Registro de las **facturas recibidas** de proveedores.
- Columnas: Proveedor, Nº factura, Fecha, **Almacén** (Servicio o Stock), Base, Total, **Estado de pago** (Pendiente, Parcial, Pagada) y **Revisión**.
- **Nueva factura**: se puede registrar a mano o **importar automáticamente**: los PDF que caen en una carpeta de **Drive** se importan solos como compras de **Stock** o de **Servicio** (hay una carpeta para cada tipo). Una IA lee la factura (proveedor, líneas, importes) y empareja las líneas con piezas del stock.
- Los datos fiscales incompletos no bloquean el registro: la factura queda **pendiente de revisión** con el motivo. Hay filtro de "pendiente de revisión manual".
- Una factura se puede enlazar a **pedidos** (de Stock > Compras) y exportar el listado filtrado a **CSV**.

## Importaciones / DUA (Contabilidad > Importaciones / DUA)
Registro de **importaciones con DUA**: Registro, DUA/MRN, aceptación, exportador, **valor en aduana, derechos, IVA y total de tributos**, pago (pendiente o pagada) y revisión. **Nueva importación**, buscador (DUA, exportador, factura comercial) y filtro por pago. El DUA solo entra en contabilidad cuando está **pagado en aduana**.

## Reporte de reseñas (Informes > Reporte de reseñas)
Seguimiento de las **encuestas de satisfacción** que se envían a los clientes tras la reparación o el alquiler (por WhatsApp, una semana después aproximadamente). Muestra cliente, teléfono, servicio, resguardo, **resultado** y **destino** de la reseña, con botones **Marcar atendida / Reabrir**, y una lista de **próximos envíos** con los días que faltan.
