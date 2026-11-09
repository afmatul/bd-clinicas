# Módulo `laboratorio`

Solo lo tiene el **Laboratorio clínico**, que usa **MongoDB**. Desde otra institución, cualquier ruta
`/api/laboratorio/*` responde 404 (el `SesionGuard` revisa los módulos habilitados de la institución).

## Modelo de documentos

| Colección | Qué guarda |
| --- | --- |
| `tipos_examen` | Catálogo: un documento por tipo (`_id` = clave) con sus campos, unidades, rangos de referencia y límites críticos. La web arma el formulario de captura desde aquí. |
| `examenes` | Un documento por examen: código, `paciente_id`, tipo, estado, firmas (`capturado_por`, `validado_por`) y `resultados`. |
| `contadores` | Consecutivo mensual del código (`LAB-2026-11-0412`), con `$inc` atómico. |

`resultados` cambia de forma según el tipo, y el `$jsonSchema` de `infra/db/laboratorio/mongo-init.js` valida cada forma con `oneOf`:

```js
// hematologia: plano y numérico
{ hemoglobina: 13.8, hematocrito: 41.2, leucocitos: 11.8, plaquetas: 245, neutrofilos: 72, linfocitos: 21 }
// orina: subdocumentos con valores mixtos
{ fisico: { color: 'Amarillo', aspecto: 'Ligeramente turbio', densidad: 1.02 },
  quimico: { ph: 6, proteinas: 'Trazas', nitritos: 'Positivo' },
  sedimento: { leucocitos: 12, bacterias: 'Moderadas' } }
// urocultivo: arreglo embebido
{ crecimiento: true, organismo: 'Escherichia coli', recuento_ufc: 150000,
  antibiograma: [{ antibiotico: 'Ciprofloxacino', interpretacion: 'R' }] }
// quimica: panel variable
{ valores: [{ analito: 'potasio', valor: 6.4, unidad: 'mmol/L' }, …] }
```

El listado une cada examen con su paciente en el servidor con `$lookup` (sin traer alergias ni antecedentes).

## Capas

- `domain/catalogo.ts`: los cuatro tipos y sus rangos (fuente del seed).
- `domain/examen.ts`: arma el documento de cada tipo a partir del formulario, interpreta cada valor (normal, alto, bajo, crítico, anormal) y decide si el examen trae un valor crítico. Un examen validado ya no se puede cambiar.
- `application/casos-de-uso.ts`: roles, bitácora (`LEER`, `CREAR`, `MODIFICAR`) y nombre de quien firma (lo pide al módulo identidad).
- `adapters/mongo/`: repositorio y semilla. Los números se guardan como `double` porque así lo pide el esquema.
- `adapters/http/laboratorio.controller.ts`: rutas.

Como solo hay adaptador para MongoDB, el módulo arma su propio mapa motor → repositorio en
`laboratorio.module.ts` en lugar de sumarlo a `RegistroDeAdaptadores`; la elección sigue saliendo de la institución de la sesión.

## Rutas

| Método | Ruta | Rol | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/laboratorio/tipos` | Médico, enfermería, recepción | Catálogo para el formulario |
| GET | `/api/laboratorio/examenes?tipo=&estado=&idPaciente=` | Médico, enfermería, recepción | Lista con paciente, conteo de 48 h y críticos |
| GET | `/api/laboratorio/examenes/:id` | Médico, enfermería, recepción | Detalle con secciones interpretadas (bitácora `LEER`) |
| POST | `/api/laboratorio/examenes` | Médico, enfermería, recepción | Registra la muestra: queda `PENDIENTE` |
| PUT | `/api/laboratorio/examenes/:id/resultados` | Médico (químico biólogo) | Captura o corrige: queda `EN_PROCESO` |
| POST | `/api/laboratorio/examenes/:id/validar` | Médico (químico biólogo) | `EN_PROCESO` → `VALIDADO` |

## Base existente

`mongo-init.js` solo corre al crear el volumen. Si ya tenía levantado MongoDB antes de este módulo, recree
el volumen para que tome el nuevo esquema de `examenes` y luego corra el seed:

```bash
docker compose rm -sfv mongo && docker volume rm $(docker volume ls -q | grep mongo-data)
docker compose up -d mongo && npm run db:seed
```
