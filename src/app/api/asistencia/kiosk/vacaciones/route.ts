import { kioskGet, kioskPost } from "@/lib/asistencia-proxy";

export async function GET() {
  return kioskGet("vacaciones");
}

export async function POST(req: Request) {
  return kioskPost("vacaciones", await req.json());
}
