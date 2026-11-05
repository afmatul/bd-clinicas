import pg from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient, type Db } from 'mongodb';
import nano, { type DocumentScope } from 'nano';
import type { Env } from '../config/env.js';

// DATE de PostgreSQL como texto yyyy-mm-dd, sin conversión a zona horaria.
pg.types.setTypeParser(1082, (v) => v);

/**
 * Conexiones abiertas una sola vez al arrancar (pools en los relacionales, clientes en los documentales).
 * Cerrar sesión no cierra conexiones: invalida el token, porque la conexión es compartida.
 */
export interface Conexiones {
  plataforma: pg.Pool;
  postgres: pg.Pool;     // Hospital general
  mysql: mysql.Pool;     // Centro pediátrico
  mongo: Db;             // Laboratorio clínico
  couch: DocumentScope<unknown>; // Clínica odontológica
  cerrar(): Promise<void>;
}

export async function abrirConexiones(env: Env): Promise<Conexiones> {
  const plataforma = new pg.Pool({ connectionString: env.PLATAFORMA_DATABASE_URL, max: 5 });
  const postgres = new pg.Pool({ connectionString: env.HOSPITAL_DATABASE_URL, max: 10 });
  const mysqlPool = mysql.createPool({ uri: env.PEDIATRICO_DATABASE_URL, connectionLimit: 10, dateStrings: ['DATE'] });
  const mongoClient = new MongoClient(env.LABORATORIO_MONGO_URL);
  await mongoClient.connect();
  const couch = nano(env.ODONTOLOGICA_COUCH_URL).use(env.ODONTOLOGICA_COUCH_DB);

  return {
    plataforma,
    postgres,
    mysql: mysqlPool,
    mongo: mongoClient.db(),
    couch,
    async cerrar() {
      await Promise.allSettled([plataforma.end(), postgres.end(), mysqlPool.end(), mongoClient.close()]);
    },
  };
}
