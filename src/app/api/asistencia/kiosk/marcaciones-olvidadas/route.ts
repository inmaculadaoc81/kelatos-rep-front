import { kioskGet, kioskPost } from "@/lib/asistencia-proxy";

export async function GET() {
  return kioskGet("marcaciones-olvidadas");
}

export async function POST(req: Request) {
  return kioskPost("marcaciones-olvidadas", await req.json());
}
