import { Diagram } from "@/lib/icons";
import { Cabecera, InfoVista } from "../_ui";

// ───────────── diagrama de conexiones ─────────────
type TonoCaja = "fuente" | "proceso" | "borrador" | "validado" | "contabilizado" | "apoyo";

const TONOS: Record<TonoCaja, string> = {
  fuente: "text-muted-foreground",
  proceso: "text-sky-600 dark:text-sky-400",
  borrador: "text-amber-600 dark:text-amber-400",
  validado: "text-sky-600 dark:text-sky-400",
  contabilizado: "text-emerald-600 dark:text-emerald-400",
  apoyo: "text-muted-foreground",
};

interface CajaDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  titulo: string;
  sub?: string;
  tono: TonoCaja;
}

interface FlechaDef {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  sub?: string;
  labelX?: number;
  labelY?: number;
  discontinua?: boolean;
}

const CAJAS: CajaDef[] = [
  // fuentes
  { id: "f1", x: 16, y: 16, w: 196, h: 56, titulo: "Reparaciones / Ventas", sub: "facturas, tickets, rectificativas", tono: "fuente" },
  { id: "f2", x: 228, y: 16, w: 196, h: 56, titulo: "Libro de Compras", sub: "facturas de proveedor ya validadas", tono: "fuente" },
  { id: "f3", x: 440, y: 16, w: 196, h: 56, titulo: "Importaciones / DUA", sub: "ya validada y pagada", tono: "fuente" },
  { id: "f4", x: 652, y: 16, w: 196, h: 56, titulo: "Efectivo y caja", sub: "movimientos ya clasificados", tono: "fuente" },
  { id: "f5", x: 864, y: 16, w: 196, h: 56, titulo: "Compras y pagos", sub: "pagos ya registrados", tono: "fuente" },
  // adaptadores
  { id: "adapt", x: 16, y: 104, w: 1044, h: 52, titulo: "Lectura automática de lo ya emitido", sub: "convierte cada documento a un formato común (fecha + importes)", tono: "proceso" },
  // bandeja de eventos
  { id: "eventos", x: 300, y: 190, w: 480, h: 52, titulo: "Bandeja de eventos", sub: "pestaña dentro de Asientos — una fila por documento, nunca se duplica", tono: "proceso" },
  // reglas + plan de apoyo
  { id: "reglas", x: 300, y: 292, w: 480, h: 52, titulo: "Reglas contables", sub: "con versiones — deciden a qué cuentas va cada tipo de hecho", tono: "proceso" },
  { id: "plan", x: 828, y: 292, w: 236, h: 52, titulo: "Plan contable", sub: "cuentas · bancos · categorías", tono: "apoyo" },
  // estados del asiento
  { id: "inmov", x: 16, y: 382, w: 260, h: 52, titulo: "Inmovilizado", sub: "amortización mensual: genera el asiento directo", tono: "apoyo" },
  { id: "borrador", x: 290, y: 382, w: 140, h: 52, titulo: "Borrador", tono: "borrador" },
  { id: "validado", x: 478, y: 382, w: 140, h: 52, titulo: "Validado", tono: "validado" },
  { id: "contabilizado", x: 666, y: 382, w: 190, h: 52, titulo: "Contabilizado", tono: "contabilizado" },
  // correcciones/reclasificación
  { id: "revertir", x: 478, y: 472, w: 190, h: 48, titulo: "Revertir", sub: "motivo + fecha → contra-asiento nuevo", tono: "apoyo" },
  { id: "pendientes", x: 700, y: 472, w: 190, h: 48, titulo: "Partidas pendientes", sub: "asignar el banco cuando no se conocía", tono: "apoyo" },
  // salida
  { id: "informes", x: 300, y: 550, w: 480, h: 56, titulo: "Informes de lectura", sub: "Libro Diario · Libro Mayor · Sumas y Saldos · Balance y resultados · Libro de IVA · Clientes y proveedores", tono: "proceso" },
  { id: "cierre", x: 300, y: 624, w: 480, h: 40, titulo: "Cierre de ejercicio", sub: "regulariza y cierra con lo contabilizado en el año", tono: "apoyo" },
];

