# Módulo `pediatria`

Solo Centro pediátrico (MySQL). Tablas: `medicion_crecimiento`, `vacuna`, `historial_vacunacion` (lee además `paciente`, `pediatra` y `responsable` del mismo esquema).

| Ruta | Rol | Qué hace |
| --- | --- | --- |
| `GET /api/pediatria/pacientes/:id` | MEDICO, ENFERMERIA | Curva de crecimiento, carné de vacunación, responsables y baja (con el pediatra que la registró). Deja `LEER` en la bitácora. |
| `POST /api/pediatria/pacientes/:id/mediciones` | MEDICO, ENFERMERIA | Medición con percentiles OMS. Una por día (UNIQUE). |
| `POST /api/pediatria/pacientes/:id/dosis` | MEDICO, ENFERMERIA | Dosis aplicada. En orden, sin pasar de las dosis totales (UNIQUE). |
| `GET /api/pediatria/vacunas` | + RECEPCION | Catálogo. |
| `GET /api/pediatria/dosis-vencidas?hasta=` | + RECEPCION, TRABAJO_SOCIAL | Última dosis de cada esquema incompleto con próxima dosis vencida (solo activos). |

Fuera del Centro pediátrico todas responden 404 (`@Modulo('pediatria')`).

## Reglas (domain/)

- **Percentiles:** patrones de crecimiento infantil de la OMS (método LMS, paquete `who-growth-standards`): peso/edad y talla/edad de 0 a 5 años; peso/longitud antes de los 2 años y peso/estatura de 2 a 5. Fuera de esos rangos se guardan los percentiles que escriba el pediatra (opcionales).
- **Mediciones:** ni futuras ni anteriores al nacimiento.
- **Dosis:** en orden (no la 3 sin la 2), sin repetir, sin pasar de `dosis_totales`; la próxima dosis va después de la aplicación y no existe en la última.
- **Carné:** COMPLETO, PENDIENTE, ATRASADA (la próxima dosis ya venció) o SIN_INICIAR.
- **Baja:** un expediente de baja se puede consultar pero no admite mediciones ni vacunas nuevas.

Como solo hay adaptador MySQL, `pediatria.module.ts` arma su propio mapa por motor en lugar de sumar un puerto opcional a `RepositoriosInstitucion`. Los datos de demostración están en `adapters/mysql/datos-demo.ts` (los llama `npm run db:seed`).
