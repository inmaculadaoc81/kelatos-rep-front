"use client";

import { useEffect, useRef, useState } from "react";
import {
  DatosFormularioCliente,
  datosVacios,
  FotoFormulario,
  OPCIONES_TIPO_PRODUCTO,
  SiNo,
  SiNoAVeces,
} from "@/lib/formulario-cliente";
import { categoriaDeCondiciones, CONDICIONES_POR_CATEGORIA } from "@/lib/condiciones-legales";

const PASOS = ["Datos", "Contacto", "Equipo", "Síntoma", "Condiciones", "Foto y firma"];

function Pill({ activo, color, onClick, children }: { activo: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 8,
        border: activo ? `2px solid ${color}` : "1.5px solid #d1d5db",
        background: activo ? color + "1a" : "#fff",
        color: activo ? color : "#374151",
        fontWeight: activo ? 700 : 500,
        cursor: "pointer",
        fontSize: ".9rem",
      }}
    >
      {children}
    </button>
  );
}

function Campo({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: ".85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
      </label>
      {children}
      {error && <div style={{ color: "#dc2626", fontSize: ".78rem", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};

export default function FormularioClientePage() {
  // El código de acceso es solo una puerta de entrada (evita que alguien
  // ajeno a la tienda rellene el formulario sin más que la URL) — el
  // envío en sí ya es idempotente por requestId/UUID, así que el
  // visitaId no viaja en el payload, es puramente informativo para el
  // personal (ver formulario-web/page.tsx).
  const [accesoConcedido, setAccesoConcedido] = useState(false);

  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState<DatosFormularioCliente>(datosVacios());
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ resguardo: string } | null>(null);
  const [errorEnvio, setErrorEnvio] = useState("");

  if (!accesoConcedido) {
    return <PantallaCodigoAcceso onAcceso={() => setAccesoConcedido(true)} />;
  }

  function actualizar<K extends keyof DatosFormularioCliente>(campo: K, valor: DatosFormularioCliente[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  const esCintas = datos.tipoProducto === "Conversión de cintas";
  const esOtro = datos.tipoProducto === "Otro";
  const categoria = datos.tipoProducto ? categoriaDeCondiciones(datos.tipoProducto) : null;

  function validarPasoActual(): boolean {
    const err: Record<string, string> = {};
    if (paso === 1) {
      if (!datos.dniCif.trim()) err.dniCif = "Introduce tu DNI, NIF, Pasaporte o CIF.";
      if (!datos.nombre.trim()) err.nombre = "Introduce tu nombre o empresa.";
    }
    if (paso === 2) {
      if (!datos.telefono.trim()) err.telefono = "Introduce tu teléfono.";
      if (!datos.noTieneEmail) {
        if (!datos.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) err.email = "Email obligatorio o no válido.";
      }
      if (!datos.viaTipo) err.viaTipo = "Selecciona el tipo de vía.";
      if (!datos.viaNombre.trim()) err.viaNombre = "Introduce el nombre de la vía.";
      if (!datos.cp.trim()) err.cp = "Introduce el código postal.";
      if (!datos.localidad.trim()) err.localidad = "Introduce la localidad.";
      if (!datos.provincia.trim()) err.provincia = "Introduce la provincia.";
    }
    if (paso === 3) {
      if (!datos.tipoProducto) err.tipoProducto = "Selecciona el tipo de producto.";
      if (esOtro && !datos.tipoOtro.trim()) err.tipoOtro = "Describe el tipo de producto.";
      if (!esCintas) {
        if (!datos.marca.trim()) err.marca = "Indica la marca.";
        if (!datos.modelo.trim()) err.modelo = "Indica el modelo.";
      } else if (Object.values(datos.cintas).every((n) => n === 0)) {
        err.cintas = "Indica al menos una cinta.";
      }
    }
    if (paso === 4 && !esCintas) {
      if (!datos.sintoma.trim()) err.sintoma = "Describe la avería.";
      if (!datos.enciende) err.enciende = "Selecciona una opción.";
      if (!datos.golpe) err.golpe = "Selecciona una opción.";
      if (!datos.humedad) err.humedad = "Selecciona una opción.";
      if (!datos.reparacionAnterior) err.reparacionAnterior = "Selecciona una opción.";
    }
    if (paso === 5) {
      if (!datos.aceptaCondiciones) err.aceptaCondiciones = "Debes aceptar las condiciones del servicio.";
    }
    if (paso === 6) {
      if (datos.fotos.length === 0) err.fotos = "Debes adjuntar al menos una foto del equipo.";
      if (!datos.firmaBase64) err.firma = "Debes firmar el resguardo.";
    }
    setErrores(err);
    return Object.keys(err).length === 0;
  }

  function siguiente() {
    if (!validarPasoActual()) return;
    setPaso((p) => Math.min(p + 1, PASOS.length));
  }
  function anterior() {
    setErrores({});
    setPaso((p) => Math.max(p - 1, 1));
  }

  async function enviar() {
    if (!validarPasoActual()) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      const res = await fetch("/api/formulario-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo registrar la solicitud.");
      setResultado({ resguardo: data.resguardo });
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div style={estilos.page}>
        <div style={estilos.card}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#15803d", marginBottom: 8 }}>Solicitud registrada</h1>
            <p style={{ color: "#6b7280" }}>
              Nuestro equipo se pondrá en contacto contigo pronto.
              <br />
              <br />
              <strong style={{ color: "#1768ea" }}>Referencia: #{resultado.resguardo}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={estilos.page}>
      <div style={estilos.card}>
        <h1 style={{ fontSize: "1.25rem", color: "#1a1a2e", marginBottom: 4 }}>Solicitud de Reparación</h1>
        <p style={{ fontSize: ".9rem", color: "#6b7280", marginBottom: 20 }}>Rellena el formulario y te atendemos enseguida</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: ".72rem", color: "#6b7280" }}>
          {PASOS.map((p, i) => (
            <div key={p} style={{ textAlign: "center", flex: 1, fontWeight: i + 1 === paso ? 700 : 400, color: i + 1 === paso ? "#1768ea" : "#9ca3af" }}>
              {i + 1}. {p}
            </div>
          ))}
        </div>

        {paso === 1 && (
          <>
            <div style={estilos.notice}>📄 Estos datos son los que aparecerán en la factura</div>
            <Campo label="DNI / NIF / Pasaporte / CIF" required error={errores.dniCif}>
              <input style={inputStyle} value={datos.dniCif} onChange={(e) => actualizar("dniCif", e.target.value)} />
            </Campo>
            <Campo label="Nombre, apellidos o empresa" required error={errores.nombre}>
              <input style={inputStyle} value={datos.nombre} onChange={(e) => actualizar("nombre", e.target.value)} />
            </Campo>
          </>
        )}

        {paso === 2 && (
          <>
            <Campo label="Teléfono" required error={errores.telefono}>
              <div style={{ display: "flex", gap: 8 }}>
                <select style={{ ...inputStyle, width: 90 }} value={datos.telPrefijo} onChange={(e) => actualizar("telPrefijo", e.target.value)}>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                </select>
                <input style={inputStyle} value={datos.telefono} onChange={(e) => actualizar("telefono", e.target.value.replace(/[^\d]/g, ""))} />
              </div>
            </Campo>
            <Campo label="Email" required={!datos.noTieneEmail} error={errores.email}>
              <input style={{ ...inputStyle, marginBottom: 6 }} type="email" value={datos.email} disabled={datos.noTieneEmail} onChange={(e) => actualizar("email", e.target.value)} />
              <label style={{ fontSize: ".82rem", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={datos.noTieneEmail} onChange={(e) => actualizar("noTieneEmail", e.target.checked)} /> No tiene email
              </label>
            </Campo>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Campo label="Tipo de vía" required error={errores.viaTipo}>
                  <select style={inputStyle} value={datos.viaTipo} onChange={(e) => actualizar("viaTipo", e.target.value)}>
                    <option value="">— Tipo —</option>
                    {["Calle", "Avenida", "Plaza", "Paseo", "Carretera", "Camino", "Urbanización", "Otra"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Campo>
              </div>
              <div style={{ flex: 2 }}>
                <Campo label="Nombre de la vía" required error={errores.viaNombre}>
                  <input style={inputStyle} value={datos.viaNombre} onChange={(e) => actualizar("viaNombre", e.target.value)} />
                </Campo>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Campo label="Número / Piso (opcional)">
                  <input style={inputStyle} value={datos.viaNumero} onChange={(e) => actualizar("viaNumero", e.target.value)} />
                </Campo>
              </div>
              <div style={{ flex: 1 }}>
                <Campo label="Código postal" required error={errores.cp}>
                  <input style={inputStyle} value={datos.cp} onChange={(e) => actualizar("cp", e.target.value)} />
                </Campo>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Campo label="Localidad" required error={errores.localidad}>
                  <input style={inputStyle} value={datos.localidad} onChange={(e) => actualizar("localidad", e.target.value)} />
                </Campo>
              </div>
              <div style={{ flex: 1 }}>
                <Campo label="Provincia" required error={errores.provincia}>
                  <input style={inputStyle} value={datos.provincia} onChange={(e) => actualizar("provincia", e.target.value)} />
                </Campo>
              </div>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <Campo label="Tipo de producto" required error={errores.tipoProducto}>
              <select style={inputStyle} value={datos.tipoProducto} onChange={(e) => actualizar("tipoProducto", e.target.value)}>
                <option value="">Selecciona el tipo</option>
                {OPCIONES_TIPO_PRODUCTO.map((g) => (
                  <optgroup key={g.grupo} label={g.grupo}>
                    {g.opciones.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Campo>
            {esOtro && (
              <Campo label="Describe el tipo de producto" required error={errores.tipoOtro}>
                <input style={inputStyle} value={datos.tipoOtro} onChange={(e) => actualizar("tipoOtro", e.target.value)} />
              </Campo>
            )}
            {!esCintas && datos.tipoProducto && (
              <>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Campo label="Marca" required error={errores.marca}>
                      <input style={inputStyle} value={datos.marca} onChange={(e) => actualizar("marca", e.target.value)} />
                    </Campo>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Campo label="Modelo" required error={errores.modelo}>
                      <input style={inputStyle} value={datos.modelo} onChange={(e) => actualizar("modelo", e.target.value)} />
                    </Campo>
                  </div>
                </div>
                <Campo label="Número de serie (opcional — únicamente para portátiles)">
                  <input style={inputStyle} value={datos.serie} onChange={(e) => actualizar("serie", e.target.value)} />
                </Campo>
              </>
            )}
            {esCintas && (
              <Campo label="Indica cuántas cintas tienes de cada tipo" error={errores.cintas}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {(Object.keys(datos.cintas) as (keyof typeof datos.cintas)[]).map((k) => (
                    <div key={k}>
                      <label style={{ fontSize: ".75rem", color: "#6b7280", display: "block", marginBottom: 2 }}>{k.toUpperCase()}</label>
                      <input
                        type="number"
                        min={0}
                        style={inputStyle}
                        value={datos.cintas[k]}
                        onChange={(e) => actualizar("cintas", { ...datos.cintas, [k]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              </Campo>
            )}
          </>
        )}

        {paso === 4 && (
          <>
            {esCintas ? (
              <p style={{ color: "#6b7280", fontSize: ".9rem" }}>
                La digitalización y conversión de cintas no requiere descripción de avería.
              </p>
            ) : (
              <>
                <Campo label="Describe el síntoma de la avería" required error={errores.sintoma}>
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    value={datos.sintoma}
                    onChange={(e) => actualizar("sintoma", e.target.value)}
                    placeholder="Explica qué le ocurre al equipo con el mayor detalle posible…"
                  />
                </Campo>
                <Campo label="Contraseña/PIN del equipo (opcional)">
                  <input style={inputStyle} value={datos.obs} onChange={(e) => actualizar("obs", e.target.value)} />
                </Campo>
                <Campo label="¿El equipo enciende?" required error={errores.enciende}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Pill activo={datos.enciende === "Sí"} color="#15803d" onClick={() => actualizar("enciende", "Sí" as SiNoAVeces)}>Sí</Pill>
                    <Pill activo={datos.enciende === "No"} color="#dc2626" onClick={() => actualizar("enciende", "No" as SiNoAVeces)}>No</Pill>
                    <Pill activo={datos.enciende === "A veces"} color="#d97706" onClick={() => actualizar("enciende", "A veces" as SiNoAVeces)}>A veces</Pill>
                  </div>
                </Campo>
                <Campo label="¿Ha sufrido golpe?" required error={errores.golpe}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Pill activo={datos.golpe === "Sí"} color="#dc2626" onClick={() => actualizar("golpe", "Sí" as SiNo)}>Sí</Pill>
                    <Pill activo={datos.golpe === "No"} color="#15803d" onClick={() => actualizar("golpe", "No" as SiNo)}>No</Pill>
                  </div>
                </Campo>
                <Campo label="¿Ha sufrido humedad?" required error={errores.humedad}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Pill activo={datos.humedad === "Sí"} color="#dc2626" onClick={() => actualizar("humedad", "Sí" as SiNo)}>Sí</Pill>
                    <Pill activo={datos.humedad === "No"} color="#15803d" onClick={() => actualizar("humedad", "No" as SiNo)}>No</Pill>
                  </div>
                </Campo>
                <Campo label="¿Ha tenido reparación anterior?" required error={errores.reparacionAnterior}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Pill activo={datos.reparacionAnterior === "Sí"} color="#dc2626" onClick={() => actualizar("reparacionAnterior", "Sí" as SiNo)}>Sí</Pill>
                    <Pill activo={datos.reparacionAnterior === "No"} color="#15803d" onClick={() => actualizar("reparacionAnterior", "No" as SiNo)}>No</Pill>
                  </div>
                </Campo>
              </>
            )}
          </>
        )}

        {paso === 5 && (
          <>
            {categoria && (
              <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: ".8rem", color: "#374151" }}>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {CONDICIONES_POR_CATEGORIA[categoria].map((c, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>{c}</li>
                  ))}
                </ol>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: ".85rem", marginBottom: 6 }}>
              <input type="checkbox" checked={datos.aceptaCondiciones} onChange={(e) => actualizar("aceptaCondiciones", e.target.checked)} style={{ marginTop: 3 }} />
              <span>He leído y acepto las condiciones del resguardo de recepción. <span style={{ color: "#dc2626" }}>*</span></span>
            </label>
            {errores.aceptaCondiciones && <div style={{ color: "#dc2626", fontSize: ".78rem", marginBottom: 12 }}>{errores.aceptaCondiciones}</div>}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: ".82rem", color: "#6b7280" }}>
              <input type="checkbox" checked={datos.aceptaMarketing} onChange={(e) => actualizar("aceptaMarketing", e.target.checked)} style={{ marginTop: 3 }} />
              <span>Deseo recibir promociones, descuentos y novedades por correo electrónico, WhatsApp u otros medios electrónicos.</span>
            </label>
          </>
        )}

        {paso === 6 && (
          <PasoFotoFirma
            fotos={datos.fotos}
            firmaBase64={datos.firmaBase64}
            errorFotos={errores.fotos}
            errorFirma={errores.firma}
            onFotosChange={(fotos) => actualizar("fotos", fotos)}
            onFirmaChange={(firmaBase64) => actualizar("firmaBase64", firmaBase64)}
          />
        )}

        {errorEnvio && <p style={{ color: "#dc2626", fontSize: ".85rem", marginTop: 12 }}>{errorEnvio}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button type="button" onClick={anterior} disabled={paso === 1} style={{ ...estilos.btnSecundario, visibility: paso === 1 ? "hidden" : "visible" }}>
            ← Anterior
          </button>
          {paso < PASOS.length ? (
            <button type="button" onClick={siguiente} style={estilos.btnPrimario}>
              Siguiente →
            </button>
          ) : (
            <button type="button" onClick={enviar} disabled={enviando} style={estilos.btnPrimario}>
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PasoFotoFirma({
  fotos,
  firmaBase64,
  errorFotos,
  errorFirma,
  onFotosChange,
  onFirmaChange,
}: {
  fotos: FotoFormulario[];
  firmaBase64: string;
  errorFotos?: string;
  errorFirma?: string;
  onFotosChange: (fotos: FotoFormulario[]) => void;
  onFirmaChange: (firmaBase64: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onSeleccionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    archivos.forEach((file) => {
      if (fotos.some((f) => f.name === file.name && f.size === file.size)) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const base64 = dataUrl.split(",")[1] || "";
        if (!base64) return;
        onFotosChange([...fotos, { base64, mime: file.type || "image/jpeg", name: file.name, size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function eliminarFoto(i: number) {
    onFotosChange(fotos.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <Campo label="Foto del equipo / problema" required error={errorFotos}>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "1.5px dashed #d1d5db",
            borderRadius: 10,
            padding: "22px 14px",
            textAlign: "center",
            cursor: "pointer",
            background: "#fafbfc",
          }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onSeleccionarFotos} style={{ display: "none" }} />
          <div style={{ fontSize: "1.8rem", color: "#9ca3af", marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: ".82rem", color: "#6b7280" }}>
            {fotos.length === 0 ? "Toca para hacer o seleccionar una foto" : fotos.length === 1 ? fotos[0].name : `${fotos.length} fotos seleccionadas`}
          </div>
        </div>
        {fotos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8, marginTop: 10 }}>
            {fotos.map((f, i) => (
              <div key={f.name + f.size} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:${f.mime};base64,${f.base64}`} alt={`foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button
                  type="button"
                  onClick={() => eliminarFoto(i)}
                  title="Eliminar"
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,.6)",
                    color: "#fff",
                    fontSize: ".7rem",
                    lineHeight: "20px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Campo>

      <Campo label="Firma del cliente" required error={errorFirma}>
        <CanvasFirma value={firmaBase64} onChange={onFirmaChange} />
      </Campo>
    </>
  );
}

function CanvasFirma({ value, onChange }: { value: string; onChange: (base64: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujandoRef = useRef(false);
  const tieneTrazoRef = useRef(!!value);
  const [tieneTrazo, setTieneTrazo] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.offsetWidth) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, []);

  function posición(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    const punto = "touches" in e ? e.touches[0] : e;
    return { x: punto.clientX - r.left, y: punto.clientY - r.top };
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    dibujandoRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = posición(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.MouseEvent | React.TouchEvent) {
    if (!dibujandoRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = posición(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!tieneTrazoRef.current) {
      tieneTrazoRef.current = true;
      setTieneTrazo(true);
    }
  }

  function detener() {
    if (!dibujandoRef.current) return;
    dibujandoRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && tieneTrazoRef.current) {
      onChange(canvas.toDataURL("image/png").split(",")[1] || "");
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    tieneTrazoRef.current = false;
    setTieneTrazo(false);
    onChange("");
  }

  return (
    <div style={{ position: "relative", border: "1.5px solid #d1d5db", borderRadius: 10, overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: 140, cursor: "crosshair", touchAction: "none" }}
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={detener}
        onMouseLeave={detener}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={detener}
      />
      {!tieneTrazo && (
        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "#9ca3af", fontSize: ".85rem", pointerEvents: "none" }}>
          Firme aquí con el dedo o el ratón
        </span>
      )}
      <button
        type="button"
        onClick={limpiar}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          fontSize: ".72rem",
          padding: "3px 8px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          background: "#fff",
          color: "#374151",
          cursor: "pointer",
        }}
      >
        Borrar
      </button>
    </div>
  );
}

function PantallaCodigoAcceso({ onAcceso }: { onAcceso: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState("");

  async function validar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setValidando(true);
    setError("");
    try {
      const res = await fetch("/api/formulario-cliente/validar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!data.ok || !data.valido) throw new Error(data.error || "Código incorrecto.");
      onAcceso();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Error desconocido");
    } finally {
      setValidando(false);
    }
  }

  return (
    <div style={estilos.page}>
      <form onSubmit={validar} style={{ ...estilos.card, maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontSize: "1.15rem", color: "#1a1a2e", marginBottom: 4 }}>Código de acceso</h1>
        <p style={{ fontSize: ".85rem", color: "#6b7280", marginBottom: 20 }}>
          Pide el código de 6 dígitos al personal de la tienda.
        </p>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          style={{ ...inputStyle, textAlign: "center", fontSize: "1.6rem", fontWeight: 700, letterSpacing: "0.3em" }}
          placeholder="000000"
        />
        {error && <div style={{ color: "#dc2626", fontSize: ".82rem", marginTop: 10 }}>{error}</div>}
        <button
          type="submit"
          disabled={validando || codigo.length < 6}
          style={{ ...estilos.btnPrimario, width: "100%", marginTop: 18, opacity: validando || codigo.length < 6 ? 0.6 : 1 }}
        >
          {validando ? "Comprobando…" : "Continuar"}
        </button>
      </form>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  page: { fontFamily: "var(--font-sans), Arial, Helvetica, sans-serif", background: "#f4f6fb", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "20px 16px" },
  card: { background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,.10)", padding: "28px 24px", width: "100%", maxWidth: 560, height: "fit-content" },
  notice: { background: "#eff6ff", color: "#1768ea", borderRadius: 8, padding: "10px 14px", fontSize: ".82rem", marginBottom: 18 },
  btnPrimario: { background: "#1768ea", color: "#fff", border: "none", borderRadius: 8, padding: "12px 22px", fontSize: ".95rem", fontWeight: 700, cursor: "pointer" },
  btnSecundario: { background: "none", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "12px 22px", fontSize: ".95rem", color: "#374151", cursor: "pointer" },
};
