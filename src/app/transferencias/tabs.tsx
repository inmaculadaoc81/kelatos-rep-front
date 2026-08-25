"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { href: "/transferencias", label: "Transferencias" },
  { href: "/transferencias/devoluciones", label: "Devoluciones" },
];

export function TransferenciasTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {PESTANAS.map((p) => {
        const activo = pathname === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              activo ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
