"use client";

import { useState } from "react";
import { Monitor, DocumentText, Gallery, SearchNormal1, Magicpen, Code, type Icon } from "@/lib/icons";

/**
 * Logo REAL de la app (color oficial de marca) para ejecutables
 * reconocidos — nunca un icono generico puesto "porque sí". Si el
 * ejecutable no está en el mapa cae a un icono neutro (Monitor) en vez de
 * inventar una marca que no corresponde. Mapa curado a mano con los
 * ejecutables mas comunes en un puesto de oficina/desarrollo — no
 * pretende cubrir todo.
 *
 * Los SVG viven en local (public/logos/brands/, generados una vez desde
 * el paquete `simple-icons` — ver historial de commits) en vez de pedirse
 * a cdn.simpleicons.org: en producción (Hostinger) esa CDN no cargaba de
 * forma fiable (bloqueada/lenta según el bloqueador de anuncios o la red
 * del que mira la página) y todos los logos caían en silencio al Monitor
 * genérico. Petición del usuario, 2026-09-15: "mejor busca la imagen...
 * y la pones" — en vez de PNGs sueltos de una búsqueda, se generaron SVG
 * con el path y el color de marca OFICIALES de Simple Icons, sin
 * depender de ningún servicio externo.
 *
 * Verificado uno a uno contra el paquete `simple-icons` (2026-09-15,
 * v16.31.0): Microsoft, Adobe, Slack y Canva retiraron sus marcas de
 * Simple Icons en algún momento — msedge/outlook/teams/slack/skype/
 * code(VS Code)/devenv(Visual Studio)/windowsterminal/powershell/canva/
 * winword/excel/powerpnt/onenote/onedrive/acrobat/photoshop/explorer(
 * Windows) ya no tienen marca disponible ahí. Se quitan del mapa en vez
 * de generar un SVG que no correspondería a la marca real.
 */
const EXE_ICON_SLUG: Record<string, string> = {
  "chrome.exe": "googlechrome",
  "firefox.exe": "firefox",
  "brave.exe": "brave",
  "opera.exe": "opera",
  "vivaldi.exe": "vivaldi",
  "chromium.exe": "googlechrome",

  "discord.exe": "discord",
  "whatsapp.exe": "whatsapp",
  "whatsapp.root.exe": "whatsapp",
  "telegram.exe": "telegram",
  "zoom.exe": "zoom",
  "thunderbird.exe": "thunderbird",

  "pycharm64.exe": "pycharm",
  "idea64.exe": "intellijidea",
  "sublime_text.exe": "sublimetext",
  "vim.exe": "vim",
  "gvim.exe": "vim",
  "githubdesktop.exe": "github",
  "postman.exe": "postman",
  "docker desktop.exe": "docker",

  "figma.exe": "figma",
  "notion.exe": "notion",
  "obsidian.exe": "obsidian",
  "evernote.exe": "evernote",

  "googledrivefs.exe": "googledrive",
  "dropbox.exe": "dropbox",

  "vlc.exe": "vlcmediaplayer",

  "spotify.exe": "spotify",
  "netflix.exe": "netflix",
  "steam.exe": "steam",

  "1password.exe": "1password",
  "bitwarden.exe": "bitwarden",
  "virtualbox.exe": "virtualbox",
  "vmware.exe": "vmware",
  "anydesk.exe": "anydesk",
  "teamviewer.exe": "teamviewer",
};

/** Ejecutables sin logo de marca disponible en Simple Icons — utilidades
    del propio Windows sin "producto" con marca (Notepad, Snipping Tool,
    búsqueda, Copilot), o marcas que Simple Icons retiró (VS Code,
    Visual Studio, PowerShell, Windows Terminal, cmd — ver comentario de
    EXE_ICON_SLUG). En vez de caer siempre al Monitor neutro se usa un
    icono genérico algo más descriptivo de qué hace la herramienta.
    Añadido/revisado tras el registro real de actividad (Gean Paul,
    2026-09-15). */
const EXE_ICON_FALLBACK: Record<string, Icon> = {
  "notepad.exe": DocumentText,
  "snippingtool.exe": Gallery,
  "screenclippinghost.exe": Gallery,
  "searchhost.exe": SearchNormal1,
  "m365copilot.exe": Magicpen,
  "code.exe": Code,
  "devenv.exe": Code,
  "powershell.exe": Code,
  "windowsterminal.exe": Code,
  "cmd.exe": Code,
};

const NAVEGADORES = new Set(["chrome.exe", "firefox.exe", "msedge.exe", "brave.exe", "opera.exe", "vivaldi.exe", "chromium.exe"]);

/**
 * Apps WEB reconocidas por el TÍTULO de la ventana cuando el proceso es un
 * navegador — sin esto, "n8n", "Hostinger", "Vercel"... todo lo abierto en
 * Chrome se veía con el mismo logo de Chrome, sin poder distinguir una
 * pestaña de otra. Coincidencia por palabra clave (primera que encaje
 * gana), curada con los sitios que más aparecen en el registro real de
 * actividad (Gean Paul, 2026-09-15) — no pretende cubrir todo. EspoCRM y
 * ChatGPT se quedan sin logo a propósito: Simple Icons no tiene una marca
 * real para ninguno de los dos todavía.
 */
const WEB_APP_KEYWORD_SLUG: [string, string][] = [
  ["n8n", "n8n"],
  ["hojas de cálculo de google", "googlesheets"],
  ["google sheets", "googlesheets"],
  ["documentos de google", "googledocs"],
  ["google docs", "googledocs"],
  ["hostinger", "hostinger"],
  ["vercel", "vercel"],
  ["portainer", "portainer"],
  ["chatwoot", "chatwoot"],
  ["whatsapp", "whatsapp"],
];

function slugParaTitulo(windowTitle: string): string | undefined {
  const t = windowTitle.toLowerCase();
  const match = WEB_APP_KEYWORD_SLUG.find(([kw]) => t.includes(kw));
  return match?.[1];
}

function slugParaApp(applicationName: string): string | undefined {
  return EXE_ICON_SLUG[applicationName.trim().toLowerCase()];
}

export function AppIcon({
  applicationName,
  windowTitle,
  className = "size-4 shrink-0",
}: {
  applicationName: string;
  /** Título de la ventana/pestaña — opcional; sin él solo se distingue
      por ejecutable (comportamiento anterior), igual que necesita el
      gráfico de distribución de apps, que agrega todo un día por
      ejecutable y no tiene un único título que mirar. */
  windowTitle?: string | null;
  className?: string;
}) {
  const [fallo, setFallo] = useState(false);
  const exeLower = applicationName.trim().toLowerCase();
  const tituloLower = (windowTitle || "").toLowerCase();

  // Kelatos es la propia app — logo local, no depende de Simple Icons.
  if (tituloLower.includes("kelatos")) {
    // eslint-disable-next-line @next/next/no-img-element -- icono pequeño de tamaño variable (className), no encaja bien con next/image
    return <img src="/logos/kelatos-icono.png" alt="" className={className} />;
  }

  const slugWeb = windowTitle && NAVEGADORES.has(exeLower) ? slugParaTitulo(windowTitle) : undefined;
  const slug = slugWeb || slugParaApp(applicationName);

  if (!slug || fallo) {
    const Fallback = EXE_ICON_FALLBACK[exeLower] || Monitor;
    return <Fallback className={`${className} text-muted-foreground`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- icono pequeño de tamaño variable (className), no encaja bien con next/image
    <img
      src={`/logos/brands/${slug}.svg`}
      alt=""
      className={className}
      onError={() => setFallo(true)}
    />
  );
}
