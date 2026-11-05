# Módulo `agenda`

- **Entidades:** cita
- **Operaciones:** agenda de un médico por día o semana, horarios libres, agendar sin choque de horario, confirmar, cancelar, inasistencias, próximas citas del paciente.
- **Dónde aplica:** todas las instituciones.
- **Adaptadores:** postgres, mysql, mongo, couch.

## Reglas (domain/cita.ts)

- Jornada de 07:00 a 16:30 en bloques de 30 minutos (`HORARIOS` en `@red-clinica/shared`); no se agenda en el pasado ni en domingo.
- Transiciones: PROGRAMADA → CONFIRMADA → EN_CONSULTA → ATENDIDA; desde PROGRAMADA o CONFIRMADA también CANCELADA o NO_ASISTIO. EN_CONSULTA y ATENDIDA solo las pone el módulo `atencion` (al abrir y al cerrar la consulta).
- Una cita cancelada o con inasistencia libera el horario.

## Choque de horario: lo garantiza cada motor

| Motor | Mecanismo |
| --- | --- |
| PostgreSQL | Índice único parcial `cita_medico_horario_uq (id_medico, fecha, hora) WHERE estado activo` → error 23505. |
| MySQL | Columna generada `horario_activo` (NULL si la cita no está activa) + `UNIQUE` → `ER_DUP_ENTRY`. |
| MongoDB | Índice único parcial `{ medico_id, fecha, hora }` sobre citas activas → error 11000. |
| CouchDB | `_id` determinista `cita:<medico>:<fecha>T<hora>` → 409. Si el horario lo tenía una cita cancelada, se archiva con otro `_id` y se reutiliza. |

Los cambios de estado llevan el estado esperado en el filtro (`WHERE estado IN …`, `updateOne({estado: {$in}})`, `_rev` en Couch), así que dos usuarios no pisan el cambio del otro.

## API

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/agenda?idMedico=&desde=&hasta=` | Citas del médico en el rango (por omisión, el médico de la sesión). |
| GET | `/agenda/disponibilidad?idMedico=&fecha=` | Horarios libres. |
| GET | `/agenda/paciente/:id` | Próximas citas activas del paciente. |
| GET | `/agenda/inasistencias?desde=&hasta=` | Reporte de inasistencias. |
| GET | `/agenda/citas/:id` | Una cita. |
| POST | `/agenda/citas` | Agendar (409 si el horario está ocupado). |
| PATCH | `/agenda/citas/:id/estado` | `CONFIRMADA`, `CANCELADA` o `NO_ASISTIO`. |

Altas y cambios de estado escriben en la bitácora desde el caso de uso.
