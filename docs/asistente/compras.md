# Compras (Stock > Compras)

La vista **Compras** es una sola tabla con **todos los pedidos de piezas**: los de las reparaciones (pedidos registrados desde "Registrar Pedido de Pieza" en cada reparación) y los de **Ventas** (pedido de una pieza a un cliente sin reparación). Cada fila indica a qué cliente y equipo pertenece. Al pulsar una fila se abre el detalle de la reparación o de la venta.

## Estados de un pedido
**Pendiente → Pedido → En Tránsito → Recibido**, y también **Cancelado**. Las tarjetas de arriba cuentan cada estado y sirven de filtro: Todos, Pendiente, Pedido, En Tránsito, Recibido, Cancelado, **Con problema** y **Retrasados** (los que deberían haber llegado ya, por la fecha estimada, y siguen sin recibirse).

## Columnas
Pedido, Cliente / Equipo, Proveedor, Descripción, Nº de pedido, Precio, Comprado por, Fecha pedido, Fecha estimada, Estado, **Estado plataforma**, Recepción, Enlace y Acciones.

- **Estado plataforma** es una anotación **manual** de lo que dice la página de seguimiento del proveedor o de la mensajería (no hay integración automática). Vacío significa "sin revisar".
- **Recepción** compara el estado interno con la plataforma: avisa cuando ambos coinciden, o cuando el pedido está marcado Recibido pero la plataforma no confirma la entrega (hay que revisarlo).

## Acciones de cada fila (pedidos de reparación)
- **Botón del siguiente estado**: avanza el pedido un paso (Pendiente → Pedido, Pedido → En Tránsito, En Tránsito → Recibido). **En la fila no hay botón de cancelar.**
- **Registrar factura**: aparece solo cuando el pedido está **Recibido**, tiene proveedor y todavía no tiene facturas; abre el registro de la factura en el Libro de Compras.
- **Facturas (n)**: aparece si el pedido ya tiene facturas del Libro de Compras enlazadas; las muestra.
- Las filas que vienen de **Ventas no tienen acciones** en esta tabla (aparece "—").

## Filtros
Búsqueda (pedido, resguardo, cliente, nº de pedido), proveedor, "comprado por", rango de fecha de pedido, y orden (más recientes, llegada más próxima, sin revisar). "Quitar filtros" los limpia.

## Subir pedido con IA
Botón de la cabecera. Permite subir **hasta 4 archivos** (capturas de pantalla o PDF) de un pedido hecho en la web de un proveedor; la IA lee las líneas y, tras pulsar **Analizar con IA**, el empleado **revisa cada línea** y pulsa **Registrar pedidos**. Cada línea se clasifica como pedido de **Tienda** (stock) o de **Cliente**. Para un pedido de cliente, el buscador busca por el nombre tanto en las **reparaciones abiertas** (pieza para una reparación, con su resguardo) como en las **ventas de piezas con alguna pieza todavía sin pedir**; si es una venta, se marcan las piezas de esa venta a las que corresponde el pedido y se registra en cada una (pasa a En Tránsito). El coste de las piezas de una venta ya está en la propia venta. Hay un botón de **historial** de lo registrado con esta función.
- **La cuenta compartida de empleados (soporte) no puede usar "Subir pedido con IA".**

## Cómo se crean los pedidos
No se crean escribiendo filas en esta tabla: se registran desde el detalle de una reparación ("Registrar Pedido de Pieza"), desde una venta, o con "Subir pedido con IA".
