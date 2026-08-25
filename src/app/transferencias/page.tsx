import { TablaMovimientos } from "./tabla-movimientos";

export default function TransferenciasPendientesPage() {
  return (
    <TablaMovimientos
      estado="Pendiente"
      titulo="Pendientes"
      subtitulo="Comprobantes registrados por el bot de Telegram, sin conciliar todavía."
    />
  );
}
