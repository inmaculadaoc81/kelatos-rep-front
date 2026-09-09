import { Badge } from "@/components/ui/badge";

/** Badge de shadcn con color pastel a medida (fondo claro + texto oscuro),
    mismo patrón visual que asistencia/pills.tsx — evita reinventar el
    componente de badge en cada tabla de Webs Kelatos. */
export function PillBadge({
  children,
  bg,
  color,
  className,
}: {
  children: React.ReactNode;
  bg: string;
  color: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={className} style={{ backgroundColor: bg, color, borderColor: "transparent" }}>
      {children}
    </Badge>
  );
}
