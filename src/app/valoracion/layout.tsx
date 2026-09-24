import type { Metadata } from "next";

// Página pública y de un solo uso: sin indexar y sin enviar el referer.
export const metadata: Metadata = {
  title: "Tu opinión — Kelatos",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function ValoracionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">{children}</div>;
}
