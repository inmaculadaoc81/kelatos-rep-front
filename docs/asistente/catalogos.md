# Catálogos: Clientes, Proveedores y Formulario Web

## Clientes (Catálogos > Clientes)
Directorio de clientes. Los clientes también se crean o actualizan automáticamente al dar de alta reparaciones, alquileres y ventas.
- **Nuevo cliente**: nombre (obligatorio), DNI/CIF, teléfono, email (se valida), dirección, CP, localidad, provincia y notas.
- Buscador por nombre, DNI, teléfono o email. **Editar** cada cliente.
- Enlace a **todos los correos enviados y recibidos con ese cliente** (solo para cuentas que ven Gestión MAILS).
- **Eliminar** un cliente: solo para **superadmin**.

## Proveedores (Catálogos > Proveedores)
Lista de proveedores con nombre/razón social, DNI/CIF, código interno, teléfono, email y estado.
- **Nuevo proveedor**: nombre (obligatorio), DNI/CIF, código interno, teléfono, email, dirección fiscal, país y notas. Los datos fiscales los exige el Libro de Compras (Facturas Recibidas).
- **Editar**, y **Desactivar / Activar** (un proveedor desactivado deja de ofrecerse, pero no se borra).
- Los proveedores se eligen en Compras, en los pedidos de pieza y al registrar facturas.

## Formulario Web (Catálogos > Formulario Web)
Pantalla que prepara el **formulario de recepción en la tablet** de la tienda: el cliente rellena sus datos y el equipo, y la solicitud llega al dashboard como reparación en **Formulario Pendiente**.
- Muestra la **URL del formulario para la tablet** (botones Copiar y Abrir) y un **código de acceso**: **Generar código / Nuevo código** crea uno nuevo (tiene caducidad). Sin el código vigente el formulario público no se puede enviar.
- Sección **"Fotos y firmas recibidas"**: buscador por resguardo, nombre o DNI/CIF; permite ver la firma y las fotos del cliente y **abrir la carpeta en Drive**.
