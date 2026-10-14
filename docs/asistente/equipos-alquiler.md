# Equipos y Alquileres (Catálogos > Equipos y Alquileres)

Inventario de **portátiles de alquiler** y gestión de sus alquileres. Arriba hay contadores (Total, Disponibles, Alquilados, Mantenimiento) que filtran la tabla.

## Estados de un equipo
**Disponible, Alquilado, Mantenimiento, Fuera de servicio, Vendido.**

## Columnas
Equipo (marca, modelo y código EQ-xxxx), Serie, Estado, Cliente actual, Hasta (fecha de devolución prevista; avisa si ya pasó), **Tarifas** (€/día · €/semana · €/mes), **Venta** (precio de venta, si se ha definido; "-" si no) y Acciones.

## Acciones según el estado
- **Disponible**: **Alquilar** y **A mantenimiento**.
- **Alquilado**: **Ver detalle** del alquiler y **Devolver**.
- **Mantenimiento**: **Marcar disponible**.
- **Fuera de servicio**: **Reactivar**.
- Menú "Más acciones" (en equipos disponibles o en mantenimiento): **Marcar como vendido** y **Dar de baja**. Cada cambio de estado pide confirmación.
- Pulsar la fila abre la **ficha del equipo**.

## Nuevo equipo
Tipo (**normal** o **gamer**, que fija las tarifas y la fianza), marca, modelo, serie, sistema operativo, enlace del repuesto, imagen (URL obligatoria para el catálogo web), características, defectos conocidos, observaciones internas y **precio de venta opcional**. Con defectos u observaciones rellenados, el equipo queda deshabilitado en el catálogo web hasta resolverlos.
- Tarifas por defecto: normal 10 €/día, 50 €/semana, 150 €/mes, fianza 165,29 €; gamer 20 €/día, 80 €/semana, 240 €/mes, fianza 661,16 €.

## Ficha del equipo
Datos, tarifas (día, semana, mes), **precio de venta**, fianza y el historial de alquileres. **Solo un administrador puede cambiar tarifas, precio de venta y fianza**; los cambios solo afectan a alquileres nuevos (cada alquiler conserva sus precios).

## Alquilar (asistente de 2 pasos)
1. **Equipo y duración**: meses, semanas y días, fecha de inicio y fecha fin prevista.
2. **Facturación**: datos del cliente (nombre, teléfono, DNI/CIF y email obligatorios), nº de factura, estado de la factura (Cobrada o Pendiente) y su referencia. Termina con **Registrar y generar factura**. Admite varias formas de pago.

## Devolver
Pide la fecha real de devolución (posterior al inicio), el **estado del equipo al devolver** (Bien, Con daños menores, Roto o dañado grave), el email y el método de pago, y permite generar las facturas y rectificativas correspondientes o **confirmar la devolución sin factura** (exige motivo).
