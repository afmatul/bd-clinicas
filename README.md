# Red Clínica · BD Clínicas

Plataforma de historiales clínicos para cuatro instituciones médicas independientes. Cada institución usa su propio motor de base de datos y la lógica de negocio es la misma para todas (arquitectura hexagonal).

| Institución | Motor | Modelo |
| --- | --- | --- |
| Hospital general | PostgreSQL | Relacional (ER de la Entrega I) |
| Centro médico pediátrico | MySQL (InnoDB) | Relacional (ER de la Entrega I) |
| Laboratorio clínico | MongoDB | Documental por colecciones |
| Clínica odontológica | CouchDB | Documental, una base con campo `type` |
| Plataforma (usuarios, instituciones, bitácora) | PostgreSQL, otra base | Relacional |

## Estructura

```
apps/
  api/                    NestJS (sobre Fastify) + TypeScript. Monolito modular, hexagonal por módulo.
    src/
      app.module.ts       Raíz de composición: un módulo de Nest por módulo de dominio.
      tokens.ts           Tokens de inyección; los casos de uso se registran con useFactory.
      infrastructure/     Conexiones (abiertas una vez) y RegistroDeAdaptadores (motor → repositorios).
      http/               SesionGuard (JWT en cookie httpOnly → ContextoInstitucion), @Modulo y filtro de errores.
      shared/             Contexto, errores de dominio, autorización por rol.
      modules/<módulo>/
        domain/           Reglas puras.
        application/      Casos de uso; solo conocen puertos.
        ports/            Interfaces (PacienteRepository…).
        adapters/         postgres/ mysql/ mongo/ couch/ y http/ (controladores de Nest).
        <módulo>.module.ts Conecta puertos con adaptadores.
  web/                    Next.js (App Router) + React 19. Pantallas convertidas del prototipo.
    src/app/              Rutas; (app)/ requiere sesión y monta el shell.
    src/vistas/           Una vista por pantalla del prototipo.
    src/layout/           AppShell (sidebar + topbar) y toasts.
packages/
  shared/                 Contratos zod compartidos por api y web (DTOs, instituciones, roles).
  design-system/          Copia sincronizada del design system (no editar a mano).
infra/db/                 DDL, scripts de inicio de cada motor, design doc de CouchDB.
scripts/                  Sincronización del design system, verificación de tokens, prueba de paridad.
```

### Estado de los módulos

| Módulo | Estado |
| --- | --- |
| identidad | Listo: login contra plataforma, bloqueo tras 5 intentos por 15 min, JWT de 8 h, cierre de sesión. |
| auditoria | Listo: registro (solo inserción) y consultas para AUDITOR: bitácora con filtros, exportación CSV y "quién vio a este paciente". |
| pacientes | Listo en los 4 motores: búsqueda (CUI, nombre sin acentos, sexo, sangre), ficha, alta, baja lógica. |
| antecedentes | Listo en los 4 motores: lectura y registro de alergias y antecedentes (sin duplicados, no en pacientes de baja). |
| personal | Listo en los 4 motores: directorio público, médicos con especialidades, departamentos (hospital) y altas por ADMIN. |
| odontologia | Listo (CouchDB): recepción del día, registro rápido con turno, llegada y odontograma con historial. Pantalla Recepción conectada. |
| pediatria | Listo (MySQL): mediciones con percentiles OMS, carné de vacunación y dosis vencidas. Pantallas de crecimiento y vacunas conectadas. |
| agenda | Listo en los 4 motores: agenda por día/semana/mes, horarios libres, agendar sin choque (lo garantiza cada motor), confirmar, cancelar, inasistencias. |
| atencion | Listo en los 4 motores: abrir/retomar consulta, borrador, cierre atómico (signos, diagnóstico, tratamiento y receta), historial. |
| prescripcion | Listo en los 4 motores: catálogo de medicamentos, recetas vigentes e históricas, alerta de alergias al recetar. |
| laboratorio | Listo en MongoDB: catálogo de tipos, registrar examen, capturar resultados por tipo, validar, listar y ver con interpretación. Pantalla Resultados conectada. |

Cada módulo pendiente tiene un `README.md` con los pasos, siguiendo el patrón de `modules/pacientes`.

## Arrancar en local

Requisitos: Node 22 y Docker.

```bash
cp .env.example .env          # cambie las contraseñas
npm ci                        # instala exactamente lo del lockfile (ver abajo)
npm run db:reset              # levanta PostgreSQL (hospital + plataforma), MySQL, MongoDB y CouchDB desde cero y carga los datos semilla
npm run dev:api               # http://localhost:3000
npm run dev:web               # http://localhost:5173 (Next.js; /api se redirige a la API)
```

Usuarios de desarrollo (contraseña `RedClinica2026!`): `aperez` (hospital, médico), `recepcion.hg` (hospital, recepción), `pediatra` (pediátrico), `laboratorio` (laboratorio), `secretaria` (odontológica, recepción), entre otros. `npm run db:seed` vuelve a cargar sobre las bases ya levantadas. Qué datos se cargan, la lista completa de usuarios y la forma de los documentos de Mongo y Couch están en [`apps/api/src/scripts/semilla/README.md`](apps/api/src/scripts/semilla/README.md).

