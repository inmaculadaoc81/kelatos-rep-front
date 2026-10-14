# Contabilidad (solo administradores)

Capa contable propia (esquema `contabilidad`) dentro del dashboard. Cada una de sus vistas tiene en pantalla una **caja de explicación (InfoVista)** de 2-3 frases con un ejemplo: es la fuente más fiable de qué hace cada una.

## Vistas del menú Contabilidad
Asientos, Libro Diario, Libro Mayor, Sumas y Saldos, Compras y pagos, Clientes y proveedores, Balance y resultados, Libro de IVA, Inmovilizado, Partidas pendientes, Cierre de ejercicio, **Efectivo y caja**, Plan contable, Reglas contables, Periodos y auditoría, **Libro de Compras** (facturas recibidas), **Importaciones / DUA** y "Arquitectura del módulo".

## Cómo se genera la contabilidad
- Los documentos del dashboard (facturas y tickets de reparaciones, ventas, alquileres, facturas recibidas, importaciones) se convierten en **asientos** mediante **reglas contables**. "Sincronizar operaciones" (en Asientos) lee esos documentos y genera asientos **en borrador**; después se revisan y **contabilizan**.
- La numeración de asientos es `AST-AAAA-NNNNNN`, **sin huecos** al contabilizar. Un asiento contabilizado **no se edita ni se borra**: se corrige con un **contra-asiento**. Hay **auditoría** de cada cambio y los periodos pueden cerrarse.
- Criterios fijos: el ejercicio empieza el 01/01/2026 con saldos de apertura; solo IVA 21 %; los **tickets (serie 4) van directos a caja o banco**; las piezas van a la cuenta 600 y el alquiler a la 752; los importes guardados en las reparaciones son la **base sin IVA**.
- Los cobros por transferencia, tarjeta virtual o efectivo que no traen banco quedan en la **cuenta 555 (partidas pendientes)** hasta asignarles un banco real con un asiento de reclasificación.
- **Efectivo y caja**: clasifica cada retirada o ingreso de efectivo por su destino contable (por ejemplo gasto, ingreso en banco). Las cuentas de empleados la ven solo en lectura.
- **Inmovilizado**: amortización lineal mensual, un borrador por mes ya terminado.
- **Informes**: Balance con clasificación PGC, pérdidas y ganancias, Libro de IVA por trimestre y antigüedad de clientes y proveedores.

## Lo que aún no soporta
Retención de IRPF, moneda extranjera, nóminas y seguridad social, y conciliación contra extractos bancarios.
