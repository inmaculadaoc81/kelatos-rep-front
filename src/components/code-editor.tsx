"use client";

import { useImperativeHandle, useMemo, useRef, useState } from "react";

/**
 * Editor de código ligero (sin dependencias): un <textarea> transparente
 * encima de un <pre> con el código coloreado, con números de línea, línea
 * activa, auto-indentado, cierre automático de pares, Tab/Shift+Tab y
 * Ctrl+/ para comentar. Los cambios de texto pasan por execCommand para
 * conservar el deshacer (Ctrl+Z) del navegador. Paleta: tema Vesper de
 * VS Code (fondo #101010) y una variante clara.
 */

export type TemaEditor = "vesper" | "claro";
export type LenguajeEditor = "js" | "json" | "html";

const PALETAS: Record<TemaEditor, Record<string, string>> = {
  vesper: {
    "--ce-bg": "#101010", "--ce-fg": "#ffffff", "--ce-gutter": "#505050", "--ce-gutter-activa": "#a0a0a0",
    "--ce-linea": "#ffffff0d", "--ce-kw": "#a0a0a0", "--ce-fn": "#ffc799", "--ce-num": "#ffc799",
    "--ce-str": "#99ffe4", "--ce-com": "#8b8b8b99", "--ce-punc": "#a0a0a0", "--ce-sel": "#ffffff25",
    "--ce-caret": "#ffc799", "--ce-borde": "#2a2a2a",
  },
  claro: {
    "--ce-bg": "#ffffff", "--ce-fg": "#1f1f1f", "--ce-gutter": "#b4b4b4", "--ce-gutter-activa": "#555555",
    "--ce-linea": "#0000000a", "--ce-kw": "#6b6b6b", "--ce-fn": "#b45309", "--ce-num": "#b45309",
    "--ce-str": "#0f766e", "--ce-com": "#9a9a9a", "--ce-punc": "#6b6b6b", "--ce-sel": "#ffc79966",
    "--ce-caret": "#b45309", "--ce-borde": "#e5e5e5",
  },
};

const ESTILOS = `
.ce-root .tk-kw { color: var(--ce-kw); }
.ce-root .tk-fn, .ce-root .tk-num { color: var(--ce-fn); }
.ce-root .tk-str { color: var(--ce-str); }
.ce-root .tk-com { color: var(--ce-com); font-style: italic; }
.ce-root .tk-punc { color: var(--ce-punc); }
.ce-root .tk-id, .ce-root .tk-prop { color: var(--ce-fg); }
.ce-root textarea::selection { background: var(--ce-sel); }
.ce-root textarea::placeholder { color: var(--ce-gutter); }
`;

const KEYWORDS = new Set([
  "const", "let", "var", "return", "if", "else", "for", "while", "do", "of", "in", "new", "typeof", "instanceof", "function", "class",
  "extends", "async", "await", "try", "catch", "finally", "throw", "switch", "case", "break", "continue", "default", "delete", "void",
  "import", "export", "from", "yield",
]);
const CONSTANTES = new Set(["true", "false", "null", "undefined", "NaN", "Infinity", "this"]);

type Token = { c: string; s: string };

function tokenizarHtml(src: string): Token[] {
  const out: Token[] = [];
  const re = /<!--[\s\S]*?(?:-->|$)|<\/?[A-Za-z][^>]*(?:>|$)|[^<]+|</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const t = m[0];
    if (t.startsWith("<!--")) out.push({ c: "com", s: t });
    else if (/^<\/?[A-Za-z]/.test(t)) {
      const partes = t.split(/(<\/?[\w-]+|"[^"]*"|'[^']*'|\/?>|=)/g);
      let esNombre = true;
      for (const p of partes) {
        if (!p) continue;
        if (/^<\/?[\w-]+$/.test(p)) out.push({ c: "fn", s: p });
        else if (p[0] === '"' || p[0] === "'") out.push({ c: "str", s: p });
        else if (p === "=" || p === ">" || p === "/>") out.push({ c: "punc", s: p });
        else if (/^\s+$/.test(p)) out.push({ c: "ws", s: p });
        else out.push({ c: esNombre ? "kw" : "id", s: p });
        esNombre = true;
      }
    } else out.push({ c: "id", s: t });
  }
  return out;
}

