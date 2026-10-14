# Cuentas y permisos del dashboard

Quién puede ver o hacer qué depende de la cuenta (se decide en el menú y en el middleware `proxy.ts`):

- **Superadmin** (cuentas fijas en el código): todo, incluidos borrar registros, restaurar backups, y registrar/anular movimientos de Efectivo.
- **Administrador** (rol admin): Contabilidad (incluida Efectivo y caja, Libro de Compras e Importaciones), Reporte de reseñas, Configuración, Webs Kelatos, Agentes IA, Asistencia (panel), Gestión MAILS completa y Tareas.
- **Cuenta de empleados con acceso completo** (`accesoCompleto`, por ejemplo la cuenta compartida de soporte): ve Reparaciones, Catálogos, Stock, Compras, Facturación (con Efectivo y Facturación del día), Informes y, la cuenta de soporte, Transferencias; ve **Efectivo y caja** de Contabilidad **solo en lectura**; en Gestión MAILS solo el **Centro de mails**. **No** tiene Tareas, Contabilidad (salvo lo anterior), Agentes ni Webs. En Control de Stock puede consultar pero no crear ni editar productos, y no puede usar "Subir pedido con IA" en Compras.
- **Empleado que solo ficha** (kiosco de Asistencia): solo accede al kiosco de fichaje.
- Las cuentas fuera del dominio de la empresa no entran al dashboard.
