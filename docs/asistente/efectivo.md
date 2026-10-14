# Efectivo (Facturación > Efectivo)

La vista **Efectivo** es el **libro de caja de efectivo** del local: una lista de movimientos con un **saldo acumulado**. No es una pantalla "solo para ajustes manuales": la mayor parte de lo que aparece son cobros que el sistema ya conoce.

## Qué movimientos aparecen
- **Cobro** (suma): cualquier factura, ticket, alquiler, venta de piezas, factura manual o ticket manual que esté **Cobrado con forma de pago Efectivo**. Se calculan solos desde Facturación; **no se escriben a mano en esta pantalla**. En una factura **Multiforma** solo cuenta la parte pagada en efectivo.
- **Devolución** (resta): la rectificativa de un documento que se pagó en efectivo. También cuenta como devolución una factura manual con líneas en negativo.
- **Retirada** (resta): salida de efectivo de la caja (por ejemplo ingreso en el banco o pago a un proveedor). Se registra a mano.
- **Faltante** (resta): dinero que falta al contar la caja. Se registra a mano ("Dinero faltante").
- **Conteo** (no mueve dinero): comparación entre el efectivo contado y el saldo que calcula el sistema en ese momento. Guarda la diferencia como constancia, pero **no suma ni resta del saldo**.
- **Ingreso manual** (suma, como un cobro más): efectivo que ya había en caja y se anotó a mano. Existe en los datos, pero **esta pantalla no tiene botón para crearlo**.

## Saldo y fechas
El saldo es **acumulado**, no por día. La caja cuenta desde el **21/09/2026**; lo anterior no entra salvo que se elija **"Todo el historial"** en el botón de alcance. Se puede filtrar por tipo de movimiento (cobros, devoluciones, retiradas, faltantes, conteos), por origen, concepto y por periodo.

## Botones (solo superadmin)
- **Contar efectivo**: pide el efectivo contado, fecha y hora y una nota opcional (ej. "Cierre de caja"). Registra el conteo y la diferencia con el sistema.
- **Retirar efectivo**: pide importe, fecha y hora y motivo. Muestra el saldo actual. Si el importe es mayor que el saldo, pide confirmación (**"Retirar igualmente"**).
- **Dinero faltante**: pide el importe que falta, fecha y hora y una nota (ej. "Diferencia al contar la caja").
- **Anular** (en cada movimiento manual): anula una retirada, faltante o conteo; el **motivo es obligatorio**. Una retirada anulada deja de restar del saldo.
- "Actualizar" recarga la lista.

## Quién puede qué
- **Solo los superadmins** pueden registrar retiradas, faltantes y conteos, y anular movimientos. El servidor también lo exige.
- Otras cuentas con acceso a la vista (por ejemplo la cuenta de empleados) **solo pueden consultarla**: no ven los botones de registrar ni de anular.

## Columnas
Hora, Movimiento, Origen (Reparación, Alquiler, Venta de piezas, Factura manual, Ticket manual), Concepto, Resguardo/Referencia, Nº de documento, Cliente, Importe y Saldo.

## Otras pantallas relacionadas
- **Facturación del día (TPV)**: parte diario por método de pago para cuadrar contra el sistema. No sustituye a esta vista.
- **Contabilidad > Efectivo y caja** (solo administradores; la cuenta de empleados la tiene en solo lectura): clasifica cada retirada o ingreso con su destino contable.
