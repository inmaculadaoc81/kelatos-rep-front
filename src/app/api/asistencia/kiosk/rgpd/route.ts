import { kioskGet, kioskPost } from "@/lib/asistencia-proxy";

export async function GET() {
  return kioskGet("rgpd-estado");
}

export async function POST() {
  return kioskPost("rgpd-informar", {});
}
