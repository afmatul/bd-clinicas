-- Hospital general · PostgreSQL
-- Modelo relacional final de la Entrega I (19 tablas). No modificar sin actualizar el ER.

CREATE TABLE medico (
  id_medico        SERIAL PRIMARY KEY,
  nombres          VARCHAR(150) NOT NULL,
  apellidos        VARCHAR(150) NOT NULL,
  numero_colegiado VARCHAR(30)  NOT NULL UNIQUE
);

CREATE TABLE departamento (
  id_departamento      SERIAL PRIMARY KEY,
  nombre               VARCHAR(150) NOT NULL UNIQUE,
  ubicacion            VARCHAR(255),
  extension_telefonica VARCHAR(20)
);

CREATE TABLE especialidad (
  id_especialidad SERIAL PRIMARY KEY,
  id_departamento INTEGER NOT NULL REFERENCES departamento (id_departamento),
  nombre          VARCHAR(150) NOT NULL UNIQUE,
  descripcion     TEXT
);

CREATE TABLE medico_especialidad (
  id_medico       INTEGER NOT NULL REFERENCES medico (id_medico),
  id_especialidad INTEGER NOT NULL REFERENCES especialidad (id_especialidad),
  PRIMARY KEY (id_medico, id_especialidad)
);

CREATE TABLE paciente (
  id_paciente      SERIAL PRIMARY KEY,
  id_medico_baja   INTEGER REFERENCES medico (id_medico),
  cui              VARCHAR(20) UNIQUE,
  nombres          VARCHAR(150) NOT NULL,
  apellidos        VARCHAR(150) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  edad             INTEGER,
  sexo             VARCHAR(20),
  tipo_sangre      VARCHAR(5),
  direccion        VARCHAR(255),
  estado           VARCHAR(30) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'BAJA')),
  fecha_baja       DATE,
  motivo_baja      TEXT,
  procedencia      VARCHAR(150),
  -- Una baja lógica exige fecha y motivo.
  CHECK (estado <> 'BAJA' OR (fecha_baja IS NOT NULL AND motivo_baja IS NOT NULL))
);
CREATE INDEX paciente_apellidos_idx ON paciente (apellidos);

CREATE TABLE paciente_telefono (
  id_telefono SERIAL PRIMARY KEY,
  id_paciente INTEGER NOT NULL REFERENCES paciente (id_paciente) ON DELETE CASCADE,
  telefono    VARCHAR(20) NOT NULL
);

CREATE TABLE paciente_email (
  id_email    SERIAL PRIMARY KEY,
  id_paciente INTEGER NOT NULL REFERENCES paciente (id_paciente) ON DELETE CASCADE,
  email       VARCHAR(150) NOT NULL
);

CREATE TABLE contacto_emergencia (
  id_contacto     SERIAL PRIMARY KEY,
  id_paciente     INTEGER NOT NULL REFERENCES paciente (id_paciente) ON DELETE CASCADE,
  nombre_completo VARCHAR(150) NOT NULL,
  parentesco      VARCHAR(50)
);

CREATE TABLE contacto_emergencia_telefono (
  id_telefono SERIAL PRIMARY KEY,
  id_contacto INTEGER NOT NULL REFERENCES contacto_emergencia (id_contacto) ON DELETE CASCADE,
  telefono    VARCHAR(20) NOT NULL
);

CREATE TABLE perfil_social (
  id_perfil_social  SERIAL PRIMARY KEY,
  id_paciente       INTEGER NOT NULL UNIQUE REFERENCES paciente (id_paciente),
  estado_civil      VARCHAR(30),
  ocupacion         VARCHAR(150),
  escolaridad       VARCHAR(100),
  tipo_vivienda     VARCHAR(100),
  servicios_basicos VARCHAR(255),
  vicios            VARCHAR(255),
  personas_a_cargo  VARCHAR(50),
  ingreso_familiar  NUMERIC(10, 2),
  raza              VARCHAR(100),
  religion          VARCHAR(100)
);

CREATE TABLE antecedente (
  id_antecedente SERIAL PRIMARY KEY,
  id_paciente    INTEGER NOT NULL REFERENCES paciente (id_paciente),
  tipo           VARCHAR(100) NOT NULL,
  descripcion    TEXT
);

CREATE TABLE medicamento (
  id_medicamento SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  presentacion   VARCHAR(100),
  concentracion  VARCHAR(100)
);

