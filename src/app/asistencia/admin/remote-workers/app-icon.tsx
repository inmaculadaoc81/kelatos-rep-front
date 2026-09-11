"use client";

import { useState } from "react";
import { Monitor } from "@/lib/icons";

/**
 * Logo REAL de la app (color oficial de marca, via cdn.simpleicons.org)
 * para ejecutables reconocidos — nunca un icono generico puesto "porque
 * sí". Si el ejecutable no está en el mapa (o el logo falla al cargar),
 * cae a un icono neutro (Monitor) en vez de inventar una marca que no
 * corresponde. Mapa curado a mano con los ejecutables mas comunes en un
 * puesto de oficina/desarrollo — no pretende cubrir todo.
 */
const EXE_ICON_SLUG: Record<string, string> = {
  "chrome.exe": "googlechrome",
  "firefox.exe": "firefox",
  "msedge.exe": "microsoftedge",
  "brave.exe": "brave",
  "opera.exe": "opera",
  "vivaldi.exe": "vivaldi",
  "chromium.exe": "googlechrome",

  "outlook.exe": "microsoftoutlook",
  "teams.exe": "microsoftteams",
  "slack.exe": "slack",
  "discord.exe": "discord",
  "whatsapp.exe": "whatsapp",
  "telegram.exe": "telegram",
  "skype.exe": "skype",
  "zoom.exe": "zoom",
  "thunderbird.exe": "thunderbird",

  "code.exe": "visualstudiocode",
  "devenv.exe": "visualstudio",
  "windowsterminal.exe": "windowsterminal",
  "powershell.exe": "powershell",
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
  "canva.exe": "canva",

  "winword.exe": "microsoftword",
  "excel.exe": "microsoftexcel",
  "powerpnt.exe": "microsoftpowerpoint",
  "onenote.exe": "microsoftonenote",
  "onedrive.exe": "onedrive",
  "googledrivefs.exe": "googledrive",
  "dropbox.exe": "dropbox",

  "acrobat.exe": "adobeacrobatreader",
  "acrord32.exe": "adobeacrobatreader",
  "photoshop.exe": "adobephotoshop",
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

  "explorer.exe": "windows",
};

function slugParaApp(applicationName: string): string | undefined {
  return EXE_ICON_SLUG[applicationName.trim().toLowerCase()];
}

export function AppIcon({ applicationName, className = "size-4 shrink-0" }: { applicationName: string; className?: string }) {
  const slug = slugParaApp(applicationName);
  const [fallo, setFallo] = useState(false);

  if (!slug || fallo) {
    return <Monitor className={`${className} text-muted-foreground`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo de marca externo (Simple Icons), no un asset del proyecto
    <img
      src={`https://cdn.simpleicons.org/${slug}`}
      alt=""
      className={className}
      onError={() => setFallo(true)}
    />
  );
}
