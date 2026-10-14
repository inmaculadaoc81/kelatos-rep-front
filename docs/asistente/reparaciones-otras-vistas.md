# Reparaciones: Historial, Transferencias (cobros), Presupuestos y Punto Limpio

## Historial (Reparaciones > Historial)
"Historial de Reparaciones": todas las reparaciones con su **estado de entrega**: **Entregado en local, Envío mensajería, Reciclaje** o Pendiente. Muestra la **factura** de cada una (el número, o "Pendiente" si debería tenerla; una reparación cobrada con **Ticket Rápido** muestra el número de ticket; las de No tiene reparación o Presupuesto rechazado pueden llevar la factura del **envío por mensajería**; una de garantía no factura).
- Buscador (resguardo, cliente, equipo...) y filtros por estado de entrega y por factura (con / sin).
- Pulsar una fila abre el detalle de la reparación.

## Equipos entregados (Reparaciones > Equipos entregados)
Vista de los **equipos que ya salieron del taller**, por **fecha de entrega** (no de recepción): los **entregados en local** y los **enviados por mensajería** (los de reciclaje no cuentan). La ven **administradores, superadmins y la cuenta de empleados (soporte)**; el resto de cuentas no la tienen.
- **Calendario mensual** (como Facturación del día): cada día muestra cuántos equipos salieron (y cuántos en local y por mensajería); al pulsar un día se ve el detalle de ese día. Navegación por mes y año y botón Hoy.
- **Lista por fechas**: rango Desde/Hasta con atajos (**Hoy, Ayer, 7 días, Este mes, Todo**), filtro por tipo de entrega (En local / Mensajería) y buscador (resguardo, cliente, equipo, técnico, factura).
- **Indicadores (KPIs)**: Entregados, En local, Por mensajería y **Reparados sin factura/ticket** (solo reparaciones en estado Reparado que no son de garantía y no tienen factura ni ticket). Resumen del mes del calendario, o del rango filtrado en la lista.
- Cada fila muestra fecha y hora de entrega, resguardo, cliente, equipo, técnico, tipo, estado, factura o ticket; al pulsarla se abre el detalle de la reparación.

## Transferencias (Reparaciones > Transferencias)
Vista de **cobros de las reparaciones**: lista día a día de cada factura o ticket con su **forma de pago y estado** (Pendiente o Cobrado).
- **Regla del estado**: cualquier forma de pago que **no** sea transferencia (efectivo, tarjeta, Bizum...) se considera **Cobrado** en el acto. Una **transferencia** solo está **Cobrado** si hay un comprobante **conciliado** con el banco para ese resguardo; si no, **Pendiente**. Hay una fila por cada documento de cobro generado (factura o ticket general, de revisión, de anticipo o de mensajería); las rectificativas y corregidas no cuentan como cobros nuevos.
- El comprobante se sube a nivel de **resguardo** (botón **Transferencia** en el detalle), no de documento: si un resguardo tuviera dos cobros por transferencia, comparten el mismo estado de conciliación.
- Columnas: Día, Resguardo, Detalle, Documento, Importe, Forma de pago y Estado.
- Filtros: Desde/Hasta, buscador (resguardo, cliente, equipo, nº de documento), forma de pago y estado.
- No confundir con el **dashboard de Transferencias bancarias** (conciliación de comprobantes con el banco), que es una vista aparte.

## Presupuestos (Reparaciones > Presupuestos)
"Presupuestos Enviados": lista de **todos los presupuestos enviados** a clientes y qué pasó con cada uno.
- Estados: **Enviado, Aceptado, Rechazado, Sin respuesta, Anulado, Borrador**, con motivo y fecha de la respuesta.
- Filtros de columna estilo Excel, enlace al **PDF** de cada presupuesto y botón Actualizar.
- Los presupuestos se **crean y gestionan dentro de cada reparación** (botón "Gestionar Presupuestos"): se elaboran uno o varios (responsable, fecha, días de reparación, mano de obra, piezas en stock o por pedido, diagnóstico), se guardan como borrador y se **envían al cliente por email o WhatsApp**. Se pueden **aceptar, rechazar o anular** (rechazar y anular piden motivo).

## Punto Limpio (Reparaciones > Punto Limpio)
Equipos con estado de entrega **Reciclaje**: los que se derivan a reciclaje o se aprovechan. Columnas: Resguardo, Fecha, Cliente, Equipo, Presupuesto enviado, Concepto, **Motivo** y **Destino**.
- **Definir/Editar motivo**: qué pasa con el equipo (**puede ser reparable, reciclaje interno, ya no está en la tienda — se llevó a punto limpio, otro**) y qué se hará con él (**poner en venta, pasar a alquiler, uso interno**).
- Desde ahí se puede **crear un producto de venta** o un **equipo de alquiler** a partir del equipo, y agregar **piezas aprovechadas**.
