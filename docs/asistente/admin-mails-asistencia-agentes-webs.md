# Otros dashboards (administradores): Gestión MAILS, Asistencia, Agentes IA y Webs Kelatos

El menú del perfil permite cambiar entre dashboards según la cuenta: Reparaciones (el principal), Transferencias, Asistencia, Agentes, Webs Kelatos, Tareas y Gestión MAILS.

## Gestión MAILS (`/mails`)
Gestión de **buzones de correo** (IMAP/SMTP) y bandeja unificada.
- **Centro de mails**: bandeja con carpetas Todos, Entrada, Destacados, Enviados, Archivo, Rebotes y Papelera; conversaciones agrupadas por hilo, búsqueda en el cuerpo, y acciones locales (leído, destacar, archivar, papelera) que **no tocan el servidor de correo**. Cada correo se vincula al **cliente** por su dirección.
- **Buzones** (solo superadmin): alta, edición, prueba y sincronización (solo lectura, cada 2 minutos). Las contraseñas se guardan cifradas.
- Envío con adjuntos desde un buzón (hasta 20 destinatarios; límite horario por buzón); se guarda el cuerpo completo de los correos.
- **Leads** (importar CSV, estados Pendiente / Enviado / Follow up / Respondió / No contactar / Inválido), **Direcciones inválidas** (rebotes permanentes) y **Tipos de correo**.
- La cuenta compartida de empleados solo ve el **Centro de mails**.

## Asistencia (`/asistencia`)
Fichajes de los empleados. Los empleados fichan en el **kiosco**: iniciar jornada, pausar, salida/vuelta de comida, finalizar jornada, **reuniones** (el tiempo inactivo durante una reunión no cuenta) y **solicitudes** (vacaciones, corrección de un fichaje, "olvidé fichar", ausencia), y pueden exportar el PDF de su mes.
- **Panel de administración**: horarios, informe mensual (PDF por empleados y fechas), informes diarios, auditoría de cambios en fichajes y **Teletrabajo (Remote Workers)**: dispositivos y agentes de los empleados remotos, categorías de aplicaciones (productivas o no), y reportes diario, semanal, de analítica, alertas, línea de tiempo y aplicaciones. Los dispositivos nuevos aparecen "sin asignar" hasta que un administrador los asocia a un empleado.
- También incluye una sección de **Contenido** (calendario de piezas de contenido para redes sociales).

## Agentes IA (`/agentes`)
Agentes de IA de captación: se lanzan **runs** (por ejemplo buscar empresas de un sector y ubicación con un límite) y **campañas**; cada run muestra estado, coste y tokens.

## Webs Kelatos (`/webs-kelatos`)
Gestión de las **webs de la empresa**: sus productos y los catálogos de servicios (crear, editar, enlazar servicios a una web, abrir la web).
