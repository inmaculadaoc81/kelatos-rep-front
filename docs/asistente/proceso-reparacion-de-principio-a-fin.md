# Proceso de una reparación, de principio a fin

Visión general de cómo se relacionan las pantallas. Cada paso tiene su propia guía.

1. **Entrada del equipo**
   - El cliente trae el equipo (o se recoge a domicilio: ver **Recogidas**) y se da de alta con **Nueva Reparación**, o rellena el **formulario web en la tablet** (queda en **Formulario Pendiente** hasta que el local lo confirme o rechace).
   - Se crea el **resguardo** (número correlativo), el cliente se registra o actualiza en **Clientes**, se imprime el resguardo y la **etiqueta** con código de barras, se anota el **casillero** donde se guarda el equipo, y el sistema envía al cliente el **resguardo de recepción** y el aviso **"Hemos recibido su equipo"** (estado **Presupuesto Pendiente**).
2. **Presupuesto**: en el plazo de 24 horas desde la recepción se elabora uno o varios presupuestos (con piezas de stock o por pedido), se **envían al cliente por email o WhatsApp** y la reparación pasa a **Presupuesto Enviado**. El cliente acepta o rechaza (**Presupuestos** muestra todos). Si rechaza: queda **Presupuesto Rechazado** (listo para entregar sin reparar).
3. **Piezas**: si el presupuesto aceptado lleva pieza por pedido, se **registra el pedido** al proveedor (**Pieza Pendiente**: Pedido → En Tránsito → Recibido). El pedido aparece en **Stock > Compras**. También se pueden usar piezas de **Stock de Piezas**. Con la pieza recibida, la reparación pasa a **Pieza Entregada**.
4. **Reparación**: se asigna técnico con **Iniciar reparación** (**En Reparación**) y se termina con **Finalizar reparación** (**Reparado**, o **No tiene Reparación** si no es posible; en ese caso puede quedar el equipo para **Punto Limpio**).
5. **Cobro**: con la reparación **Reparado** se genera la **factura** o un **Ticket Rápido** (alternativos). Los cobros aparecen en **Facturas de Clientes** (Serie 1 facturas, Serie 4 tickets), en **Reparaciones > Transferencias** (cobros con su forma de pago) y, si fueron en **efectivo**, en la vista **Efectivo**. El parte diario por método de pago se cuadra en **Facturación del día (TPV)**. Las transferencias se concilian con el banco en el **dashboard de Transferencias**.
6. **Entrega**: **Entregado en Local** (el cliente puede confirmar con el **QR de recogida**) o **Marcar como enviado** si se devuelve por mensajería. Cuando está entregada y facturada, la reparación queda cerrada. Aproximadamente **una semana después** se envía la **encuesta de satisfacción** por WhatsApp.
7. **Después**: **Historial** de reparaciones, **Reportes** (ganancia), **Registro de Acciones** (quién hizo qué) y **Centro de notificaciones** (qué correos se enviaron al cliente). La contabilidad se genera a partir de los documentos emitidos.

Los **alquileres** y las **ventas de piezas** siguen un recorrido parecido, con sus propias pantallas (**Equipos y Alquileres**, **Ventas**).
