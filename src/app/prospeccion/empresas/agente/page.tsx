import { AgenteVista } from "@/components/prospeccion/agente-vista";
import { BusquedaDiariaPanel } from "@/components/prospeccion/busqueda-diaria-panel";

export default function Pagina() {
  return <div className="space-y-6"><BusquedaDiariaPanel /><AgenteVista segmento="empresas" /></div>;
}