Para revisar el diseño sin bases de datos: `NEXT_PUBLIC_DEMO=true npm run dev:web` (cualquier usuario y contraseña; el selector de institución funciona como en el prototipo).

### Verificaciones

```bash
npm run typecheck             # api, web y shared
npm run check:tokens          # la web no usa colores ni fuentes fuera del design system
scripts/prueba-paridad.sh     # mismas operaciones, mismo resultado en los 4 motores (API corriendo)
scripts/prueba-atencion.sh    # agenda → consulta → receta en los 4 motores (médicos con id_personal y medicamentos sembrados)
npm run audit:deps            # vulnerabilidades conocidas y firmas de los paquetes
```

### Instalar dependencias de forma segura

Los ataques a la cadena de suministro de npm (por ejemplo, el gusano Shai-Hulud de 2025) publican versiones nuevas de paquetes populares con código que se ejecuta al instalarlas y roba tokens de GitHub, claves de la nube y archivos `.env` de la máquina. El repositorio está configurado para reducir ese riesgo:

- **Versiones fijas.** Todas las dependencias están fijadas a una versión exacta en `package.json` y `package-lock.json` está versionado con los hashes de integridad. `.npmrc` tiene `save-exact=true`, así que lo que se agregue también queda fijo.
- **Sin scripts de instalación.** `.npmrc` tiene `ignore-scripts=true`: npm no ejecuta `preinstall`/`postinstall` de paquetes de terceros, que es por donde entra el código malicioso. Los scripts propios (`npm run dev`, `npm run build`…) siguen funcionando. Ningún paquete actual necesita su script de instalación (esbuild y Next.js traen binarios precompilados).
- **Revisión automática.** El workflow `.github/workflows/dependencias.yml` corre en cada PR: `npm ci`, `npm audit`, `npm audit signatures` y `typecheck`.

Reglas para el equipo:

1. Instale siempre con `npm ci`, no con `npm install`. `npm ci` falla si `package.json` y el lockfile no coinciden en vez de traer versiones nuevas sin avisar.
2. Para agregar o actualizar un paquete, use una versión publicada hace al menos una semana (`npm view <paquete> time`) y revise el cambio en `package-lock.json` dentro del PR. Los paquetes comprometidos suelen detectarse y retirarse en pocos días.
3. No guarde credenciales reales en este proyecto ni en la máquina donde lo instala si puede evitarlo: aquí solo hacen falta las contraseñas locales de Docker de `.env`, que nunca se sube (`.gitignore` excluye `.env` y `.env.*` salvo `.env.example`).
4. Si un paquete nuevo necesita su script de instalación, ejecútelo de forma explícita y revisada (`npm rebuild <paquete> --ignore-scripts=false`) en lugar de desactivar la protección.
5. Para aislar todavía más, instale y ejecute dentro de un contenedor: `docker run --rm -it -v "$PWD":/app -w /app node:22 npm ci`.

## Design system

El design system **Red Clínica** es la única fuente de diseño. La web importa `@red-clinica/design-system`, que carga en orden:

1. `tokens.css`: colores, tipografía, espacios, radios, sombras (tema claro y oscuro).
2. `components.css`: componentes `rc-*`.
3. `layout.css`: CSS de páginas extraído de `prototipo.html` (shell, login, signos vitales, agenda…).
4. `motion.css`: animaciones (entrada de página en cascada, filas de tabla, menús, toasts, modales, respuesta de botones) con los tokens `--duration-*`; se apagan con `prefers-reduced-motion`.

Reglas:

- No se agregan hojas de estilo en `apps/web/src` ni colores o fuentes literales; `npm run check:tokens` falla si aparecen. Los estilos en línea solo usan `var(--token)` o medidas que ya trae el prototipo.
- Para cambiar el diseño, cambie el design system y corra `npm run sync:design-system` (por defecto lee `../design-system`; use `DESIGN_SYSTEM_DIR=/ruta` si está en otro lugar).
- Las pantallas salen del prototipo: `scripts/prototipo-a-jsx.py` convirtió cada vista a JSX con el mismo markup y los iconos Lucide equivalentes. Las páginas marcadas como borrador en `apps/web/src/app/(app)/*/page.tsx` aún muestran los datos del mockup; se conectan a la API a medida que se implementa cada módulo.

## Decisiones pendientes

- ~~**Baja en el pediátrico**~~ Resuelto: `paciente` en MySQL ahora tiene `fecha_baja`, `motivo_baja` e `id_pediatra_baja`, igual que el hospital (modelo corregido para la Entrega II).
- ~~**"Resultados" en el hospital**~~ Resuelto: la sección se quitó del menú del hospital; los exámenes viven solo en el Laboratorio (MongoDB) y las instituciones no comparten datos.
