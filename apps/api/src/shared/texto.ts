const VARIANTES: Record<string, string> = {
  a: '[aáàäâ]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöô]', u: '[uúùüû]', n: '[nñ]',
};
const QUITAR_ACENTO: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', é: 'e', è: 'e', ë: 'e', ê: 'e', í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', ú: 'u', ù: 'u', ü: 'u', û: 'u', ñ: 'n',
};

/**
 * Patrón de expresión regular que ignora mayúsculas y acentos ("lopez" encuentra "López").
 * Sirve igual en PostgreSQL (~*), MongoDB ($regex) y CouchDB ($regex), para que la búsqueda
 * dé lo mismo en los cuatro motores; MySQL ya lo hace con su collation *_ai_ci.
 */
export function patronSinAcentos(texto: string): string {
  return [...texto.toLowerCase()]
    .map((c) => QUITAR_ACENTO[c] ?? c)
    .map((c) => VARIANTES[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
}
