// Registro del contexto de cada fichaje (control horario): dispositivo y ubicación aproximada.
// La ubicación solo se lee si la persona da permiso en el navegador; si lo deniega, el fichaje funciona igual y queda anotado que no se envió.

type Ubicacion = { lat?: number; lng?: number; precision?: number; ubicacion_estado: "ok" | "denegada" | "no_disponible" };

function leerUbicacion(): Promise<Ubicacion> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({ ubicacion_estado: "no_disponible" });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy, ubicacion_estado: "ok" }),
      (e) => resolve({ ubicacion_estado: e.code === 1 ? "denegada" : "no_disponible" }),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
    );
  });
}

/** Segundo plano: nunca bloquea ni hace fallar el fichaje. */
export function registrarContextoFichaje(accion: string): void {
  void (async () => {
    try {
      const ubic = await leerUbicacion();
      await fetch("/api/asistencia/kiosk/contexto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, user_agent: navigator.userAgent, plataforma: navigator.platform || "", ...ubic }),
      });
    } catch {
      /* sin efecto */
    }
  })();
}
