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
Botón de la cabecera. Permite subir **hasta 4 archivos** (capturas de pantalla o PDF) de un pedido hecho en la web de un proveedor; la IA lee las líneas y, tras pulsar **Analizar con IA**, el empleado **revisa cada línea** y pulsa **Registrar pedidos**. Cada línea se clasifica como pedido de **Tienda** (stock) o de **Cliente**. Para un pedido de cliente, el buscador busca por el nombre tanto en las **reparaciones abiertas** (pieza para una reparación, con su resguardo) como en las **ventas de piezas**, **aunque la venta esté cerrada y pagada**; si es una venta, se marcan las piezas de esa venta a las que corresponde el pedido (cada una muestra su estado) y se registra en cada una: si la pieza **ya estaba recibida y vendida**, el pedido solo se **vincula** a ella (nº de pedido, proveedor y enlace si se indica) sin cambiar su estado, coste ni precio; si aún no estaba recibida, pasa a En Tránsito. Si la pieza no existe en la venta, se puede **añadir como pieza nueva** indicando el precio de compra y el precio al cliente (cambia el total y la ganancia de la venta, no la factura ya emitida). Hay un botón de **historial** de lo registrado con esta función.

### Texto de cada imagen, o solo texto
Cada imagen o PDF tiene debajo un campo de **texto opcional propio**, y el texto de una imagen **solo se aplica a esa imagen** (se lee por separado de las demás). Las imágenes sin texto se leen juntas como partes del mismo pedido. El botón **Solo texto** añade un mensaje sin imagen (por ejemplo un aviso de recepción). Cada línea indica de qué imagen o texto sale. Reglas del texto: un número de **5 dígitos es un resguardo**; uno de **6 o más dígitos es un nº de pedido**; la palabra antes del número es el proveedor; "6 cargadores" es cantidad y pieza; y **"recibido", "recibida" o "llegó"** indican que la mercancía ya llegó. Ejemplos: `Asus 1184556 6 cargadores recibido`, `aliexpress 3076642294525134 llegó`, o una imagen con el texto `19304 recibida`.
- **Facturas y albaranes del proveedor:** si lo que se sube es una factura o un albarán (papel con PVP y precio unitario, o "cantidad enviada"), se entiende que la mercancía **ya llegó**: las líneas se proponen como **recibidas**. Hay una casilla **"La mercancía ya llegó al local"** que se puede marcar o quitar para todas las líneas. Al registrar, los pedidos de reparación y de venta se crean y pasan a **Recibido**, y el stock de tienda sube; no hace falta enlace ni fecha estimada. El coste de cada línea es el **precio unitario realmente pagado**.
- **Si dice recibido y existe el pedido** (se busca por nº de pedido y por resguardo en reparaciones, ventas y stock), la línea propone **marcar ese pedido como recibido** (se pueden marcar varios), sin crear nada nuevo, tras la confirmación del empleado.
- **Si dice recibido y es una línea de tienda sin pedido pendiente**, se registra el pedido y se marca recibido en el acto (el stock sube).
- **Si solo trae una referencia y no hay ningún pedido con ella**, no hay nada que marcar y la línea queda desmarcada.
- **La cuenta compartida de empleados (soporte) no puede usar "Subir pedido con IA".**

## Cómo se crean los pedidos
No se crean escribiendo filas en esta tabla: se registran desde el detalle de una reparación ("Registrar Pedido de Pieza"), desde una venta, o con "Subir pedido con IA".
