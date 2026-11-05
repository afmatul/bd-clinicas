# Módulo `prescripcion`

- **Entidades:** receta, receta_detalle, medicamento.
- **Operaciones:** catálogo de medicamentos de la institución, recetas del paciente (todas o solo vigentes), alertas de alergia para `atencion`.
- **Dónde aplica:** todas las instituciones.
- **Adaptadores:** postgres, mysql, mongo, couch.

Las recetas se **emiten** al cerrar la consulta, dentro de la misma unidad atómica del módulo `atencion` (transacción en SQL, un solo documento en Mongo y Couch). Este módulo las **lee** y expone su capa application (`PRESCRIPCION`) para que `atencion` valide los medicamentos contra el catálogo y revise alergias.

## Reglas (domain/receta.ts)

- Cantidad sugerida: tomas por día × días (cada 24 h por 90 días → 90).
- Alerta de alergia: la alergia apunta al medicamento por id, o su descripción contiene el nombre del medicamento (sin acentos ni mayúsculas).
- Vigente: hasta el último día del renglón más largo.

## Datos por motor

| Motor | Medicamentos | Recetas |
| --- | --- | --- |
| PostgreSQL | tabla `medicamento` (con concentración) | `receta` + `receta_detalle` ligadas a tratamiento → diagnóstico → consulta |
| MySQL | tabla `medicamento` (sin concentración en el ER) | igual que PostgreSQL |
| MongoDB | colección `medicamentos` | embebidas en `consultas.diagnosticos[].tratamientos[].receta`, con copia del nombre del medicamento |
| CouchDB | documentos `medicamento:<uuid>` | embebidas en el documento `consulta:<uuid>` |

## API

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/medicamentos?q=` | Catálogo (búsqueda sin acentos). |
| GET | `/recetas?paciente=&vigentes=true` | Recetas del paciente; deja rastro de lectura en la bitácora. |
