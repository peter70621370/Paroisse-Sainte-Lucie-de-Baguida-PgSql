import sanitizeHtml from 'sanitize-html';

/**
 * Nettoie le HTML produit par l'éditeur riche avant enregistrement (protection XSS).
 * Seules les balises de mise en forme courantes sont conservées : pas de script, iframe, style, ni attributs d'événement.
 */
export const cleanHtml = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr', 'code', 'pre'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer nofollow', ...(attribs.target ? { target: '_blank' } : {}) },
      }),
    },
  });
