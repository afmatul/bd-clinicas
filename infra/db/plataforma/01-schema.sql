-- Base plataforma · PostgreSQL (misma instancia que el hospital, otra base y otro usuario)
-- Guarda lo que es de la plataforma y no de una institución: instituciones, usuarios y bitácora.

CREATE TABLE institucion (
  id_institucion SERIAL PRIMARY KEY,
  clave          VARCHAR(30)  NOT NULL UNIQUE,       -- hospital, pediatrico, laboratorio, odontologia
  nombre         VARCHAR(150) NOT NULL,
  motor          VARCHAR(20)  NOT NULL CHECK (motor IN ('postgres', 'mysql', 'mongo', 'couch')),
  modulos        TEXT[]       NOT NULL DEFAULT '{}'  -- módulos habilitados
);

CREATE TABLE usuario (
  id_usuario        SERIAL PRIMARY KEY,
  username          VARCHAR(60)  NOT NULL UNIQUE,
  nombre            VARCHAR(150) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  id_institucion    INTEGER      NOT NULL REFERENCES institucion (id_institucion),
  rol               VARCHAR(20)  NOT NULL
    CHECK (rol IN ('RECEPCION', 'MEDICO', 'ENFERMERIA', 'TRABAJO_SOCIAL', 'AUDITOR', 'ADMIN')),
  id_personal       VARCHAR(64),                      -- id del médico/pediatra en la base de su institución
  intentos_fallidos INTEGER      NOT NULL DEFAULT 0,
  bloqueado_hasta   TIMESTAMPTZ,
  ultimo_acceso     TIMESTAMPTZ,
  activo            BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE bitacora (
  id_bitacora    BIGSERIAL PRIMARY KEY,
  momento        TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_usuario     INTEGER REFERENCES usuario (id_usuario),
  id_institucion INTEGER REFERENCES institucion (id_institucion),
  accion         VARCHAR(20) NOT NULL CHECK (accion IN ('LOGIN', 'LOGOUT', 'LEER', 'CREAR', 'MODIFICAR', 'BAJA', 'EXPORTAR')),
  entidad        VARCHAR(60),
  id_registro    VARCHAR(64),
  id_paciente    VARCHAR(64),
  ip             VARCHAR(45)
);
CREATE INDEX bitacora_paciente_idx ON bitacora (id_institucion, id_paciente, momento);

INSERT INTO institucion (clave, nombre, motor, modulos) VALUES
  ('hospital',    'Hospital general',         'postgres', '{identidad,pacientes,antecedentes,agenda,atencion,prescripcion,personal,auditoria}'),
  ('pediatrico',  'Centro médico pediátrico', 'mysql',    '{identidad,pacientes,antecedentes,agenda,atencion,prescripcion,personal,auditoria,pediatria}'),
  ('laboratorio', 'Laboratorio clínico',      'mongo',    '{identidad,pacientes,antecedentes,agenda,atencion,prescripcion,personal,auditoria,laboratorio}'),
  ('odontologia', 'Clínica odontológica',     'couch',    '{identidad,pacientes,antecedentes,agenda,atencion,prescripcion,personal,auditoria,odontologia}');