CREATE TABLE alergia (
  id_alergia     SERIAL PRIMARY KEY,
  id_paciente    INTEGER NOT NULL REFERENCES paciente (id_paciente),
  id_medicamento INTEGER REFERENCES medicamento (id_medicamento),
  tipo           VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  severidad      VARCHAR(30) CHECK (severidad IN ('LEVE', 'MODERADA', 'SEVERA'))
);

CREATE TABLE cita (
  id_cita         SERIAL PRIMARY KEY,
  id_paciente     INTEGER NOT NULL REFERENCES paciente (id_paciente),
  id_medico       INTEGER NOT NULL REFERENCES medico (id_medico),
  id_especialidad INTEGER REFERENCES especialidad (id_especialidad),
  fecha           DATE NOT NULL,
  hora            TIME NOT NULL,
  motivo          VARCHAR(255),
  estado          VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA'
    CHECK (estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA'))
);
-- Un médico no puede tener dos citas activas a la misma hora.
CREATE UNIQUE INDEX cita_medico_horario_uq ON cita (id_medico, fecha, hora)
  WHERE estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA');

CREATE TABLE consulta (
  id_consulta                SERIAL PRIMARY KEY,
  id_paciente                INTEGER NOT NULL REFERENCES paciente (id_paciente),
  id_cita                    INTEGER REFERENCES cita (id_cita),
  id_medico                  INTEGER NOT NULL REFERENCES medico (id_medico),
  fecha                      DATE NOT NULL,
  hora                       TIME NOT NULL,
  motivo_consulta            TEXT,
  historia_enfermedad_actual TEXT,
  notas_evolucion            TEXT,
  peso_kg                    NUMERIC(5, 2),
  talla_cm                   NUMERIC(5, 2),
  observaciones              TEXT
);
CREATE INDEX consulta_paciente_fecha_idx ON consulta (id_paciente, fecha);

CREATE TABLE signos_vitales (
  id_signos_vitales       SERIAL PRIMARY KEY,
  id_consulta             INTEGER NOT NULL REFERENCES consulta (id_consulta),
  presion_sistolica       INTEGER CHECK (presion_sistolica BETWEEN 40 AND 300),
  presion_diastolica      INTEGER CHECK (presion_diastolica BETWEEN 20 AND 200),
  frecuencia_cardiaca     INTEGER CHECK (frecuencia_cardiaca BETWEEN 20 AND 250),
  frecuencia_respiratoria INTEGER CHECK (frecuencia_respiratoria BETWEEN 4 AND 80),
  saturacion_oxigeno      INTEGER CHECK (saturacion_oxigeno BETWEEN 0 AND 100),
  temperatura_c           NUMERIC(4, 1) CHECK (temperatura_c BETWEEN 30 AND 45)
);

CREATE TABLE diagnostico (
  id_diagnostico                        SERIAL PRIMARY KEY,
  id_consulta                           INTEGER NOT NULL REFERENCES consulta (id_consulta),
  tipo                                  VARCHAR(100) NOT NULL,
  observaciones                         TEXT,
  diagnostico_final_enfermedad_detectada TEXT
);

CREATE TABLE tratamiento (
  id_tratamiento SERIAL PRIMARY KEY,
  id_diagnostico INTEGER NOT NULL REFERENCES diagnostico (id_diagnostico),
  tipo           VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  indicaciones   TEXT,
  fecha_inicio   DATE,
  fecha_fin      DATE,
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE receta (
  id_receta      SERIAL PRIMARY KEY,
  id_tratamiento INTEGER NOT NULL REFERENCES tratamiento (id_tratamiento),
  id_medico      INTEGER NOT NULL REFERENCES medico (id_medico),
  fecha_emision  DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones  TEXT
);

CREATE TABLE receta_detalle (
  id_receta_detalle  SERIAL PRIMARY KEY,
  id_receta          INTEGER NOT NULL REFERENCES receta (id_receta),
  id_medicamento     INTEGER NOT NULL REFERENCES medicamento (id_medicamento),
  dosis              VARCHAR(100) NOT NULL,
  via_administracion VARCHAR(50),
  frecuencia_horas   INTEGER CHECK (frecuencia_horas > 0),
  duracion_dias      INTEGER CHECK (duracion_dias > 0),
  cantidad           INTEGER CHECK (cantidad > 0),
  indicaciones       TEXT
);