const FLECHAS: FlechaDef[] = [
  { x1: 114, y1: 72, x2: 130, y2: 104 },
  { x1: 326, y1: 72, x2: 340, y2: 104 },
  { x1: 538, y1: 72, x2: 545, y2: 104 },
  { x1: 750, y1: 72, x2: 745, y2: 104 },
  { x1: 962, y1: 72, x2: 950, y2: 104 },
  { x1: 540, y1: 156, x2: 540, y2: 190, label: "un evento por documento" },
  { x1: 540, y1: 242, x2: 540, y2: 292, label: "según el tipo de hecho", sub: "la regla activa" },
  { x1: 540, y1: 344, x2: 540, y2: 382, label: "genera" },
  { x1: 828, y1: 318, x2: 780, y2: 318, label: "resuelve cuentas", labelX: 804, labelY: 306, discontinua: true },
  { x1: 276, y1: 408, x2: 290, y2: 408, label: "directo, sin pasar por eventos", labelX: 283, labelY: 372, discontinua: true },
  { x1: 430, y1: 408, x2: 478, y2: 408, label: "Validar", labelX: 454, labelY: 400 },
  { x1: 618, y1: 408, x2: 666, y2: 408, label: "Contabilizar", labelX: 642, labelY: 400 },
  { x1: 610, y1: 434, x2: 570, y2: 472, label: "revertir", labelX: 605, labelY: 458 },
  { x1: 668, y1: 472, x2: 710, y2: 434, discontinua: true },
  { x1: 790, y1: 434, x2: 795, y2: 472, label: "si no hay banco", labelX: 825, labelY: 458 },
  { x1: 840, y1: 472, x2: 830, y2: 434, discontinua: true },
  { x1: 745, y1: 434, x2: 610, y2: 550, label: "alimenta" },
  { x1: 540, y1: 606, x2: 540, y2: 624 },
];

