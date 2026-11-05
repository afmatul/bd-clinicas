# Datos semilla

```bash
npm run db:reset   # borra los volúmenes, levanta Docker y carga todo desde cero (recomendado)
npm run db:seed    # carga sobre las bases que ya están levantadas
```

Las fechas se calculan desde el día en que se corre la semilla, así que **hoy siempre tiene agenda**. Con `SEED_HOY=2026-11-09 npm run db:seed` se fija otro "hoy" (útil para capturas de pantalla). Los datos son deterministas: la misma fecha produce los mismos pacientes, citas y resultados.

`db:seed` se puede correr varias veces. Catálogos, personal y usuarios se actualizan. El contenido clínico (citas, consultas, exámenes) solo se carga si esa base no tiene consultas o exámenes, porque los usuarios de la aplicación no tienen permiso de borrar. Para empezar de cero use `db:reset`.

## Qué se carga

| Base | Motor | Contenido |
| --- | --- | --- |
| Hospital general | PostgreSQL | 5 departamentos, 8 especialidades, 7 médicos, 28 medicamentos, 22 pacientes (2 de baja) con teléfonos, correos, contacto de emergencia, perfil social, antecedentes y alergias; ~90 citas y ~70 consultas con signos, diagnóstico CIE-10, tratamiento y receta. |
| Centro pediátrico | MySQL | 3 pediatras, 18 medicamentos pediátricos, 10 vacunas del esquema MSPAS, 16 niños de 3 meses a 11 años (1 de baja) con responsables, mediciones de crecimiento con percentiles OMS aproximados, historial de vacunación (con dosis vencidas), citas y consultas con dosis calculadas por peso. |
| Laboratorio clínico | MongoDB | 4 profesionales, catálogo de medicamentos, 4 tipos de examen con sus campos, 17 pacientes, ~37 exámenes (validados, en proceso y pendientes), citas de toma de muestra y consultas de interpretación. |
| Clínica odontológica | CouchDB | 4 personas (3 odontólogos y la secretaria), 10 medicamentos, 19 pacientes con odontograma FDI completo, ~48 consultas con procedimientos por pieza, citas de hoy, futuras e inasistencias. |
| Plataforma | PostgreSQL | 20 usuarios en las cuatro instituciones y ~700 filas de bitácora de los últimos 10 días hábiles. |

Las agendas de hoy reproducen el prototipo: Dra. Pérez (María José López 08:00 atendida, Carlos Ajú 08:30 en consulta, Sofía Hernández 09:00…), Dr. Castillo en la clínica dental (Diana Monterroso 09:00 limpieza, Kevin Orozco 09:30 extracción del 36…), Dr. Jorge Castillo en el pediátrico y la cola de trabajo del laboratorio (química de Sofía Hernández con potasio crítico de 6.4, hematología de Carlos Ajú, orina de Mateo Juárez, urocultivo de Rosa Gómez).

Coherencia clínica que se cuidó:

- Nadie recibe un medicamento al que es alérgico: la receta cambia a la alternativa (María José, alérgica a penicilina, recibe azitromicina; en la clínica dental, clindamicina).
- Las enfermedades crónicas tienen antecedente, controles cada 2–3 meses y exámenes acordes (diabéticos con glucosa y HbA1c altas, Sofía con creatinina elevada).
- Las vacunas siguen la edad del niño; Santiago (8 meses) tiene la tercera dosis de pentavalente y polio vencida, Luciana la segunda de VPH.
- El odontograma coincide con los procedimientos: cada pieza obturada, con endodoncia, corona o extraída en la clínica tiene su consulta.
- Un mismo CUI en dos instituciones es la misma persona (Mateo Juárez está en el pediátrico y en el laboratorio), pero cada institución guarda su propia copia.

## Usuarios (contraseña `RedClinica2026!`)

| Institución | Usuarios |
| --- | --- |
| Hospital general | `aperez`, `cmendez`, `snatareno`, `restrada` (médicos), `recepcion.hg`, `enfermeria.hg`, `tsocial.hg`, `auditor.hg`, `admin`. `lcontreras` está inactivo. |
| Centro pediátrico | `pediatra` (Dr. Jorge Castillo), `lmendoza`, `recepcion.ped`, `enfermeria.ped` |
| Laboratorio clínico | `laboratorio` (Lic. Marta Sic), `rgodoy`, `recepcion.lab` |
| Clínica odontológica | `secretaria`, `fcastillo`, `crosales` |

