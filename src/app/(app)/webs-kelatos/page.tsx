import { Global, ExportSquare } from "@/lib/icons";

interface WebKelatos {
  nombre: string;
  url: string;
  descripcion: string;
}

// Lista de enlaces — petición del usuario, 2026-09-09: acceso rápido a las
// webs del negocio desde el propio dashboard. Se añade solo lo confirmado
// hasta ahora; el resto de enlaces (WordPress, redes sociales, etc.) se
// van sumando aquí a medida que el usuario los indique.
const WEBS: WebKelatos[] = [
  {
    nombre: "Dashboard Kelatos",
    url: "https://www.tecnicosordenador.es",
    descripcion: "Panel principal — reparaciones, ventas, facturación y equipos.",
  },
];

export default function WebsKelatosPage() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Global className="size-5" /> Webs Kelatos
        </h1>
        <p className="text-sm text-muted-foreground">Acceso rápido a las webs del negocio</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WEBS.map((web) => (
          <a
            key={web.url}
            href={web.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1.5 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{web.nombre}</span>
              <ExportSquare className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">{web.descripcion}</p>
            <p className="truncate text-xs text-emerald-700 dark:text-emerald-400">{web.url}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
