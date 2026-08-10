import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

/**
 * Equivalente a las pantallas de "Acceso restringido"/"Sin acceso" que
 * doGet() (Code.js) devuelve como HTML plano cuando no hay sesión o el
 * dominio no es @kelatos.com. Aquí NextAuth ya filtra el dominio en el
 * callback signIn (src/auth.ts) — si Google rechaza el login por
 * dominio, NextAuth redirige aquí con ?error=AccessDenied.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-background p-10 text-center shadow-sm">
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
          <>
            <div className="mb-4 text-4xl">🔒</div>
            <h2 className="mb-2 text-xl font-semibold">Acceso restringido</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Esta herramienta es solo para uso interno de Kelatos. Necesitas iniciar sesión con
              tu cuenta de Google.
            </p>
          </>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button type="submit" className="w-full">
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
