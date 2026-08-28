"use client";

import { useEffect, useState } from "react";
import { RgpdModal } from "./rgpd-modal";

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  const [necesitaRgpd, setNecesitaRgpd] = useState(false);

  useEffect(() => {
    fetch("/api/asistencia/kiosk/rgpd")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setNecesitaRgpd(!d.informado); })
      .catch(() => {});
  }, []);

  async function aceptarRgpd() {
    await fetch("/api/asistencia/kiosk/rgpd", { method: "POST" });
    setNecesitaRgpd(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <RgpdModal open={necesitaRgpd} onAceptar={aceptarRgpd} />
      {children}
    </div>
  );
}
