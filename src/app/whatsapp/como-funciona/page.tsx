const PREGUNTAS: { p: string; r: string }[] = [
  { p: "¿Esto sustituye a Chatwoot?", r: "No. Chatwoot, los bots y n8n siguen funcionando exactamente igual. Esta pantalla es otra ventana sobre las mismas conversaciones: lo que llega entra por Chatwoot y lo que escribas aquí sale por Chatwoot, así que se ve en los dos sitios." },
  { p: "¿Qué veo en «Conversaciones»?", r: "La bandeja de WhatsApp de Kelatos, con las más recientes primero. Puedes filtrar por Abiertas, Pendientes, Resueltas o Todas, buscar por nombre, teléfono o texto del mensaje, y cargar más conversaciones al final de la lista." },
  { p: "¿Cómo se relaciona con las reparaciones?", r: "Si el teléfono de la conversación coincide con el de un cliente, sale debajo del nombre su reparación (resguardo y estado). Al pulsarla se abre la reparación." },
  { p: "¿Puedo responder?", r: "Sí: escribe en el cuadro de abajo y pulsa Enviar (Enter envía, Mayús+Enter salta de línea). El mensaje es real y llega al cliente. Queda anotado en el historial interno con tu usuario." },
  { p: "¿Por qué a veces no me deja escribir?", r: "WhatsApp solo permite escribir libremente en las 24 horas siguientes al último mensaje del cliente. Pasado ese tiempo hace falta una plantilla aprobada por Meta; por ahora esas se envían desde Chatwoot." },
  { p: "¿Qué no hace todavía?", r: "Enviar imágenes o archivos, enviar plantillas, y cambiar el estado, la asignación o las etiquetas de la conversación. Para eso, usa Chatwoot (el enlace «Abrir en Chatwoot» está en cada conversación)." },
  { p: "¿Quién lo puede ver?", r: "Los administradores y las cuentas de acceso completo (por ejemplo, soporte), igual que Gestión MAILS." },
];

/** Explicación de la vista WhatsApp para el equipo. Página estática. */
export default function ComoFuncionaWhatsappPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Cómo funciona WhatsApp en el dashboard</h1>
        <p className="text-sm text-muted-foreground">Las conversaciones de WhatsApp de Kelatos, sin salir del dashboard.</p>
      </div>
      <div className="space-y-3">
        {PREGUNTAS.map((x) => (
          <div key={x.p} className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">{x.p}</p>
            <p className="mt-1 text-sm text-muted-foreground">{x.r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
