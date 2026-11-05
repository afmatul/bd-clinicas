# Módulo `personal`

- **Entidades:** medico (hospital), pediatra (pediátrico), personal (laboratorio y odontológica); departamento, especialidad y medico_especialidad solo en el hospital.
- **Adaptadores:** postgres, mysql, mongo, couch.

| Ruta | Quién | Qué hace |
| --- | --- | --- |
| `GET /directorio/:institucion?q=&especialidad=` | Público, sin sesión | Directorio de profesionales de una institución. |
| `GET /personal?q=&especialidad=` | Sesión | Lo mismo para la institución del usuario (selector de médico en agenda). |
| `GET /personal/yo` | Sesión | Profesional vinculado al usuario (`usuario.id_personal`). |
| `GET /personal/especialidades` | Sesión | Catálogo (hospital); Pediatría (pediátrico); nombres distintos (Mongo, Couch). |
| `GET /personal/departamentos` | Sesión | Departamentos con sus especialidades (solo hospital; vacío en las demás). |
| `GET /personal/:id` | Sesión | Un profesional. |
| `POST /personal` | ADMIN | Alta con especialidades, en una transacción en SQL. Bitácora: CREAR. |
| `PUT/DELETE /personal/:id/especialidades/:idEspecialidad` | ADMIN, hospital | Asigna o quita (tabla puente). Bitácora: MODIFICAR. |

Cómo se modela en cada motor:

- **PostgreSQL:** `json_agg` sobre `medico_especialidad` para traer médico y especialidades en una consulta.
- **MySQL:** `pediatra` no tiene especialidades; todos llevan la especialidad implícita `pediatria`.
- **MongoDB:** colección `personal`, especialidades embebidas como texto; el catálogo es `distinct('especialidades')`.
- **CouchDB:** documentos `personal:<uuid>` con `type: 'personal'`; búsqueda con Mango y `$regex` con `(*UTF8)`.
