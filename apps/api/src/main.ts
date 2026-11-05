import { cargarEnv } from './config/env.js';
import { abrirConexiones } from './infrastructure/conexiones.js';
import { construirApp } from './app.js';

const env = cargarEnv();
const conexiones = await abrirConexiones(env);
const app = await construirApp(env, conexiones);

const cerrar = async () => {
  await app.close();
  await conexiones.cerrar();
  process.exit(0);
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);

await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