function DiagramaFlujo() {
  return (
    <figure className="rounded-lg border bg-card p-3">
      <svg viewBox="0 0 1080 680" role="img" aria-label="Diagrama de conexiones del módulo de Contabilidad: los documentos de origen pasan por adaptadores, se registran como eventos, el motor de reglas los convierte en asientos que recorren Borrador, Validado y Contabilizado, y desde ahí alimentan los informes de lectura y el cierre de ejercicio.">
        <defs>
          <marker id="arq-flecha" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
          </marker>
        </defs>
        <g className="text-border" opacity="0.9">
          {FLECHAS.map((f, i) => (
            <g key={i} className={f.discontinua ? "text-muted-foreground/70" : "text-foreground/60"}>
              <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke="currentColor" strokeWidth={1.5} strokeDasharray={f.discontinua ? "4 3" : undefined} markerEnd="url(#arq-flecha)" />
            </g>
          ))}
        </g>
        {FLECHAS.filter((f) => f.label).map((f, i) => (
          <g key={i} className="fill-muted-foreground">
            <text x={f.labelX ?? (f.x1 + f.x2) / 2} y={(f.labelY ?? (f.y1 + f.y2) / 2) - (f.sub ? 8 : 3)} textAnchor="middle" fontSize="11" className="fill-foreground">
              {f.label}
            </text>
            {f.sub && (
              <text x={f.labelX ?? (f.x1 + f.x2) / 2} y={(f.labelY ?? (f.y1 + f.y2) / 2) + 8} textAnchor="middle" fontSize="9.5">
                {f.sub}
              </text>
            )}
          </g>
        ))}
        {CAJAS.map((c) => (
          <g key={c.id} className={TONOS[c.tono]}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={8} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.3} strokeDasharray={c.tono === "apoyo" ? "4 3" : undefined} />
            <text x={c.x + c.w / 2} y={c.y + (c.sub ? c.h / 2 - 4 : c.h / 2 + 4)} textAnchor="middle" fontSize="12" fontWeight={600} className="fill-foreground">
              {c.titulo}
            </text>
            {c.sub && (
              <text x={c.x + c.w / 2} y={c.y + c.h / 2 + 13} textAnchor="middle" fontSize="9.5" className="fill-muted-foreground">
                {c.sub}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Los documentos de origen se convierten en eventos, las reglas los convierten en asientos, y solo lo Contabilizado alimenta el resto.</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-px w-4 border-t border-dashed border-current" /> conexión de apoyo (no es el flujo principal)
        </span>
      </figcaption>
    </figure>
  );
}

interface Vista {
  ruta: string | null;
  titulo: string;
  resumen: string;
  lee: string[];
  acciones: string[];
  colaterales: string[];
  nota?: string;
}

const MODELO_CENTRAL = {
  titulo: "El modelo: eventos → reglas → asientos",
  texto: [
    "Cada hecho contable nace como un EVENTO (una factura, un pago, un movimiento de caja convertido a un documento con fecha e importes) en la bandeja de eventos. Un motor de REGLAS convierte cada evento en un ASIENTO en estado BORRADOR. Nada de esto toca los datos operativos (facturas, pedidos, caja...): la contabilidad solo LEE de ellos.",
    "Un asiento recorre BORRADOR → VALIDADO → CONTABILIZADO → (CERRADO tras el cierre del ejercicio). Solo al pasar a CONTABILIZADO recibe su número definitivo y queda protegido: una comprobación de la propia base de datos impide editar o borrar un asiento que no esté en BORRADOR — no es algo que dependa de la aplicación, es una restricción de la base de datos, así que ni un fallo del programa puede saltársela. Para corregir un asiento ya contabilizado se genera un CONTRA-ASIENTO (Revertir): el original nunca se toca.",
    "Otra comprobación obliga a que cada asiento cuadre (Debe = Haber) antes de guardarse. Y una tercera bloquea el paso a CONTABILIZADO —no la creación del borrador— si el mes de la fecha del asiento ya está cerrado en Periodos.",
    "Las reglas son INMUTABLES por versión: editar una regla crea una versión nueva y desactiva la anterior; los asientos ya generados con la versión vieja no cambian, y a partir de ahí los eventos nuevos usan la versión nueva.",
  ],
};

const MOTOR_SINCRONIZACION: Vista = {
  ruta: null,
  titulo: "Motor de sincronización («Sincronizar operaciones», se abre desde Asientos)",
  resumen:
    "No es una pantalla propia: es el botón que recorre las tablas operativas (reparaciones, ventas, tickets, compras, importaciones, caja) desde la fecha de inicio configurada, arma el documento canónico de cada una y las registra como eventos nuevos en la bandeja.",
  lee: [
    "Todo lo facturado/cobrado en Reparaciones y Ventas (facturas, tickets, rectificativas, devoluciones)",
    "El Libro de Compras — solo las facturas ya marcadas como validadas",
    "Importaciones / DUA — solo las que están validadas, pagadas y liquidadas en la propia aduana",
    "Efectivo y caja — solo los movimientos ya clasificados",
    "Los pagos que se registran desde Compras y pagos",
  ],
  acciones: ["Simular (no guarda nada, solo informa)", "Registrar y generar borradores (detrás de una casilla de confirmación explícita)"],
  colaterales: [
    "En modo simulación: no escribe nada, solo cuenta cuántos documentos hay, cuántos son eventos nuevos, cuántos ya estaban registrados y cuántos «no cubiertos» (alquileres y mensajería con factura, que hoy se leen pero no se convierten).",
    "Al registrar: añade una fila por documento nuevo a la bandeja de eventos (nunca duplica el mismo documento) y, si se pidió, procesa esos eventos en el mismo paso — es decir, genera sus asientos BORRADOR de inmediato.",
    "Un documento que cambió en el origen DESPUÉS de haberse registrado se marca con un aviso de «cambió después de registrarse», nunca se sobrescribe solo — hay que revisarlo a mano.",
    "Cada intento (simulado o real) queda registrado en el histórico de auditoría.",
  ],
};

const VISTAS: Vista[] = [
  {
    ruta: "/contabilidad/asientos",
    titulo: "Asientos",
    resumen: "El listado central de todos los asientos (los 4 estados) más la «Bandeja de eventos» — la cola de documentos pendientes de convertirse en asiento.",
    lee: ["Todos los asientos y sus líneas (Debe/Haber)", "La bandeja de eventos pendientes (pestaña Eventos)", "El historial de cada asiento (auditoría)"],
    acciones: [
      "Validar / Validar y contabilizar (selección múltiple)",
      "Asiento manual (crear/editar mientras esté en BORRADOR)",
      "Eliminar (solo BORRADOR)",
      "Devolver a borrador",
      "Revertir… (motivo ≥5 caracteres + fecha)",
      "Procesar pendientes / Reintentar / Ignorar (pestaña Eventos)",
    ],
    colaterales: [
      "Validar y Contabilizar cambian el estado; Contabilizar es lo único que asigna el número definitivo, y es el único paso que se bloquea si el periodo de la fecha ya está cerrado.",
      "Eliminar un borrador generado automáticamente devuelve su evento a «pendiente» para que se pueda regenerar (no se pierde el hecho, solo el borrador descartado).",
      "Revertir NUNCA edita el original: inserta un asiento nuevo con el Debe/Haber invertido, fechado como se indique (no puede ser anterior al original), y lo deja validado y contabilizado en el acto.",
      "Un asiento contabilizado o cerrado no se puede reventir dos veces: si ya tiene un contra-asiento, lo dice.",
      "«Procesar pendientes» ejecuta el motor de reglas sobre los eventos en cola: cada uno, si tiene regla activa, genera un asiento BORRADOR nuevo.",
    ],
  },
  {
    ruta: "/contabilidad/diario",
    titulo: "Libro Diario",
    resumen: "Listado cronológico de asientos con sus líneas, de solo lectura.",
    lee: ["Los asientos y sus líneas, filtrados por fecha y estado"],
    acciones: ["Filtrar por fechas", "Incluir borradores", "Abrir el detalle de un asiento (mismas acciones que en Asientos)"],
    colaterales: ["Ninguno directo: es una vista de lectura. Cualquier acción se hace desde el diálogo de detalle, que es el mismo que en Asientos."],
  },
  {
    ruta: "/contabilidad/mayor",
    titulo: "Libro Mayor",
    resumen: "Movimientos de UNA cuenta (o de un grupo si se busca por el código corto) con saldo acumulado.",
    lee: ["Los movimientos de la cuenta elegida (o de todo su grupo, si se busca por el código corto), con el saldo inicial calculado antes de la fecha «desde»"],
    acciones: ["Elegir cuenta (autocompleta contra el Plan)", "Filtrar por fechas", "Incluir borradores", "Abrir el asiento de un movimiento"],
    colaterales: ["Ninguno directo: es de lectura. Es el destino de los enlaces «ver en el Mayor» de Balance, Sumas y Saldos, PyG (dentro de IVA/Balance) y Terceros."],
  },
  {
    ruta: "/contabilidad/sumas-saldos",
    titulo: "Sumas y Saldos",
    resumen: "El balance de comprobación clásico: Debe, Haber y saldo de cada cuenta en un periodo, con el chequeo de que todo cuadra.",
    lee: ["Todas las cuentas y sus movimientos, agregados por cuenta"],
    acciones: ["Filtrar por fechas", "Incluir borradores", "Ir al Mayor de una cuenta"],
    colaterales: ["Ninguno: es de lectura pura."],
  },
  {
    ruta: "/contabilidad/compras",
    titulo: "Compras y pagos",
    resumen: "Cruza las facturas ya VALIDADAS del Libro de Compras con sus pagos reales, y es donde se registran esos pagos.",
    lee: ["Las facturas ya validadas del Libro de Compras", "Los pagos ya registrados aquí mismo", "Los bancos dados de alta en Plan contable"],
    acciones: ["Registrar pago (fecha, importe ≤ lo pendiente, medio, banco opcional, referencia)"],
    colaterales: [
      "Registrar un pago SOLO queda guardado como pago — no toca la factura ni crea un asiento aquí mismo.",
      "Ese pago se convierte en asiento (cuenta del proveedor contra el banco elegido) en la SIGUIENTE sincronización, como el pago correspondiente al proveedor o al acreedor.",
      "Si no se indica banco (o el medio es «otro»), el pago igualmente se contabiliza pero queda pendiente de conciliar — ver «Partidas pendientes» si el cobro/pago entero cae en la cuenta puente 555.",
      "Una factura sin categoría de compra, en moneda distinta de EUR, o con retención de IRPF, no es «contabilizable» todavía: el motivo exacto se ve en esta misma tabla (columna Motivo) y hay que resolverlo en el Libro de Compras, no aquí.",
    ],
  },
  {
    ruta: "/contabilidad/terceros",
    titulo: "Clientes y proveedores",
    resumen: "Saldo pendiente por cliente/proveedor con antigüedad (aging 0-30/31-60/61-90/90+ días), de solo lectura.",
    lee: ["Las subcuentas de cada cliente/proveedor y sus movimientos"],
    acciones: ["Cambiar entre clientes/proveedores", "A fecha de…", "Incluir borradores", "Ir al Mayor de la subcuenta"],
    colaterales: ["Ninguno directo: es de lectura. La subcuenta de cada cliente/proveedor se crea SOLA la primera vez que una regla necesita una para él (ver «Reglas contables»)."],
  },
  {
    ruta: "/contabilidad/balance",
    titulo: "Balance y resultados",
    resumen: "Balance de situación (Activo/Pasivo) a una fecha, y Pérdidas y Ganancias de un periodo.",
    lee: ["Todas las cuentas y sus movimientos, agregados por grupo"],
    acciones: ["Elegir fecha (Balance) o periodo (PyG)", "Incluir borradores", "Ir al Mayor de una cuenta"],
    colaterales: ["Ninguno: de lectura. El resultado del PyG excluye a propósito los asientos de tipo «cierre»/«apertura» (si no, el cierre del año anterior distorsionaría el resultado del actual)."],
  },
  {
    ruta: "/contabilidad/iva",
    titulo: "Libro de IVA",
    resumen: "IVA repercutido (ventas) y soportado (compras) con liquidación trimestral orientativa — la gestoría presenta el modelo real.",
    lee: ["Los movimientos de las cuentas de IVA (repercutido y soportado)"],
    acciones: ["Filtrar por fechas", "Incluir borradores", "Abrir el asiento de una línea"],
    colaterales: ["Ninguno: de lectura."],
  },
  {
    ruta: "/contabilidad/inmovilizado",
    titulo: "Inmovilizado",
    resumen: "Registro de activos fijos (equipos, mobiliario…) y generación de su amortización mensual lineal.",
    lee: ["El registro de activos fijos", "Las cuotas de amortización ya generadas, mes a mes, ligadas a su asiento"],
    acciones: ["Nuevo activo", "Generar amortización de un mes", "Dar de baja (con motivo)"],
    colaterales: [
      "Generar la amortización de un mes crea UN asiento (gasto agrupado por cuenta, contra la amortización acumulada) y una cuota por cada activo con importe ese mes, ligada a ese asiento: si el borrador se elimina desde Asientos, las cuotas de ese mes se liberan solas y el mes se puede regenerar.",
      "No deja generar un mes si el mes anterior todavía tiene cuotas pendientes (fuerza el orden cronológico).",
      "Dar de baja un activo detiene su amortización desde el mes siguiente, pero NO genera el asiento de baja (venta/pérdida del bien) — eso se hace aparte, a mano.",
      "Un activo con cuotas ya generadas no permite cambiar sus datos económicos (coste, vida útil…): hay que darlo de baja y crear uno nuevo si hace falta corregirlo.",
    ],
  },
  {
    ruta: "/contabilidad/pendientes",
    titulo: "Partidas pendientes de aplicar",
    resumen: "Cobros/pagos que cayeron en la cuenta puente 555 (banco sin identificar todavía) y hay que asignar a un banco real.",
    lee: ["Los movimientos contabilizados en la cuenta puente (555) que aún no se han asignado a un banco", "Qué partidas ya se aplicaron, para no repetirlas"],
    acciones: ["Seleccionar varias partidas → elegir banco y fecha → Aplicar al banco"],
    colaterales: [
      "Aplicar crea un asiento NUEVO (reclasificación: saca el importe de la cuenta puente y lo mete en el banco elegido) y queda contabilizado en el acto — los asientos originales que cayeron en esa cuenta NUNCA se tocan.",
      "Cada partida aplicada queda registrada para no poder aplicarse dos veces.",
    ],
  },
  {
    ruta: "/contabilidad/cierre",
    titulo: "Cierre de ejercicio",
    resumen: "Asistente guiado de fin de año, en 6 pasos obligatorios en este orden: existencias (opcional) → regularización del resultado → cierre y apertura → cerrar los 12 periodos → cerrar el ejercicio.",
    lee: ["El ejercicio y sus periodos", "Los asientos de cierre, apertura y regularización ya generados", "El estado de la amortización del año (Inmovilizado)"],
    acciones: ["Generar regularización de existencias", "Generar regularización del resultado", "Generar cierre y apertura", "Cerrar el ejercicio", "Reabrir ejercicio (motivo ≥10 caracteres)"],
    colaterales: [
      "TODO lo que genera este asistente son asientos en BORRADOR: hay que ir a Asientos a validarlos y contabilizarlos — nada se contabiliza solo desde aquí (salvo el propio «cerrar ejercicio», que solo cambia un estado).",
      "La regularización del resultado y el asiento de cierre son de tipo «cierre»: Balance/PyG los EXCLUYEN a propósito para no distorsionar el resultado del año.",
      "«Generar cierre y apertura» exige que la regularización del resultado ya esté contabilizada, y de paso crea el ejercicio siguiente si no existía.",
      "«Cerrar el ejercicio» exige cierre+apertura contabilizados Y los 12 periodos del año ya cerrados — si no, dice cuántos periodos faltan.",
      "El resultado se lleva a la cuenta 129; llevarlo a reservas/remanente es un asiento manual aparte, no lo hace el asistente.",
    ],
  },
  {
    ruta: "/contabilidad/efectivo",
    titulo: "Efectivo y caja",
    resumen: "Clasifica cada movimiento manual de caja (retirada/ingreso) con su destino contable, para que el motor de sincronización pueda convertirlo en asiento.",
    lee: ["Los movimientos de caja tal como se registraron (no se modifican)", "La clasificación que se añade aquí para cada uno"],
    acciones: ["Elegir categoría por movimiento (gasto menor / retirada del socio / compra de material / depósito en banco / apertura de caja / aportación del socio)"],
    colaterales: [
      "Clasificar solo guarda esa clasificación — el movimiento de caja original no se modifica.",
      "«Apertura de caja» es la única categoría que NUNCA genera un evento por separado: se asume que va dentro del asiento de apertura del ejercicio.",
      "Un movimiento anulado en origen no se puede clasificar.",
      "Una vez que el movimiento ya generó un evento contable (se sincronizó), no se puede reclasificar aquí — hay que revertir su asiento primero.",
      "«Depósito en banco» exige elegir el banco: es lo que produce el movimiento que traslada el importe de caja al banco elegido.",
    ],
  },
  {
    ruta: "/contabilidad/plan",
    titulo: "Plan contable",
    resumen: "El árbol de cuentas (PGC), más los bancos y categorías de gasto que usa el motor de reglas — la base de la que tira casi cualquier otra pantalla del módulo.",
    lee: ["El árbol de cuentas, los bancos dados de alta y las categorías de gasto"],
    acciones: ["Nueva cuenta", "Activar/desactivar cuenta, marcarla imputable o no", "Nuevo banco / editar", "Nueva categoría / editar"],
    colaterales: [
      "Crear un banco crea TAMBIÉN, en el mismo paso, su propia subcuenta de bancos — no hace falta crear la cuenta aparte.",
      "Desactivar una cuenta o quitarle «imputable» no borra su histórico, pero una comprobación de la base de datos IMPIDE crear nuevas líneas de asiento contra ella a partir de ahí.",
      "Una cuenta con movimientos ya registrados queda marcada como tal y protegida en la práctica (no tiene sentido borrarla).",
    ],
  },
  {
    ruta: "/contabilidad/reglas",
    titulo: "Reglas contables",
    resumen: "El motor que decide a qué cuentas va cada tipo de evento (venta, compra, pago, importación, movimiento de caja…). Es el corazón de la sincronización.",
    lee: ["Cada regla y sus líneas Debe/Haber", "Cuántos asientos ha generado cada una"],
    acciones: ["Activar/desactivar una regla", "Simular contra un documento de ejemplo (no guarda nada)", "Nueva versión… (editar nombre/concepto/líneas)"],
    colaterales: [
      "Guardar cambios NUNCA edita la regla existente: crea una versión nueva, correlativa, y desactiva la anterior. Los asientos ya generados con la versión vieja se quedan exactamente igual.",
      "La versión nueva solo se aplica a los eventos que se procesen a partir de ese momento — no hay «recalcular con la regla nueva».",
      "Activar una regla desactiva automáticamente cualquier otra versión activa del mismo código (solo puede haber una versión activa por regla a la vez).",
      "Una regla marcada «requiere validación de la gestoría» no bloquea nada: solo hace que el asiento que genere muestre un aviso ámbar en su detalle.",
    ],
  },
  {
    ruta: "/contabilidad/periodos",
    titulo: "Periodos y auditoría",
    resumen: "Abrir/cerrar meses dentro de un ejercicio, y el registro de auditoría de TODO el módulo (no solo periodos).",
    lee: ["Los 12 meses de cada ejercicio, creados solos al crear el ejercicio", "El historial de auditoría de todo el módulo"],
    acciones: ["Crear ejercicio (el año siguiente)", "Cerrar un mes (bloqueado si quedan asientos sin contabilizar)", "Reabrir un mes (motivo ≥10 caracteres)"],
    colaterales: [
      "Cerrar un mes NO bloquea crear o editar un BORRADOR fechado ahí — lo que bloquea (una comprobación de la base de datos, no la aplicación) es el paso final a CONTABILIZADO. Un borrador «atrapado» en un mes cerrado solo se puede eliminar o reabrir el mes.",
      "Reabrir queda siempre registrado con quién y por qué: el propio sistema exige un motivo de ≥10 caracteres o rechaza el cambio.",
      "«Auditoría» es de solo lectura y además es de solo escritura por diseño: nadie puede editar ni borrar sus filas después, ni siquiera un superadmin — queda protegida a propósito.",
    ],
  },
];

const RELACIONADAS: Vista[] = [
  {
    ruta: "/facturas-recibidas",
    titulo: "Libro de Compras (fuera de Contabilidad, pero la alimenta)",
    resumen: "Registro de facturas de proveedor. No vive bajo Contabilidad, pero es la fuente real de «Compras y pagos» y de la sincronización con el resto del módulo.",
    lee: ["El registro de facturas de proveedor", "Sus vínculos con pedidos o stock"],
    acciones: ["Nueva factura / editar (con lectura OCR)", "Enlazar/desenlazar con un pedido o stock", "Descartar duplicado", "Eliminar (solo superadmin, con motivo)"],
    colaterales: [
      "Una factura solo se contabiliza cuando pasa a «validada» — mientras tanto, el motor de sincronización la ignora explícitamente.",
      "Eliminar está bloqueado si hay facturas rectificativas vinculadas a ella — hay que desvincularlas primero; nunca las desvincula solo.",
      "Cada borrado queda auditado (motivo obligatorio) en el mismo registro de eliminaciones que usan Reparaciones/Facturas manuales — no es un borrado silencioso.",
      "Un número de factura repetido para el mismo proveedor NO se bloquea (hay rectificativas/abonos legítimos que repiten numeración): se marca «posible duplicado» como aviso, a confirmar o descartar a mano.",
      "El almacén «servicio» y el almacén «stock» son excluyentes entre sí: fijar uno limpia el enlace de pedido/stock del otro tipo.",
    ],
  },
  {
    ruta: "/importaciones",
    titulo: "Importaciones / DUA (fuera de Contabilidad, pero la alimenta)",
    resumen: "Registro de declaraciones de aduana (DUA): IVA a la importación y aranceles. Alimenta la sincronización con Contabilidad.",
    lee: ["El registro de importaciones tal como se guarda aquí"],
    acciones: ["Nueva importación / editar", "Adjuntar el documento aduanero"],
    colaterales: [
      "Se contabiliza SOLO cuando se cumplen las tres condiciones a la vez: validada, marcada como pagada y liquidada en la propia aduana (el pago diferido a la aduana todavía no está soportado por el motor).",
      "Si «IVA + derechos» no coincide con el total de tributos declarado (más de 1 céntimo de diferencia), el motor de sincronización la deja fuera con un aviso en vez de contabilizarla mal.",
      "«Otros gastos» distinto de 0 tampoco está soportado todavía: se avisa y no se contabiliza hasta que se resuelva.",
    ],
  },
];

function Bloque({ v }: { v: Vista }) {
  return (
    <details className="group rounded-lg border bg-card open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium">{v.titulo}</span>
          {v.ruta && <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{v.ruta}</code>}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-3 border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">{v.resumen}</p>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Qué lee</p>
          <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
            {v.lee.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Qué se puede hacer</p>
          <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
            {v.acciones.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-500">Movimientos colaterales</p>
          <ul className="list-inside list-disc space-y-1">
            {v.colaterales.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

export default function ArquitecturaPage() {
  return (
    <div className="space-y-3 p-6">
      <Cabecera icono={<Diagram className="size-4.5" />} titulo="Arquitectura del módulo" descripcion="Cada vista de Contabilidad: qué es, qué lee y qué efectos colaterales tiene tocarla — para decidir qué mantener." />
      <InfoVista>
        Esto es un mapa de referencia, no una pantalla operativa: cada bloque explica qué pasa de verdad al usarla (verificado contra el código real del servidor, no solo contra lo que se ve en pantalla), para poder decidir con criterio qué vistas conservar, simplificar o descartar.
      </InfoVista>

      <details className="group rounded-lg border border-emerald-500/30 bg-emerald-500/5 open:shadow-sm" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <span className="font-medium">{MODELO_CENTRAL.titulo}</span>
          <span className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-2 border-t border-emerald-500/20 px-4 py-3 text-sm text-muted-foreground">
          {MODELO_CENTRAL.texto.map((p) => (
            <p key={p} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </details>

      <DiagramaFlujo />

      <div className="space-y-2">
        {VISTAS.map((v) => (
          <Bloque key={v.titulo} v={v} />
        ))}
        <Bloque v={MOTOR_SINCRONIZACION} />
      </div>

      <div className="pt-2">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Módulos relacionados (no viven bajo /contabilidad)</p>
        <div className="space-y-2">
          {RELACIONADAS.map((v) => (
            <Bloque key={v.titulo} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
