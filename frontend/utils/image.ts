// Images adaptées à l'écran : pour une image de la médiathèque (WebP), le serveur fabrique à la demande des versions réduites.
// Un téléphone télécharge ainsi ~40 Ko au lieu de ~400 Ko pour la grande photo d'accueil.
const WIDTHS = [480, 800, 1280, 1600] as const;
const ELIGIBLE = /^\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/;

/** `srcset` d'une image de la médiathèque, ou `undefined` pour une image provisoire / externe. */
export function responsiveSrcset(url: string | null | undefined): string | undefined {
  if (!url || !ELIGIBLE.test(url)) return undefined;
  return [...WIDTHS.map((w) => `/api/image?src=${url}&w=${w} ${w}w`), `${url} 2000w`].join(', ');
}
