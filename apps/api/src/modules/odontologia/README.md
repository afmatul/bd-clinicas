# Módulo `odontologia`

Solo Clínica odontológica (CouchDB). Las demás instituciones reciben 404 por `@Modulo('odontologia')`.

## Endpoints

| Método y ruta | Roles | Qué hace |
| --- | --- | --- |
| `GET /odontologia/recepcion` | RECEPCION, MEDICO, ENFERMERIA | Turnos de hoy (hora de Guatemala), odontólogos y siguiente turno libre. |
| `POST /odontologia/recepcion/registro-rapido` | RECEPCION, MEDICO | Crea el expediente mínimo (`registro_completo: false`) y, si se pide, le da el siguiente turno libre. Sin turno libre responde `turno: null`. |
| `POST /odontologia/recepcion/turnos/:id/llegada` | RECEPCION, ENFERMERIA | Guarda `llegada_en` en la cita (la pantalla la muestra "En sala de espera"). |
| `GET /odontologia/pacientes/:id/odontograma` | MEDICO, ENFERMERIA | Odontograma vigente (FDI 11–48) + historial de procedimientos de consultas cerradas. Deja rastro en la bitácora. |
| `PATCH /odontologia/pacientes/:id/odontograma` | MEDICO | Aplica cambios `{ cambios: { "36": { estado: "AUSENTE" } } }`. |

Contratos zod en `packages/shared/src/odontologia.ts`.

## Modelo en CouchDB (una base, campo `type`)

- `paciente:<uuid>` lleva embebido `odontograma: { "<pieza FDI>": { estado, caras?, nota? } }`. Cada cambio reescribe ese único documento con su `_rev`; ante un 409 se relee, se vuelven a evaluar las reglas y se reintenta.
- `cita:<medico_id>:<yyyy-mm-dd>T<HH:mm>`: el `_id` determinista hace que Couch rechace un segundo turno en el mismo horario. Si el ocupante está CANCELADA o NO_ASISTIO se copia a `cita:<uuid>` con `reemplazada_por` y se reutiliza el `_id` (en Couch no se borra). Misma forma que usa el módulo agenda.
- `consulta:<uuid>` con `procedimientos: [{ pieza, procedimiento, caras?, estado_resultante }]` alimenta el historial.
- `personal:<id>` con `rol: "ODONTOLOGO"` son los odontólogos de la recepción.
- Índices nuevos en `infra/db/odontologica/indices.json`: `type-fecha-hora` (turnos del día) y `type-paciente-fecha` (historial).

## Reglas (domain/)

- Turnos de 30 min de 08:00 a 16:30; el siguiente libre es el primero desde la hora actual; si dos odontólogos lo tienen libre, gana el que tiene menos turnos.
- Una pieza AUSENTE solo vuelve como CORONA (implante). CARIES y OBTURADA exigen caras; los demás estados no llevan caras.
- El nombre completo del registro rápido se divide en nombres y apellidos (dos nombres si hay cuatro palabras o más; "de", "del", "la" se quedan con el apellido).

## Pendiente

- Cuando el módulo agenda exporte sus casos de uso (token `AGENDA`), `CouchRecepcionRepository.agendar/turnosDelDia/marcarLlegada` deben delegar en ellos para que la regla del choque viva en un solo lugar.
- No hay pantalla de odontograma en el prototipo; la API queda lista para agregarla a la ficha del paciente.
