import { z } from 'zod';

const Env = z.object({
  API_PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres.'),
  PLATAFORMA_DATABASE_URL: z.string().url(),
  HOSPITAL_DATABASE_URL: z.string().url(),
  PEDIATRICO_DATABASE_URL: z.string().url(),
  LABORATORIO_MONGO_URL: z.string().url(),
  ODONTOLOGICA_COUCH_URL: z.string().url(),
  ODONTOLOGICA_COUCH_DB: z.string().default('odontologica'),
  COUCH_ADMIN_URL: z.string().url().optional(),
  ODONTOLOGICA_DB_PASSWORD: z.string().optional(),
});
export type Env = z.infer<typeof Env>;

export function cargarEnv(): Env {
  const r = Env.safeParse(process.env);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas. Copie .env.example a .env.\n${detalle}`);
  }
  return r.data;
}
