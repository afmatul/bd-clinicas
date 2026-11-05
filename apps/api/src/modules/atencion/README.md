# Módulo `atencion`

- **Entidades:** consulta, signos_vitales, diagnostico, tratamiento (y la receta que se emite al cerrar).
- **Operaciones:** abrir consulta (o retomar la que el médico dejó abierta), guardar borrador, cerrar consulta atómicamente, historial longitudinal del paciente.
- **Dónde aplica:** todas las instituciones.
- **Adaptadores:** postgres, mysql, mongo, couch.

## Flujo

1. `POST /consultas { idPaciente, idCita? }`: abre la consulta con la fecha y hora de Guatemala. Si viene de una cita, `agenda` la pasa a `EN_CONSULTA`. Si el médico ya tenía una consulta abierta con ese paciente, la retoma.
2. `PUT /consultas/:id/borrador`: guarda motivo e historia sin cerrar.
3. `POST /consultas/:id/cierre`: signos vitales, diagnósticos, tratamientos y recetas **en una sola unidad atómica**. Después, `agenda` marca la cita como `ATENDIDA`.
4. `GET /consultas?paciente=` y `GET /consultas/:id`: historial y detalle (dejan rastro de lectura en la bitácora).

## Reglas (domain/consulta.ts y contrato zod)

- Solo el médico que abrió la consulta la edita o la cierra; una consulta cerrada no se vuelve a editar.
- Al menos un diagnóstico; la diastólica debe ser menor que la sistólica; rangos de signos iguales a los CHECK del hospital, para que los cuatro motores rechacen lo mismo.
- Si un medicamento de la receta choca con una alergia del paciente (`prescripcion` lee las alergias por la capa application de `antecedentes`), el cierre responde 409 con `detalle.alertas` hasta que el médico confirme (`confirmarAlergias: true`).
- Sin cantidad escrita, se dispensa `ceil(24 / frecuencia × días)`.

## Cierre atómico por motor

| Motor | Cómo |
| --- | --- |
| PostgreSQL | `BEGIN` → `SELECT … FOR UPDATE` de la consulta → `UPDATE consulta` + `INSERT` en signos_vitales, diagnostico, tratamiento, receta y receta_detalle → `COMMIT`. Cualquier error hace `ROLLBACK`. |
| MySQL (InnoDB) | Igual, con `beginTransaction` / `commit` / `rollback`. La consulta pediátrica no guarda peso ni talla (van en `medicion_crecimiento`, módulo pediatria). |
| MongoDB | Un solo `updateOne({ _id, cerrada: { $ne: true } }, { $set: … })`: diagnósticos, tratamientos y receta van embebidos en el documento. |
| CouchDB | Una sola escritura del documento `consulta:<uuid>` con su `_rev`; un 409 se reintenta sobre la versión nueva y el design doc rechaza editar una consulta cerrada. |

En el ER relacional no hay columna de estado: una consulta está cerrada cuando tiene diagnóstico, y el `FOR UPDATE` evita que dos cierres simultáneos dupliquen diagnósticos.
