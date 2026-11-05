-- Centro médico pediátrico · MySQL 8 (InnoDB)
-- Modelo relacional final de la Entrega I. No modificar sin actualizar el ER.

CREATE TABLE pediatra (
  id_usuario       INT AUTO_INCREMENT PRIMARY KEY,
  nombres          VARCHAR(150) NOT NULL,
  apellidos        VARCHAR(150) NOT NULL,
  numero_colegiado VARCHAR(30)  NOT NULL UNIQUE
) ENGINE = InnoDB;

CREATE TABLE paciente (
  id_paciente      INT AUTO_INCREMENT PRIMARY KEY,
  cui              VARCHAR(20) UNIQUE,
  nombres          VARCHAR(150) NOT NULL,
  apellidos        VARCHAR(150) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  edad             INT,
  sexo             VARCHAR(20),
  tipo_sangre      VARCHAR(5),
  direccion        VARCHAR(255),
  estado           VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  CHECK (estado IN ('ACTIVO', 'BAJA')),
  INDEX paciente_apellidos_idx (apellidos)
) ENGINE = InnoDB;

CREATE TABLE responsable (
  id_responsable  INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente     INT NOT NULL,
  nombre_completo VARCHAR(150) NOT NULL,
  cui             VARCHAR(20),
  parentesco      VARCHAR(50),
  direccion       VARCHAR(255),
  es_tutor_legal  BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE responsable_telefono (
  id_telefono    INT AUTO_INCREMENT PRIMARY KEY,
  id_responsable INT NOT NULL,
  telefono       VARCHAR(20) NOT NULL,
  FOREIGN KEY (id_responsable) REFERENCES responsable (id_responsable) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE medicion_crecimiento (
  id_medicion          INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente          INT NOT NULL,
  fecha_medicion       DATE NOT NULL,
  peso_kg              DECIMAL(5, 2),
  talla_cm             DECIMAL(5, 2),
  perimetro_cefalico_cm DECIMAL(5, 2),
  observaciones        TEXT,
  percentil_peso_edad  DECIMAL(5, 2),
  percentil_talla_edad DECIMAL(5, 2),
  percentil_peso_talla DECIMAL(5, 2),
  UNIQUE KEY medicion_paciente_fecha_uq (id_paciente, fecha_medicion),
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente)
) ENGINE = InnoDB;

CREATE TABLE vacuna (
  id_vacuna     INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL UNIQUE,
  dosis_totales INT NOT NULL CHECK (dosis_totales > 0)
) ENGINE = InnoDB;

CREATE TABLE historial_vacunacion (
  id_dosis            INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente         INT NOT NULL,
  id_vacuna           INT NOT NULL,
  numero_dosis        INT NOT NULL CHECK (numero_dosis > 0),
  fecha_aplicacion    DATE NOT NULL,
  lote                INT,
  fecha_proxima_dosis DATE,
  observaciones       TEXT,
  UNIQUE KEY dosis_esquema_uq (id_paciente, id_vacuna, numero_dosis),
  INDEX proxima_dosis_idx (fecha_proxima_dosis),
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente),
  FOREIGN KEY (id_vacuna) REFERENCES vacuna (id_vacuna)
) ENGINE = InnoDB;

CREATE TABLE antecedente (
  id_antecedente INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente    INT NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente)
) ENGINE = InnoDB;

CREATE TABLE medicamento (
  id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  presentacion   VARCHAR(100)
) ENGINE = InnoDB;

CREATE TABLE alergia (
  id_alergia     INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente    INT NOT NULL,
  id_medicamento INT,
  tipo           VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  severidad      VARCHAR(30),
  CHECK (severidad IN ('LEVE', 'MODERADA', 'SEVERA')),
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente),
  FOREIGN KEY (id_medicamento) REFERENCES medicamento (id_medicamento)
) ENGINE = InnoDB;

