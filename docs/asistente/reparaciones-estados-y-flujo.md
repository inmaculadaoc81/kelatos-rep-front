# Reparaciones: estados y flujo de una reparación

Cada reparación (resguardo) tiene un **estado**. En el detalle, la tarjeta de **"Estado actual / Acción requerida"** indica qué toca hacer y ofrece los botones de ese paso. Estados y qué pide cada uno:

1. **Formulario Pendiente**: el cliente rellenó el formulario web de recepción y falta que el local lo **confirme o rechace** (el rechazo pide motivo). La tarjeta dice "Esperando confirmación del cliente".
2. **Presupuesto Pendiente**: equipo recibido. Hay que **elaborar uno o más presupuestos** (botón "Gestionar Presupuestos"). El límite indicado es de **24 horas desde la recepción**.
3. **Presupuesto Enviado**: presupuesto(s) enviados; se espera la respuesta del cliente. Botón "Ver Presupuestos".
4. **Presupuesto Aceptado**: el cliente aceptó. Lo siguiente depende:
   - Si el presupuesto **lleva pieza por pedido**: hay que **Registrar pedido de pieza** al proveedor.
   - Si **no requiere pieza**: se pulsa **Iniciar reparación** (el estado no salta solo).
   - Si es una **digitalización de cintas**: "Listo para Digitalizar" (se inicia cuando el técnico esté disponible).
   - Si el cliente se llevó el equipo y se registró un **anticipo**: aparece "Anticipo registrado — equipo con el cliente".
5. **Pieza Pendiente**: hay un pedido de pieza en curso. La tarjeta muestra si está **Pedido** ("esperando envío del proveedor") o **En Tránsito** ("esperando recepción"), con la fecha estimada. Botones: marcar En Tránsito, marcar como recibida, editar el pedido.
6. **Pieza Entregada**: la pieza llegó. Si el equipo está en el local: "Listo para reparar" (asignar técnico e **Iniciar reparación**). Si el cliente se llevó el equipo: hay que contactarlo para que lo traiga (**Marcar equipo recibido**).
7. **En Reparación**: el técnico trabaja. Botones: **Finalizar reparación**, **Pedir pieza adicional** y, si hay pieza, **Problema con pieza**.
8. **Reparado**: terminada. Pasa a "Listo para entrega".
9. **Presupuesto Rechazado** y **No tiene Reparación**: tampoco hay reparación; también quedan "Listo para entrega" (se devuelve el equipo sin reparar).
10. **Garantía**: equipo cubierto por garantía. Puede iniciarse la reparación directamente o elaborar presupuesto si finalmente no está cubierto.
11. **Abandonado**: el equipo lleva demasiado tiempo sin recoger. Se puede revertir desde "Estados especiales".

## Entrega (cuando está Listo para entrega)
- **Sin mensajería**: botón **Entregado en Local** y **Ver QR de recogida** (enlace/QR para que el cliente confirme la recogida).
- **Con mensajería** (el cliente pidió envío): **Marcar como enviado**, un atajo que no obliga a generar factura.
- Para cobrar: **Facturación** (factura) o **Ticket Rápido**. Son alternativas excluyentes para la misma reparación: en cuanto existe una, la otra se deshabilita. Solo se ofrecen en reparaciones **Reparado** que no son de garantía (y, si hay mensajería, también en No tiene reparación / Presupuesto rechazado / garantía, para cobrar el trayecto).
- Una reparación **entregada y facturada** queda cerrada: no se pueden editar los datos del cliente ni del equipo, ni el casillero, ni la entrega por mensajería.

## Estados especiales
- **Sin reparación por pieza**: se usa cuando no se encuentra la pieza; pide técnico responsable, fecha y motivo para el cliente.
- **Deshacer sin reparación** y **Revertir abandonado**: vuelven atrás esos estados.
- **Enviar a punto limpio**: el equipo se deriva a reciclaje.
- **Cliente se lleva el equipo (anticipo)**: en un presupuesto aceptado que requiere pieza, si el cliente se lleva el equipo mientras llega la pieza, se registra un **anticipo** (**factura de anticipo** o **ticket de anticipo**). Cuando la reparación esté lista, el cliente trae el equipo y se factura el resto.
- **Se llevó el equipo** (solo reparaciones de **cintas** en Presupuesto Aceptado): alternativa a "Iniciar Digitalización" cuando el cliente prefiere llevarse el equipo mientras espera turno. Marca el equipo como no presente en el local, sin tocar el presupuesto ni facturar.

## Colores de estado
Cada estado tiene su color en la tabla (por ejemplo Presupuesto Pendiente rosado, En Reparación ámbar, Reparado verde oscuro, Garantía gris oscuro).
