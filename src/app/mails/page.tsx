import { redirect } from "next/navigation";

/** /mails abre directamente la bandeja. */
export default function MailsIndexPage() {
  redirect("/mails/bandeja");
}