`id_personal` de cada usuario clínico apunta a su registro en la base de su institución (`medico.id_medico`, `pediatra.id_usuario`, `_id` de `personal` en Mongo o el uuid de `personal:<uuid>` en Couch).

## Forma de los documentos (MongoDB y CouchDB)

Los adaptadores de cada módulo leen estas formas. En Mongo los ids de paciente son `ObjectId` y los de personal se guardan como texto (hex); en Couch todas las referencias son el id sin prefijo.

**MongoDB · laboratorio**

```js
personal     { _id, nombres, apellidos, numero_colegiado, especialidades: [string], rol: 'MEDICO' | 'QUIMICO_BIOLOGO', activo }
medicamentos { _id, nombre, presentacion, concentracion }
tipos_examen { _id: clave, nombre, corto, muestra, campos: [...] }   ← catálogo del módulo (modules/laboratorio/domain/catalogo.ts)
pacientes    { ...ver PacienteDoc, contactos_emergencia: [{ nombre_completo, parentesco, telefonos }],
               alergias: [{ _id, tipo, descripcion, severidad, medicamento_id: ObjectId | null }], antecedentes: [{ _id, tipo, descripcion }] }
examenes     ← los crea el repositorio del módulo (ordenar → capturar → validar); forma en
               modules/laboratorio/adapters/mongo/examen-repository.ts (ExamenDoc) y $jsonSchema en infra/db/laboratorio/mongo-init.js
citas        { _id, paciente_id: ObjectId, medico_id: string, fecha: 'yyyy-mm-dd', hora: 'HH:mm', motivo, estado, creada_en: Date }
consultas    { _id, paciente_id: ObjectId, cita_id, medico_id, fecha: 'yyyy-mm-dd', hora, motivo_consulta, historia_enfermedad_actual,
               notas_evolucion, peso_kg, talla_cm, signos_vitales: { presion_sistolica, … },
               diagnosticos: [{ _id, tipo, enfermedad_detectada, observaciones,
                 tratamientos: [{ _id, tipo, descripcion, indicaciones, fecha_inicio, fecha_fin,
                   receta: { _id, fecha_emision, medico_id, renglones: [{ medicamento_id: ObjectId, nombre, dosis, via_administracion,
                     frecuencia_horas, duracion_dias, cantidad, indicaciones }] } | null }] }],
               cerrada: boolean, creada_en: Date }
```

**CouchDB · odontológica** (una base, campo `type`, `_id` = `<type>:<id>`)

```js
personal:<uuid>     { type: 'personal', nombres, apellidos, numero_colegiado, especialidades, rol: 'ODONTOLOGO' | 'SECRETARIA', activo }
medicamento:<uuid>  { type: 'medicamento', nombre, presentacion, concentracion }
paciente:<uuid>     { type: 'paciente', ...ver PacienteCouch, alergias: [{ id, tipo, descripcion, severidad, medicamento_id }],
                      odontograma: { '11': { estado: 'SANA' | 'CARIES' | 'OBTURADA' | 'AUSENTE' | 'CORONA' | 'ENDODONCIA', caras?: ['O','M','D','V','L'], nota? }, … '48' } }
cita:<medico_id>:<yyyy-mm-dd>T<HH:mm>
                    { type: 'cita', paciente_id, medico_id, fecha, hora, motivo, estado, creada_en: ISO }
consulta:<uuid>     { type: 'consulta', paciente_id, cita_id (sin prefijo), medico_id, fecha, hora, motivo_consulta, notas_evolucion,
                      signos_vitales, diagnosticos: [{ id, tipo, enfermedad_detectada, observaciones, tratamientos: [{ …, receta: { id, fecha_emision, medico_id, renglones } }] }],
                      procedimientos: [{ pieza: '36' | null, procedimiento, caras, estado_resultante, nota }], cerrada, creada_en: ISO }
```

## Archivos

- `util.ts`: fechas relativas a hoy, generador pseudoaleatorio con semilla, ids deterministas.
- `catalogos.ts`: medicamentos, casos clínicos de adultos y niños, esquema de vacunación, tablas OMS.
- `personas.ts`: pacientes adultos, niños con sus responsables y personal de cada institución.
- `plan.ts`: agenda sin choques de horario, signos vitales y recetas que respetan alergias.
- `hospital.ts`, `pediatrico.ts`, `laboratorio.ts`, `odontologica.ts`, `plataforma.ts`: escriben cada base.
