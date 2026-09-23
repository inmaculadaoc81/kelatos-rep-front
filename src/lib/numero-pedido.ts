export const MENSAJE_NUMERO_PEDIDO_ENLACE =
  'El Nº de pedido no puede ser un enlace: pon el enlace en el campo Enlace (y en Nº de pedido escribe el número o "No informado")';

export function numeroPedidoEsEnlace(v: string | null | undefined): boolean {
  if (!v) return false;
  return /https?:\/\/|www\.|[a-z0-9-]+\.(com|es|net|org|eu|io|co|de|fr|it|uk|cn|shop|store)\/?/i.test(v);
}
