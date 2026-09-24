"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * Entrada del enlace genérico (el mismo para todos los clientes): al abrirse
 * pide un código propio de un solo uso y redirige al formulario con él.
 */
export default function ValoracionEntrada() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);

  useEffect(() => {
    if (pedido.current) return;
    pedido.current = true;
    fetch("/api/valoracion/nuevo", { method: "POST", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && typeof d.token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(d.token)) router.replace(`/valoracion/${d.token}`);
        else setError(d.error || "No se pudo preparar el formulario");
      })
      .catch(() => setError("No se pudo preparar el formulario. Revisa tu conexión e inténtalo de nuevo."));
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex justify-center">
        <div className="rounded-md bg-white px-3 py-2 shadow-sm">
          <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-9 w-auto" />
        </div>
      </div>
      <div className="rounded-xl border bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error ? (
          <>
            <p className="text-base font-semibold">No se pudo abrir el formulario</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
              Reintentar
            </button>
          </>
        ) : (
          <p className="py-6 text-sm text-slate-500">Preparando tu formulario…</p>
        )}
      </div>
    </main>
  );
}
