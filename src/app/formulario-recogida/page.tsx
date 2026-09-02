"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FotoFormulario } from "@/lib/formulario-cliente";
import { resolverBlobImagen, comprimirImagen } from "@/lib/foto-captura";

type Seccion = "cargando" | "error" | "yaEntregado" | "formulario" | "exito";

interface DatosRecogida {
  resguardo: string;
  equipo: string;
  nombre: string;
  estadoEntrega: string;
}

function FormularioRecogidaInterno() {
  const params = useSearchParams();
  const resguardo = params.get("resguardo") || "";
  const token = params.get("token") || "";

  const [seccion, setSeccion] = useState<Seccion>("cargando");
  const [datos, setDatos] = useState<DatosRecogida | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [yaEstabaEntregado, setYaEstabaEntregado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const hayFirmaRef = useRef(false);

  // Fotos del equipo al recogerlo — opcionales, petición del usuario,
  // 2026-09-02: sirven de constancia del estado del equipo en el momento
  // de la entrega. Mismo procesado (compresión + HEIC) que el formulario
  // de recepción (formulario/page.tsx), vía lib/foto-captura.ts.
  const [fotos, setFotos] = useState<FotoFormulario[]>([]);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");
  const fotoInputRef = useRef<HTMLInputElement>(null);

  async function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []).filter(
      (file) => !fotos.some((f) => f.name === file.name && f.size === file.size)
    );
    e.target.value = "";
    if (archivos.length === 0) return;

    setErrorFoto("");
    setProcesandoFoto(true);
    try {
      const nuevas: FotoFormulario[] = [];
      for (const file of archivos) {
        try {
          const blob = await resolverBlobImagen(file);
          const { base64, mime } = await comprimirImagen(blob);
          nuevas.push({ base64, mime, name: file.name, size: file.size });
        } catch {
          setErrorFoto(`No se pudo procesar "${file.name}" — prueba con otra foto.`);
        }
      }
      if (nuevas.length > 0) setFotos((prev) => [...prev, ...nuevas]);
    } finally {
      setProcesandoFoto(false);
    }
  }

  function eliminarFoto(i: number) {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  useEffect(() => {
    if (!resguardo || !token) {
      setError("Enlace inválido: falta el resguardo o el token.");
      setSeccion("error");
      return;
    }
    fetch(`/api/formulario-recogida?resguardo=${encodeURIComponent(resguardo)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setError(data.error || "No se encontró la reparación.");
          setSeccion("error");
          return;
        }
        if (data.estadoEntrega === "ENTREGADO" || data.estadoEntrega === "ENVIO") {
          setSeccion("yaEntregado");
          return;
        }
        setDatos(data);
        setNombre(data.nombre || "");
        setSeccion("formulario");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error desconocido");
        setSeccion("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seccion !== "formulario") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement?.clientWidth || 340;
    const cssH = 180;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [seccion]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    dibujandoRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const p = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  }
  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!dibujandoRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = getPos(e);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    hayFirmaRef.current = true;
  }
  function stopDraw() {
    dibujandoRef.current = false;
  }
  function limpiarFirma() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hayFirmaRef.current = false;
  }

  async function enviarFirma() {
    if (!nombre.trim()) return setError("Por favor, indique su nombre.");
    if (!hayFirmaRef.current) return setError("Por favor, realice su firma en el recuadro.");
    setError("");
    setEnviando(true);
    try {
      const dataUrl = canvasRef.current?.toDataURL("image/png") || "";
      const firmaBase64 = dataUrl.split(",")[1] || "";
      const res = await fetch("/api/formulario-recogida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resguardo, token, nombre, firmaBase64, fotos }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo registrar la recogida.");
      setYaEstabaEntregado(!!data.yaEntregado);
      setSeccion("exito");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={estilos.body}>
      <div style={estilos.card}>
        {seccion === "cargando" && (
          <div style={estilos.centrado}>
            <div style={estilos.spinner} />
            <p style={{ color: "#6b7280" }}>Cargando datos de la reparación…</p>
          </div>
        )}

        {seccion === "error" && (
          <div style={estilos.centrado}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <p style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {seccion === "yaEntregado" && (
          <div style={estilos.centrado}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>✅</div>
            <div style={estilos.tituloExito}>Equipo ya entregado</div>
            <p style={{ color: "#6b7280", fontSize: ".9rem" }}>
              Este equipo ya fue recogido previamente. No es necesaria ninguna acción adicional.
            </p>
          </div>
        )}

        {seccion === "formulario" && datos && (
          <>
            <h1 style={estilos.h1}>Confirmar recogida</h1>
            <p style={estilos.subtitle}>
              Si ya ha recogido su equipo, confirme sus datos y firme a continuación para que quede registrado en nuestro sistema.
            </p>

            <div style={estilos.infoRow}>
              <strong style={{ color: "#1768ea" }}>Resguardo:</strong> {datos.resguardo}
              <br />
              <strong style={{ color: "#1768ea" }}>Equipo:</strong> {datos.equipo || "(sin modelo)"}
            </div>

            <label style={estilos.label}>Nombre del titular</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              style={estilos.input}
            />

            <label style={estilos.label}>
              Fotos del equipo <span style={{ color: "#6b7280", fontWeight: "normal" }}>(opcional)</span>
            </label>
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              disabled={procesandoFoto}
              style={estilos.btnFoto}
            >
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onSeleccionarFotos}
                style={{ display: "none" }}
                disabled={procesandoFoto}
              />
              {procesandoFoto
                ? "Procesando foto…"
                : fotos.length === 0
                  ? "Toca para hacer o seleccionar una foto"
                  : `${fotos.length} foto${fotos.length !== 1 ? "s" : ""} seleccionada${fotos.length !== 1 ? "s" : ""}`}
            </button>
            {errorFoto && <p style={{ color: "#dc2626", fontSize: ".8rem", marginTop: 6 }}>{errorFoto}</p>}
            {fotos.length > 0 && (
              <div style={estilos.fotosGrid}>
                {fotos.map((f, i) => (
                  <div key={f.name + f.size} style={estilos.fotoThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:${f.mime};base64,${f.base64}`} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => eliminarFoto(i)} style={estilos.fotoEliminar} title="Eliminar">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label style={{ ...estilos.label, marginTop: 20 }}>
              Firma <span style={{ color: "#6b7280", fontWeight: "normal" }}>(dibuje con el dedo o el ratón)</span>
            </label>
            <div style={estilos.sigWrap}>
              <canvas
                ref={canvasRef}
                style={{ display: "block", touchAction: "none" }}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startDraw(e);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  moveDraw(e);
                }}
                onTouchEnd={stopDraw}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button onClick={limpiarFirma} style={estilos.btnClear}>
                Borrar firma
              </button>
            </div>

            <button onClick={enviarFirma} disabled={enviando} style={estilos.btnSubmit}>
              {enviando ? "Enviando…" : "Confirmar recogida"}
            </button>
            {error && <p style={{ color: "#dc2626", fontSize: ".85rem", marginTop: 12 }}>{error}</p>}
          </>
        )}

        {seccion === "exito" && (
          <div style={estilos.centrado}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>✅</div>
            <div style={estilos.tituloExito}>{yaEstabaEntregado ? "Firma registrada" : "Recogida confirmada"}</div>
            <p style={{ color: "#6b7280", fontSize: ".9rem" }}>
              Gracias, <strong>{nombre}</strong>.<br />
              {yaEstabaEntregado
                ? "Su firma ha quedado registrada. El equipo ya constaba como entregado en nuestro sistema."
                : "Su firma ha sido registrada correctamente."}
              <br />
              ¡Hasta pronto!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  body: { fontFamily: "var(--font-sans), Arial, Helvetica, sans-serif", background: "#f4f6fb", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "20px 16px" },
  card: { background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,.10)", padding: "32px 28px", width: "100%", maxWidth: 480, height: "fit-content" },
  centrado: { textAlign: "center", padding: "40px 0" },
  spinner: { width: 40, height: 40, border: "4px solid #e5e7eb", borderTopColor: "#1768ea", borderRadius: "50%", margin: "0 auto 16px", animation: "spin .8s linear infinite" },
  tituloExito: { fontSize: "1.3rem", fontWeight: "bold", color: "#15803d", marginBottom: 8 },
  h1: { fontSize: "1.25rem", color: "#1a1a2e", marginBottom: 4 },
  subtitle: { fontSize: ".9rem", color: "#6b7280", marginBottom: 20 },
  infoRow: { background: "#f0f7ff", borderRadius: 8, padding: "14px 16px", marginBottom: 20, fontSize: ".9rem", lineHeight: 1.7 },
  label: { display: "block", fontSize: ".85rem", fontWeight: "bold", color: "#374151", marginBottom: 6 },
  input: { width: "100%", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "10px 14px", fontSize: "1rem", marginBottom: 20, outline: "none" },
  sigWrap: { border: "2px dashed #d1d5db", borderRadius: 8, background: "#fafafa", marginBottom: 8, cursor: "crosshair", overflow: "hidden" },
  btnFoto: {
    width: "100%", border: "2px dashed #d1d5db", borderRadius: 8, background: "#fafafa",
    padding: "18px 12px", textAlign: "center", fontSize: ".9rem", color: "#6b7280", cursor: "pointer",
  },
  fotosGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 10 },
  fotoThumb: { position: "relative", aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb" },
  fotoEliminar: {
    position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
    background: "rgba(0,0,0,.6)", color: "#fff", border: "none", lineHeight: 1, cursor: "pointer", fontSize: "1rem",
  },
  btnClear: { background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 14px", fontSize: ".8rem", color: "#6b7280", cursor: "pointer" },
  btnSubmit: { width: "100%", background: "#1768ea", color: "#fff", border: "none", borderRadius: 8, padding: 14, fontSize: "1rem", fontWeight: "bold", cursor: "pointer" },
};

export default function FormularioRecogidaPage() {
  return (
    <Suspense fallback={<div style={estilos.body}>Cargando…</div>}>
      <FormularioRecogidaInterno />
    </Suspense>
  );
}
