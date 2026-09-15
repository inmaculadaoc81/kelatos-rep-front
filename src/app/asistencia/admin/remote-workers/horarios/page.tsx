/** Misma página de Horarios que Administración — reutilizada, no
    duplicada. No hay "horario remoto" aparte (es el mismo calendario
    para todos, ver navegacion.tsx), solo necesita su propia URL dentro
    de /remote-workers/* para que el sidebar no salga de esa vista al
    entrar aquí. Petición del usuario, 2026-09-15: "cuando voy a horario
    en remote work, me lleva a horario en la vista local y el sidebar
    cambia". */
export { default } from "../../horarios/page";
