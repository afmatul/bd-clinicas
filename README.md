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
| auditoria | Listo para registrar (bitácora solo inserción). Falta la consulta "quién vio a este paciente". |
| pacientes | Listo en los 4 motores: búsqueda (CUI, nombre sin acentos, sexo, sangre), ficha, alta, baja lógica. |
| antecedentes | Lectura de alergias y antecedentes en los 4 motores. Falta registrar. |
| agenda, atencion, prescripcion, personal | Puertos definidos (`ports/`), sin implementar. |
| pediatria, odontologia, laboratorio | Puertos definidos, sin implementar. |

Cada módulo pendiente tiene un `README.md` con los pasos, siguiendo el patrón de `modules/pacientes`.

## Arrancar en local

Requisitos: Node 22 y Docker.

```bash
cp .env.example .env          # cambie las contraseñas
npm install
docker compose up -d          # PostgreSQL (hospital + plataforma), MySQL, MongoDB, CouchDB
npm run db:seed               # CouchDB, usuarios y pacientes de ejemplo en los 4 motores
npm run dev:api               # http://localhost:3000
npm run dev:web               # http://localhost:5173 (Next.js; /api se redirige a la API)
```

Usuarios de desarrollo (contraseña `RedClinica2026!`): `aperez` (hospital, médico), `recepcion.hg` (hospital, recepción), `pediatra` (pediátrico), `laboratorio` (laboratorio), `secretaria` (odontológica, recepción).

Para revisar el diseño sin bases de datos: `NEXT_PUBLIC_DEMO=true npm run dev:web` (cualquier usuario y contraseña; el selector de institución funciona como en el prototipo).

### Verificaciones

```bash
npm run typecheck             # api, web y shared
npm run check:tokens          # la web no usa colores ni fuentes fuera del design system
scripts/prueba-paridad.sh     # mismas operaciones, mismo resultado en los 4 motores (API corriendo)
```

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
