# Dashboard de Transferencias (conciliación de transferencias y devoluciones)

Dashboard aparte (`/transferencias`) con dos vistas: **Movimientos** (conciliación) y **Devoluciones**. Acceso: superadmins y cuentas a las que se les ha concedido este módulo (la cuenta compartida de soporte lo tiene).

## Movimientos (conciliación)
Lista de **transferencias bancarias** detectadas a partir de **comprobantes** (capturas que llegan por el bot de Telegram o que se suben desde una reparación con el botón **Transferencia**). Cada movimiento tiene **Origen**: **Cliente** (el cliente paga a la empresa) o **Empresa** (la empresa paga a alguien).
- Columnas: ID, Fecha, Origen, Monto, Remitente, Beneficiario, Concepto, Banco, **Confianza** (qué tan segura fue la lectura automática del comprobante), Foto, Código, Par y Conciliado.
- Filtros: fechas, buscador (remitente, concepto, código, monto), origen, banco y remitente. Pestañas de **Pendientes** y **Conciliadas**.
- **Conciliar par**: se selecciona **exactamente un movimiento de Cliente y uno de Empresa** (los dos lados de la misma operación) y se concilian entre sí. **Devolver a pendientes** deshace una conciliación. **Ver comprobante** abre la foto.
- Los comprobantes subidos desde una reparación aparecen aquí con origen Cliente y su resguardo.

## Devoluciones
Control de **devoluciones de dinero por transferencia** a clientes.
- **Nueva devolución**: nombre del cliente, importe (mayor que 0), motivo (si es "otro", hay que especificarlo), número de cuenta (IBAN), nombre del beneficiario, banco, país de destino y notas.
- Columnas: ID, Fecha, Cliente, Importe, Motivo, Cuenta destino, Estado y Acciones. Estados: **Pendiente** y **Completada**.
- **Completar**: marca la devolución como completada y permite adjuntar el **comprobante de pago** y observaciones. **Revertir** la vuelve a pendiente; **Editar** y **Ver detalle**.
