import { redirect } from "next/navigation";

/** /whatsapp abre directamente la bandeja de conversaciones. */
export default function WhatsappIndexPage() {
  redirect("/whatsapp/bandeja");
}