function tokenizar(src: string, lenguaje: LenguajeEditor): Token[] {
  if (lenguaje === "html") return tokenizarHtml(src);
  const out: Token[] = [];
  const re = {
    com: /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y,
    tpl: /`(?:\\[\s\S]|[^`\\])*(?:`|$)/y,
    str: /'(?:\\.|[^'\\\n])*(?:'|$)|"(?:\\.|[^"\\\n])*(?:"|$)/y,
    num: /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y,
    id: /[A-Za-z_$][\w$]*/y,
    ws: /\s+/y,
    punc: /=>|[=+\-*/%<>!&|?:]+|[;,.(){}[\]^~]/y,
  };
  let i = 0;
  let previo = "";
  const probar = (r: RegExp) => {
    r.lastIndex = i;
    const m = r.exec(src);
    return m && m.index === i ? m[0] : null;
  };
  while (i < src.length) {
    let m: string | null;
    if (lenguaje === "js" && (m = probar(re.com))) {
      out.push({ c: "com", s: m });
    } else if (lenguaje === "js" && (m = probar(re.tpl))) {
      // Plantilla: texto en color de cadena y las expresiones ${…} en color normal.
      let pos = 0;
      const partes = m.split(/(\$\{[^}]*\})/g);
      for (const p of partes) {
        if (!p) continue;
        out.push({ c: p.startsWith("${") && p.endsWith("}") && pos > 0 ? "id" : "str", s: p });
        pos += p.length;
      }
    } else if ((m = probar(re.str))) {
      let clase = "str";
      if (lenguaje === "json") {
        const resto = src.slice(i + m.length);
        if (/^\s*:/.test(resto)) clase = "fn";
      }
      out.push({ c: clase, s: m });
    } else if ((m = probar(re.num))) {
      out.push({ c: "num", s: m });
    } else if ((m = probar(re.id))) {
      let clase = "id";
      if (lenguaje === "json") clase = CONSTANTES.has(m) ? "num" : "id";
      else if (KEYWORDS.has(m)) clase = "kw";
      else if (CONSTANTES.has(m)) clase = "num";
      else if (/^\s*\(/.test(src.slice(i + m.length))) clase = "fn";
      else if (previo === ".") clase = "prop";
      out.push({ c: clase, s: m });
    } else if ((m = probar(re.ws))) {
      out.push({ c: "ws", s: m });
      i += m.length;
      continue;
    } else if ((m = probar(re.punc))) {
      out.push({ c: "punc", s: m });
    } else {
      m = src[i];
      out.push({ c: "id", s: m });
    }
    if (m.trim()) previo = m;
    i += m.length;
  }
  return out;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const escapar = (s: string) => s.replace(/[&<>]/g, (c) => ESCAPES[c]);

function aHtml(src: string, lenguaje: LenguajeEditor): string {
  return tokenizar(src, lenguaje)
    .map((t) => (t.c === "ws" ? escapar(t.s) : `<span class="tk-${t.c}">${escapar(t.s)}</span>`))
    .join("");
}

const PARES: Record<string, string> = { "(": ")", "[": "]", "{": "}", "'": "'", '"': '"', "`": "`" };
const CIERRES = new Set([")", "]", "}", "'", '"', "`"]);

export interface ManejadorEditor {
  insertar: (texto: string) => void;
  enfocar: () => void;
}

export function CodeEditor({
  value: valorCrudo,
  onChange,
  lenguaje = "js",
  tema = "vesper",
  tamanoFuente = 13,
  soloLectura = false,
  numerosDeLinea = true,
  placeholder,
  onGuardar,
  editorRef,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  lenguaje?: LenguajeEditor;
  tema?: TemaEditor;
  tamanoFuente?: number;
  soloLectura?: boolean;
  numerosDeLinea?: boolean;
  placeholder?: string;
  onGuardar?: () => void;
  editorRef?: React.Ref<ManejadorEditor>;
  className?: string;
}) {
  // Saltos de línea Windows (CRLF) a LF: un CR suelto se pinta como salto extra en el <pre>.
  const value = valorCrudo.includes("\r") ? valorCrudo.replace(/\r\n?|\r/g, "\n") : valorCrudo;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const numerosRef = useRef<HTMLDivElement>(null);
  const [lineaActiva, setLineaActiva] = useState(1);

  const alturaLinea = Math.round(tamanoFuente * 1.6);
  const lineas = useMemo(() => value.split("\n"), [value]);
  const anchoMax = useMemo(() => lineas.reduce((m, l) => Math.max(m, l.length), 0), [lineas]);
  const html = useMemo(() => aHtml(value, lenguaje) + "\n", [value, lenguaje]);
  const digitos = String(lineas.length).length;

  useImperativeHandle(editorRef, () => ({
    insertar: (texto: string) => {
      const el = areaRef.current;
      if (el && !soloLectura) insertar(el, texto);
    },
    enfocar: () => areaRef.current?.focus(),
  }));

  function actualizarLinea() {
    const el = areaRef.current;
    if (!el) return;
    setLineaActiva(el.value.slice(0, el.selectionStart).split("\n").length);
  }

  function insertar(el: HTMLTextAreaElement, texto: string) {
    el.focus();
    if (!document.execCommand("insertText", false, texto)) {
      const { selectionStart: a, selectionEnd: b } = el;
      onChange(el.value.slice(0, a) + texto + el.value.slice(b));
      requestAnimationFrame(() => el.setSelectionRange(a + texto.length, a + texto.length));
    }
  }

  function limitesDeLineas(el: HTMLTextAreaElement) {
    const v = el.value;
    const ini = v.lastIndexOf("\n", el.selectionStart - 1) + 1;
    let fin = v.indexOf("\n", el.selectionEnd);
    if (fin === -1) fin = v.length;
    // Si la selección termina justo al inicio de una línea, no se incluye esa línea.
    if (el.selectionEnd > el.selectionStart && v[el.selectionEnd - 1] === "\n") fin = el.selectionEnd - 1;
    return { ini, fin };
  }

  function reemplazarRango(el: HTMLTextAreaElement, ini: number, fin: number, nuevo: string) {
    el.setSelectionRange(ini, fin);
    insertar(el, nuevo);
    el.setSelectionRange(ini, ini + nuevo.length);
  }

  function alPulsarTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    if (soloLectura) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const v = el.value;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onGuardar?.();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      const { ini, fin } = limitesDeLineas(el);
      const bloque = v.slice(ini, fin).split("\n");
      const todasComentadas = bloque.every((l) => !l.trim() || /^\s*\/\//.test(l));
      const nuevo = bloque
        .map((l) => {
          if (!l.trim()) return l;
          return todasComentadas ? l.replace(/^(\s*)\/\/ ?/, "$1") : l.replace(/^(\s*)/, "$1// ");
        })
        .join("\n");
      reemplazarRango(el, ini, fin, nuevo);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (a !== b && v.slice(a, b).includes("\n")) {
        const { ini, fin } = limitesDeLineas(el);
        const bloque = v.slice(ini, fin).split("\n");
        const nuevo = (e.shiftKey ? bloque.map((l) => l.replace(/^ {1,2}/, "")) : bloque.map((l) => (l ? "  " + l : l))).join("\n");
        reemplazarRango(el, ini, fin, nuevo);
      } else if (e.shiftKey) {
        const ini = v.lastIndexOf("\n", a - 1) + 1;
        const lineaTxt = v.slice(ini, a);
        const quitar = lineaTxt.startsWith("  ") ? 2 : lineaTxt.startsWith(" ") ? 1 : 0;
        if (quitar) {
          el.setSelectionRange(ini, ini + quitar);
          insertar(el, "");
        }
      } else {
        insertar(el, "  ");
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const ini = v.lastIndexOf("\n", a - 1) + 1;
      const sangria = (v.slice(ini, a).match(/^\s*/) ?? [""])[0];
      const antes = v[a - 1];
      const despues = v[b];
      e.preventDefault();
      if ((antes === "{" && despues === "}") || (antes === "(" && despues === ")") || (antes === "[" && despues === "]")) {
        insertar(el, "\n" + sangria + "  " + "\n" + sangria);
        const pos = a + 1 + sangria.length + 2;
        el.setSelectionRange(pos, pos);
      } else {
        insertar(el, "\n" + sangria + (antes === "{" || antes === "(" || antes === "[" ? "  " : ""));
      }
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (CIERRES.has(e.key) && a === b && v[a] === e.key && (e.key !== "'" || !/\w/.test(v[a - 1] ?? ""))) {
        e.preventDefault();
        el.setSelectionRange(a + 1, a + 1);
        return;
      }
      if (e.key in PARES) {
        const sig = v[b] ?? "";
        const permitido = a !== b || !sig || /[\s)\]},;]/.test(sig);
        if (permitido && !(["'", '"', "`"].includes(e.key) && /\w/.test(v[a - 1] ?? ""))) {
          e.preventDefault();
          const cierre = PARES[e.key];
          if (a !== b) {
            insertar(el, e.key + v.slice(a, b) + cierre);
            el.setSelectionRange(a + 1, b + 1);
          } else {
            insertar(el, e.key + cierre);
            el.setSelectionRange(a + 1, a + 1);
          }
          return;
        }
      }
    }
  }

  const estiloFuente = { fontSize: tamanoFuente, lineHeight: `${alturaLinea}px` } as const;

  // Los números de línea viven fuera del área que se desplaza: el navegador no
  // cuenta un elemento "sticky" al llevar el cursor a la vista y lo tapaba.
  function sincronizarNumeros(e: React.UIEvent<HTMLDivElement>) {
    if (numerosRef.current) numerosRef.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
  }

  return (
    <div
      className={`ce-root flex overflow-hidden font-mono ${className}`}
      style={{ ...(PALETAS[tema] as React.CSSProperties), background: "var(--ce-bg)", color: "var(--ce-fg)", ...estiloFuente }}
    >
      <style>{ESTILOS}</style>
      {numerosDeLinea && (
        <div
          aria-hidden
          className="shrink-0 overflow-hidden select-none"
          style={{ color: "var(--ce-gutter)", borderRight: "1px solid var(--ce-borde)", minWidth: `${digitos + 3}ch` }}
        >
          <div ref={numerosRef} className="py-3 pr-3 pl-3 text-right">
            {lineas.map((_, i) => (
              <div key={i} style={i + 1 === lineaActiva ? { color: "var(--ce-gutter-activa)" } : undefined}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="relative min-w-0 flex-1 overflow-auto" onScroll={sincronizarNumeros}>
        <div className="relative min-h-full py-3 pr-6 pl-3" style={{ minWidth: `calc(${anchoMax + 4}ch + 2.25rem)` }}>
          {!soloLectura && (
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 left-0"
              style={{ top: `calc(0.75rem + ${(lineaActiva - 1) * alturaLinea}px)`, height: alturaLinea, background: "var(--ce-linea)" }}
            />
          )}
          <pre aria-hidden className="pointer-events-none m-0 whitespace-pre" style={{ ...estiloFuente, fontFamily: "inherit" }} dangerouslySetInnerHTML={{ __html: html }} />
          <textarea
            ref={areaRef}
            value={value}
            readOnly={soloLectura}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            placeholder={placeholder}
            onChange={(e) => {
              onChange(e.target.value);
              actualizarLinea();
            }}
            onKeyDown={alPulsarTecla}
            onKeyUp={actualizarLinea}
            onClick={actualizarLinea}
            onSelect={actualizarLinea}
            className="absolute inset-0 m-0 resize-none overflow-hidden border-0 bg-transparent py-3 pr-6 pl-3 whitespace-pre outline-none"
            style={{ ...estiloFuente, fontFamily: "inherit", color: "transparent", caretColor: "var(--ce-caret)" }}
          />
        </div>
      </div>
    </div>
  );
}
