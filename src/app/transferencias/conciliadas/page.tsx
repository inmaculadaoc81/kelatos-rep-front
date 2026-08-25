import { TablaMovimientos } from "../tabla-movimientos";

export default function TransferenciasConciliadasPage() {
  return (
    <TablaMovimientos
      estado="Conciliada"
      titulo="Conciliadas"
      subtitulo="Pares Cliente ↔ Empresa ya conciliados, automática o manualmente."
    />
  );
}
