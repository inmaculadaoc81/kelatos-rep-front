import { kioskGet, kioskPost } from "@/lib/asistencia-proxy";

export async function GET() {
  return kioskGet("ausencias-parciales");
}

export async function POST(req: Request) {
  return kioskPost("ausencias-parciales", await req.json());
}
