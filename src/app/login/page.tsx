import Image from "next/image";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

function IconoGoogle() {
  return (
    <svg className="size-4.5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18A13.86 13.86 0 0 1 10.95 24c0-1.45.25-2.86.74-4.18v-5.7H4.34A21.93 21.93 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

/**
 * Equivalente a las pantallas de "Acceso restringido"/"Sin acceso" que
 * doGet() (Code.js) devuelve como HTML plano cuando no hay sesión o el
 * dominio no es @kelatos.com. Aquí NextAuth ya filtra el dominio en el
 * callback signIn (src/auth.ts) — si Google rechaza el login por
 * dominio, NextAuth redirige aquí con ?error=AccessDenied.
 *
 * Solo Google está conectado (src/auth.ts no tiene proveedor de
 * credenciales) — no hay usuarios/contraseñas en el sistema todavía.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-10 text-center shadow-sm">
        <div className="mb-8 flex justify-center">
          <div className="rounded-md bg-white px-3 py-2">
            <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-9 w-auto" />
          </div>
        </div>

        {error ? (
          <>
            <div className="mb-4 text-4xl">⛔</div>
            <h2 className="mb-2 text-xl font-semibold">Sin acceso</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Tu cuenta no tiene acceso a esta herramienta. Usa tu cuenta{" "}
              <strong>@kelatos.com</strong>.
            </p>
          </>
        ) : (
          <h2 className="mb-6 text-xl font-semibold">Iniciar sesión</h2>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button type="submit" variant="outline" className="w-full gap-2.5">
            <IconoGoogle />
            Continuar con Google
          </Button>
        </form>
      </div>
    </div>
  );
}
