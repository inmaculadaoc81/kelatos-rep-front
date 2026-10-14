# Stock: Productos e Inventario y Stock de Piezas

Hay **dos catálogos distintos**:
- **Productos e Inventario** (Control de Stock): productos de venta.
- **Stock de Piezas**: catálogo de **piezas de repuesto** para reparaciones (cargadores, pantallas, etc.).

## Productos e Inventario (Stock > Productos e Inventario)
Pantalla "Control de Stock" con dos vistas: **Productos** y **Movimientos** de inventario.
- Columnas de productos: Producto, Referencia, Categoría, Stock, P. Compra, P. Venta, Proveedor, Ubicación y Acciones.
- **Nuevo Producto**: nombre (obligatorio), referencia, categoría, unidad, stock inicial, proveedor, ubicación y notas. **Editar** un producto.
- **Movimientos** (botón "Mov." en cada producto): registra una **Entrada**, **Salida** o **Ajuste** (en el ajuste se indica el nuevo stock total; en entrada y salida la cantidad, proveedor/cliente, nº de documento y notas). Cada movimiento guarda stock anterior, stock resultante y quién lo registró. La cantidad no puede ser 0.
- **La cuenta compartida de empleados (soporte) solo puede consultar**: no ve los botones de crear ni editar productos.

## Stock de Piezas (Stock > Stock de Piezas)
Catálogo de piezas con: Referencia, Nombre (comercial), Equivalente, Categoría, **Coste, Precio cliente, Mano de obra, Total cliente**, Stock (disponible y mínimo) y Proveedor. Buscador por referencia, nombre o proveedor, y filtro por categoría.
- **Nueva Pieza**: referencia (obligatoria), nombre comercial y/o **nombre interno del proveedor** (al menos uno), código de proveedor, **ID de pedido del proveedor** (código corto junto al nombre en su web), categoría, descripción, proveedor, stock, enlaces de compra y nombres alternativos.
- El **nombre interno del proveedor** y los códigos sirven para que "Subir pedido con IA" (en Compras) reconozca la pieza al leer un pedido; una pieza sin nombre interno no se puede reconocer por nombre.
- **Etiqueta**: imprime una etiqueta con código de barras para pegar (necesita el puente de impresión del PC).
- Dentro de la ficha de una pieza: **Registrar pedido** (cantidad y llegada aproximada), lista de **pedidos en camino** (marcar **Recibido**, que actualiza el stock, o cancelar), enlaces de compra, facturas del Libro de Compras enlazadas e **historial de cambios**.
- **Eliminar** y editar el catálogo completo: solo **superadmin**.
