#!/bin/bash
# Se ejecuta una sola vez al crear el volumen de PostgreSQL.
# Crea dos bases con usuarios separados: hospital (institución) y plataforma.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-SQL
  CREATE ROLE app_hospital LOGIN PASSWORD '${HOSPITAL_DB_PASSWORD}';
  CREATE ROLE app_plataforma LOGIN PASSWORD '${PLATAFORMA_DB_PASSWORD}';
  CREATE DATABASE hospital OWNER postgres;
  CREATE DATABASE plataforma OWNER postgres;
  REVOKE ALL ON DATABASE hospital FROM PUBLIC;
  REVOKE ALL ON DATABASE plataforma FROM PUBLIC;
  GRANT CONNECT ON DATABASE hospital TO app_hospital;
  GRANT CONNECT ON DATABASE plataforma TO app_plataforma;
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d hospital -f /schemas/hospital/01-schema.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d hospital <<-SQL
  -- El usuario de la app nunca borra: las bajas son lógicas.
  GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_hospital;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_hospital;
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d plataforma -f /schemas/plataforma/01-schema.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d plataforma <<-SQL
  GRANT SELECT ON institucion TO app_plataforma;
  GRANT SELECT, INSERT, UPDATE ON usuario TO app_plataforma;
  -- Bitácora solo de inserción.
  GRANT SELECT, INSERT ON bitacora TO app_plataforma;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_plataforma;
SQL
