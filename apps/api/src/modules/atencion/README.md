# Módulo `atencion`

- **Entidades:** consulta, signos_vitales, diagnostico, tratamiento
- **Operaciones:** Abrir consulta, registrar signos y diagnósticos, cerrar consulta atómicamente, historial longitudinal
- **Dónde aplica:** Todas
- **Adaptadores:** postgres, mysql, mongo, couch

Estado: puertos definidos en `ports/`, sin casos de uso ni adaptadores todavía.

Para implementarlo siga el patrón de `modules/pacientes`:

1. Reglas puras en `domain/`.
2. Casos de uso en `application/` que reciben `ContextoInstitucion` y piden los repositorios con `registro.para(ctx)`.
3. Un adaptador por motor en `adapters/<motor>/`.
4. Sume el puerto a `RepositoriosInstitucion` en `infrastructure/registro-adaptadores.ts`.
5. Rutas en `adapters/http/rutas.ts` con `requiereSesion(instituciones, 'atencion')` y regístrelas en `app.ts`.
6. Lecturas de ficha, altas, cambios, bajas y exportaciones escriben en la bitácora desde el caso de uso.
