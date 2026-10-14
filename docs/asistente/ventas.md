# Ventas (Catálogos > Ventas)

Pedidos de **venta de piezas a clientes sin reparación**. Cada venta tiene piezas (con coste, precio, proveedor y nº de pedido) y avanza por estados.

## Tabla
Columnas: ID, Fecha, Cliente, Nº Items, Nº Pedido, Total, **Ganancia**, Estado, Factura, Observaciones y Acciones. Filtro por estado: **Pieza Pendiente, En Tránsito, Pieza Recibida, Entregado, Cancelado**. Buscador por cliente o ID.

## Acciones
- **Nuevo pedido** (de piezas): cliente (nombre obligatorio, email válido), piezas (descripción y precio) y documento: **Generar Ticket**, **Generar Factura** o **Registrar Garantía**; se puede **enviar al cliente** por email.
- **Ver** el detalle: piezas con su estado, y acciones **Registrar pedido** (al proveedor), **Marcar Recibido**, **Marcar Entregada** (con **QR de entrega** para que el cliente confirme), **Agregar Pieza**, **Editar**, **Cancelar Venta**.
- **Editar cabecera** (cliente, teléfono, email, estado, estado de pago, observaciones).
- **Eliminar**: solo para **superadmin**.
- Las piezas pedidas a proveedor de una venta aparecen también en **Stock > Compras** (sin acciones en esa tabla).
