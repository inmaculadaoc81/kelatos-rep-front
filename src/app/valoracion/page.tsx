"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { resolverDesafio } from "@/lib/pow";

/**
 * Entrada del enlace genérico (el mismo para todos los clientes): al abrirse
 * pide un código propio de un solo uso y redirige al formulario con él.
 */
export default function ValoracionEntrada() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [yaEnviada, setYaEnviada] = useState(false);
  const pedido = useRef(false);

  useEffect(() => {
    if (pedido.current) return;
    pedido.current = true;
    (async () => {
      try {
        // 1) el servidor da un desafío; 2) el navegador lo resuelve solo (fracción de
        // segundo); 3) con la solución se pide el código. Un bot tiene que gastar CPU
        // en cada petición.
        const r1 = await fetch("/api/valoracion/desafio", { cache: "no-store" });
        const d1 = await r1.json();
        if (!d1.ok) return setError(d1.error || "No se pudo preparar el formulario");
        const solucion = await resolverDesafio(d1.desafio, d1.bits);
        const r2 = await fetch("/api/valoracion/nuevo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ desafio: d1.desafio, solucion }),
        });
        const d = await r2.json();
        if (d.yaEnviada) setYaEnviada(true);
        else if (d.ok && typeof d.token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(d.token)) router.replace(`/valoracion/${d.token}`);
        else setError(d.error || "No se pudo preparar el formulario");
      } catch {
        setError("No se pudo preparar el formulario. Revisa tu conexión e inténtalo de nuevo.");
      }
    })();
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex justify-center">
        <div className="rounded-md bg-white px-3 py-2 shadow-sm">
          <Image src="/logos/kelatos.png" alt="Kelatos" width={290} height={82} priority unoptimized className="h-9 w-auto" />
        </div>
      </div>
      <div className="rounded-xl border bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {yaEnviada ? (
          <>
            <p className="text-lg font-semibold">Ya recibimos tu valoración</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Desde este dispositivo ya se envió el formulario. Gracias por tu tiempo.</p>
          </>
        ) : error ? (
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
