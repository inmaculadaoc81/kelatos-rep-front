import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/superadmin";
import { ArrowLeft2 } from "@/lib/icons";
import { TransferenciasTabs } from "./tabs";

// proxy.ts ya redirige a los no-superadmin, pero se repite aquí la
// comprobación (defensa en profundidad, mismo patrón que otras páginas
// sensibles) — esta vista queda deliberadamente FUERA de (app)/, sin el
// sidebar de Reparaciones: es un dashboard aparte, no una sección más.
export default async function TransferenciasLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!esSuperadmin(session?.user?.email)) redirect("/");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 bg-primary px-4 shadow-sm">
        <Image src="/logos/kelatos.png" alt="Kelatos" width={120} height={34} priority unoptimized className="h-7 w-auto brightness-0 invert" />
        <span className="text-sm font-semibold text-primary-foreground">Dashboard Transferencias</span>
        <div className="ml-auto">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground">
            <ArrowLeft2 className="size-4" /> Volver a Reparaciones
          </Link>
        </div>
      </header>
      <div className="border-b bg-card px-4">
        <TransferenciasTabs />
      </div>
      <main className="p-6">{children}</main>
    </div>
  );
}
