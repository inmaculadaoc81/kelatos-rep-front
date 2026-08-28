import { kioskGet, kioskPost } from "@/lib/asistencia-proxy";

export async function GET() {
  return kioskGet("correcciones");
}

export async function POST(req: Request) {
  return kioskPost("correcciones", await req.json());
}