CREATE TABLE cita (
  id_cita     INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL,
  id_pediatra INT NOT NULL,
  fecha       DATE NOT NULL,
  hora        TIMESTAMP NOT NULL,
  motivo      VARCHAR(255),
  estado      VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
  -- MySQL no tiene índices parciales: la columna generada solo vale para citas activas,
  -- y UNIQUE ignora los NULL, así que una cita cancelada libera el horario.
  horario_activo VARCHAR(40) AS (
    IF(estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA'), CONCAT(id_pediatra, '|', hora), NULL)
  ) STORED,
  CHECK (estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA')),
  UNIQUE KEY cita_pediatra_horario_uq (horario_activo),
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente),
  FOREIGN KEY (id_pediatra) REFERENCES pediatra (id_usuario)
) ENGINE = InnoDB;

CREATE TABLE consulta (
  id_consulta                INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente                INT NOT NULL,
  id_cita                    INT,
  id_pediatra                INT NOT NULL,
  fecha                      DATE NOT NULL,
  hora                       TIME NOT NULL,
  motivo_consulta            TEXT,
  historia_enfermedad_actual TEXT,
  notas_evolucion            TEXT,
  observaciones              TEXT,
  INDEX consulta_paciente_fecha_idx (id_paciente, fecha),
  FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente),
  FOREIGN KEY (id_cita) REFERENCES cita (id_cita),
  FOREIGN KEY (id_pediatra) REFERENCES pediatra (id_usuario)
) ENGINE = InnoDB;

CREATE TABLE signos_vitales (
  id_signos_vitales       INT AUTO_INCREMENT PRIMARY KEY,
  id_consulta             INT NOT NULL,
  presion_sistolica       INT,
  presion_diastolica      INT,
  frecuencia_cardiaca     INT,
  frecuencia_respiratoria INT,
  saturacion_oxigeno      INT CHECK (saturacion_oxigeno BETWEEN 0 AND 100),
  temperatura_c           DECIMAL(4, 1),
  FOREIGN KEY (id_consulta) REFERENCES consulta (id_consulta)
) ENGINE = InnoDB;

CREATE TABLE diagnostico (
  id_diagnostico                         INT AUTO_INCREMENT PRIMARY KEY,
  id_consulta                            INT NOT NULL,
  tipo                                   VARCHAR(100) NOT NULL,
  observaciones                          TEXT,
  diagnostico_final_enfermedad_detectada TEXT,
  FOREIGN KEY (id_consulta) REFERENCES consulta (id_consulta)
) ENGINE = InnoDB;

CREATE TABLE tratamiento (
  id_tratamiento INT AUTO_INCREMENT PRIMARY KEY,
  id_diagnostico INT NOT NULL,
  tipo           VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  indicaciones   TEXT,
  fecha_inicio   DATE,
  fecha_fin      DATE,
  FOREIGN KEY (id_diagnostico) REFERENCES diagnostico (id_diagnostico)
) ENGINE = InnoDB;

CREATE TABLE receta (
  id_receta      INT AUTO_INCREMENT PRIMARY KEY,
  id_tratamiento INT NOT NULL,
  id_pediatra    INT NOT NULL,
  fecha_emision  DATE NOT NULL,
  observaciones  TEXT,
  FOREIGN KEY (id_tratamiento) REFERENCES tratamiento (id_tratamiento),
  FOREIGN KEY (id_pediatra) REFERENCES pediatra (id_usuario)
) ENGINE = InnoDB;

CREATE TABLE receta_detalle (
  id_receta_detalle  INT AUTO_INCREMENT PRIMARY KEY,
  id_receta          INT NOT NULL,
  id_medicamento     INT NOT NULL,
  dosis              VARCHAR(100) NOT NULL,
  via_administracion VARCHAR(50),
  frecuencia_horas   INT,
  duracion_dias      INT,
  cantidad           INT,
  indicaciones       TEXT,
  FOREIGN KEY (id_receta) REFERENCES receta (id_receta),
  FOREIGN KEY (id_medicamento) REFERENCES medicamento (id_medicamento)
) ENGINE = InnoDB;
