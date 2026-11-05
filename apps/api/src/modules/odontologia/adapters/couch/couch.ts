/** Utilidades del adaptador CouchDB de odontología. */
export const estado = (err: unknown) => (err as { statusCode?: number }).statusCode;

/** get que devuelve null en 404 en lugar de lanzar. */
export async function leer<T>(db: { get(id: string): Promise<unknown> }, id: string): Promise<T | null> {
  try {
    return (await db.get(id)) as T;
  } catch (err) {
    if (estado(err) === 404) return null;
    throw err;
  }
}
