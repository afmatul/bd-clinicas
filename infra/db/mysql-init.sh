#!/bin/bash
# Se ejecuta una sola vez al crear el volumen de MySQL.
set -euo pipefail
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" pediatrico < /schemas/pediatrico/01-schema.sql
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<-SQL
  CREATE USER IF NOT EXISTS 'app_pediatrico'@'%' IDENTIFIED BY '${PEDIATRICO_DB_PASSWORD}';
  -- Sin DELETE: las bajas son lógicas.
  GRANT SELECT, INSERT, UPDATE ON pediatrico.* TO 'app_pediatrico'@'%';
  FLUSH PRIVILEGES;
SQL
