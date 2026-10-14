# Facturación: Facturas de Clientes, Seguimiento de Facturas y Reporte de Facturas

(Las vistas **Efectivo** y **Facturación del día (TPV)** tienen su propia guía.)

## Facturas de Clientes (Facturación > Facturas de Clientes)
Lista única de **todas las facturas y tickets emitidos**. Reúne tres orígenes: **reparaciones**, **alquileres** y **facturas manuales** (y ventas). Una misma reparación puede tener varios documentos: factura de reparación, de **revisión pagada**, de **mensajería**, de **anticipo**, **rectificativas** y **corregidas**. Una factura de alquiler puede tener inicial, rectificativa, corregida y de recogida.
- **Series de numeración**: **Serie 1 — Cobros** (facturas), **Serie 3 — Rectificativas** y **Serie 4 — Tickets**. Hay también filtro de Alquiler.
- Filtros: buscador (nombre, email o DNI/NIE/CIF), serie/tipo y estado, y **filtros de columna estilo Excel**.
- Pulsar una factura abre su **detalle**: ver PDF y enviarlo por email, **Marcar como Cobrada** (si está Pendiente), crear **Devolución / Rectificativa**, y enlaces para **ver la reparación, el alquiler o la venta** de origen.
- **Corregir forma de pago** de una factura: elegir la nueva forma de pago (y el banco si es tarjeta/transferencia).
- Un número de factura puede aparecer **sustituido** si se hizo después un ciclo de rectificativa y corregida: el número existe, pero su importe solo consta en el PDF.
- **Eliminar** una factura de alquiler o manual: solo **superadmin**.
- La numeración fiscal es irreversible: un número consumido no se reutiliza.

## Seguimiento de Facturas (Facturación > Seguimiento de Facturas)
**No es facturación a clientes**: es el control de las **facturas de compra a plataformas y proveedores** (eBay, AliExpress, etc.) para saber si ya se tiene la factura de cada pedido.
- Columnas: Fecha, Plataforma, Proveedor, Nº Pedido, Modelo, Importe, Nº Factura, Estado y Acciones.
- Estados: **Pendiente, OK, No Disponible**.
- **Nueva Entrada** (plataforma o proveedor obligatorio), **Editar** y **Eliminar**; filtro por estado.

## Reporte de Facturas (Facturación > Reporte de Facturas)
Informe de las facturas emitidas con **desglose de IVA** (serie, base imponible, IVA y total con IVA) para presentarlo.
- Filtros por fechas, series (1, 3 y 4), rango de números de documento y texto (nombre o NIF), más filtros de rango por columna.
- **Exportar** en **CSV, XLSX o PDF**.
- **Historial**: cada exportación CSV queda registrada (quién, cuándo, con qué filtros, cuántas facturas y qué total).
