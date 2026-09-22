# Nortvira

Aplicación real de planificación semanal personal: vista de **Hoy**, vista de
**Semana** completa, registro de **Proyectos**, **Dashboard** de
productividad, hábitos con seguimiento L-V, e integraciones con **Todoist**
y **Google Calendar**. Sustituye al prototipo en artefacto de Claude
(`plan-semanal.jsx`) por una app con persistencia real, login con Google y
registro de actividad (audit log).

## Stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS** — frontend y API en un solo proceso Node.
- **PostgreSQL + Prisma** — persistencia real con consultas históricas eficientes.
- **Auth.js (NextAuth v5) con Google** — login con un clic, sin gestionar contraseñas. Restringido por email (`ALLOWED_EMAILS`).
- **Todoist REST API + OAuth2** — importar/exportar tareas.
- **Google Calendar API** — reutiliza el mismo login de Google (scope `calendar.events`) para crear eventos desde tareas con fecha/hora.
- **Recharts** — gráficos del dashboard.

## Modelo de datos

`Week` (una por semana ISO `AAAA-Wnn`) → `Day` (7 por semana) → `Task`
(tareas de día por área, acciones prioritarias o llamadas) · `Habit` +
`HabitCompletion` (L-V) · `Project` (registro global) + `WeekProjectFocus`
(foco semanal) · `RecurringTaskTemplate` (se materializa en `Task` al
entrar en cada semana que corresponda, sin duplicar) · `ActivityLog`
(registro de actividad: cada creación/edición/completado queda grabado con
fecha) · `IntegrationToken` (Todoist) y `Account` de Auth.js (Google, con
refresh token para Calendar).

## Desarrollo local

Requiere Node 20+ y PostgreSQL.

```bash
npm install
cp .env.example .env.local   # rellena las variables (ver abajo)
npx prisma migrate dev       # crea las tablas
npm run dev
```

Abre http://localhost:3000. Sin `GOOGLE_CLIENT_ID`/`SECRET` reales el login
con Google no funcionará — necesitas registrarlos primero (siguiente
sección) incluso para desarrollo local.

## 1. Google Cloud Console — login y Calendar

1. Ve a [console.cloud.google.com](https://console.cloud.google.com/) y crea un proyecto (o usa uno existente).
2. **APIs y servicios → Pantalla de consentimiento OAuth**: tipo "Externo" (o "Interno" si tienes Google Workspace), añade tu email como usuario de prueba si el proyecto no está publicado.
3. **APIs y servicios → Biblioteca**: activa **Google Calendar API**.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: Aplicación web.
   - Orígenes autorizados: `http://localhost:3000` (dev) y `https://tu-dominio.com` (prod).
   - URIs de redirección autorizados:
     `http://localhost:3000/api/auth/callback/google` (dev) y
     `https://tu-dominio.com/api/auth/callback/google` (prod).
5. Copia el **Client ID** y **Client Secret** a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. El scope de Calendar (`calendar.events`) ya se pide automáticamente en el login (ver `src/auth.config.ts`) — no hace falta configurarlo aparte.

## 2. Todoist App Console (opcional)

1. Ve a [Todoist App Console](https://developer.todoist.com/appconsole.html) y crea una app.
2. URI de redirección de OAuth: `https://tu-dominio.com/api/integrations/todoist/callback` (y la versión `http://localhost:3000/...` para dev, si Todoist lo permite en tu cuenta de desarrollador — si no, prueba esta integración ya en producción).
3. Copia el **Client ID** y **Client Secret** a `TODOIST_CLIENT_ID` / `TODOIST_CLIENT_SECRET`.
4. Sin estas variables, la app funciona igual — solo se oculta/falla la conexión con Todoist.

## 3. Restringir el acceso a tu email

En `ALLOWED_EMAILS` pon tu email de Google (el que usarás para entrar). Si
algún día quieres dar acceso a alguien de Gestiona Proyecta, añade su email
separado por comas — no hace falta tocar nada más, no hay sistema de roles
que montar.

```
ALLOWED_EMAILS="tu-email@gmail.com,otra-persona@gestionaproyecta.com"
```

Vacío = sin restricción (solo para pruebas, nunca en producción).

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión PostgreSQL |
| `AUTH_SECRET` | Sí | Firma de sesión — genera con `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | **Sí, siempre** | Ponlo a `true` también en Vercel — con esta versión de Auth.js, sin esto el login falla con "UntrustedHost" / "problem with the server configuration" incluso en Vercel |
| `AUTH_URL` | Solo self-host | URL pública de la app en producción |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Sí | Login y Calendar |
| `ALLOWED_EMAILS` | Recomendada | Emails con permiso de acceso |
| `TODOIST_CLIENT_ID` / `TODOIST_CLIENT_SECRET` | No | Integración Todoist |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Notificaciones push del recordatorio semanal — genera con `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | No | `mailto:tu-email` requerido por el estándar de Web Push |
| `CRON_SECRET` | No | Protege la ruta que dispara los recordatorios — genera con `openssl rand -hex 24` |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | No | Monitorización de errores (ver sección abajo) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | No | Solo para subir source maps y ver stacktraces legibles |

### Recordatorio semanal por notificación push

En Ajustes, cada usuario puede activar un aviso "Prepara tu próxima semana"
(día + franja mañana/tarde). Técnicamente:

- `public/sw.js` es el service worker que recibe y muestra la notificación.
- `vercel.json` define **dos Cron Jobs** (mañana ~9:00 UTC+1, tarde ~19:00
  UTC+1) que llaman a `/api/cron/weekly-reminder`, protegida con
  `CRON_SECRET` (Vercel se lo pasa solo si la variable está definida).
- El plan gratuito de Vercel limita los Cron Jobs a una ejecución diaria por
  cron (por eso solo hay franjas "mañana/tarde", no una hora exacta al
  minuto). Si despliegas en un VPS propio, puedes sustituirlo por un cron de
  sistema con la granularidad que quieras, llamando a la misma URL.
- Sin las variables `VAPID_*`, esta función queda simplemente desactivada
  (el botón "Activar notificaciones" en Ajustes se puede pulsar pero
  fallará) — el resto de la app funciona igual.

### Monitorización de errores (Sentry, opcional)

Sin configurar nada, si algo falla solo lo verás en los logs de Vercel. Con
una cuenta gratuita de [Sentry](https://sentry.io) (hasta 5.000
eventos/mes, de sobra para este uso) recibes aviso y stacktrace de cada
error real de la app, tanto en el navegador como en el servidor:

1. Crea cuenta y un proyecto tipo "Next.js" en sentry.io.
2. Copia el DSN que te da y ponlo en Vercel como `SENTRY_DSN` y
   `NEXT_PUBLIC_SENTRY_DSN` (mismo valor en ambas).
3. Sin más variables, ya captura errores (con stacktraces "minificados").
   Opcionalmente añade `SENTRY_ORG`, `SENTRY_PROJECT` y un
   `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens en Sentry) para que el build
   suba los source maps y los stacktraces se vean con tu código real.
4. Sin ninguna de estas variables la app funciona exactamente igual, solo
   que sin reportar errores a ningún sitio.

También hay un endpoint `GET /api/health` que comprueba la conexión a la
base de datos (responde `200` u/`503`) — útil para un monitor externo
gratuito tipo [UptimeRobot](https://uptimerobot.com) que te avise si la app
cae.

## Despliegue recomendado: Vercel + Postgres gestionado (Neon/Supabase)

La combinación de menor mantenimiento para un único usuario (capa gratuita
suele bastar).

1. **Base de datos**: crea un proyecto en [Neon](https://neon.tech) o
   [Supabase](https://supabase.com), copia la connection string (con
   `?sslmode=require`). En Neon, usa la cadena de conexión **pooled**
   (host con sufijo `-pooler`, la que te muestra por defecto en su panel):
   Vercel ejecuta cada petición en una función serverless independiente y
   sin el pooler puedes agotar las conexiones de Postgres si varias
   peticiones llegan a la vez.
2. **Repositorio**: este proyecto ya está en GitHub
   (`victorganan/nortvira`).
3. **Vercel**: [vercel.com/new](https://vercel.com/new) → importa el
   repositorio → framework Next.js (detectado automáticamente).
4. **Variables de entorno** en el proyecto de Vercel (Settings → tu
   Environment → Environment Variables): `DATABASE_URL`, `AUTH_SECRET`,
   **`AUTH_TRUST_HOST="true"`** (imprescindible, ver tabla de abajo),
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`, y
   opcionalmente `TODOIST_CLIENT_ID`/`SECRET` y `VAPID_PUBLIC_KEY` /
   `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_SUBJECT` /
   `CRON_SECRET` (para el recordatorio semanal por notificación push). No
   hace falta `AUTH_URL` en Vercel (solo en self-host).
5. **Deploy**. El script `build` (`prisma migrate deploy && next build`) ya
   aplica las migraciones pendientes en cada despliegue automáticamente.
6. Actualiza en Google Cloud Console el origen y el URI de redirección con
   tu dominio real de Vercel (`https://tu-proyecto.vercel.app` o tu dominio
   propio si lo conectas).
7. **Dominio propio** (opcional): Vercel → Settings → Domains, y sigue sus
   instrucciones DNS. HTTPS se gestiona automáticamente.

## Alternativa: VPS propio (Hetzner, DigitalOcean, ~5-8€/mes)

Para más control o si prefieres no depender de servicios externos de pago.

```bash
# 1. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs postgresql

# 2. Base de datos
sudo -u postgres createuser nortvira -P
sudo -u postgres createdb nortvira -O nortvira

# 3. Clonar y construir
git clone https://github.com/victorganan/nortvira.git
cd nortvira
npm install
cp .env.example .env.local   # rellena DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST=true, AUTH_URL, etc.
npm run build                # aplica migraciones + build

# 4. Proceso persistente con PM2
sudo npm install -g pm2
pm2 start npm --name nortvira -- start
pm2 save
pm2 startup

# 5. Nginx como proxy inverso hacia el puerto 3000 + Let's Encrypt (certbot)
```

En este caso **sí** necesitas `AUTH_TRUST_HOST="true"` y `AUTH_URL="https://tu-dominio.com"`
en `.env.local`, porque Auth.js necesita saber que confía en el host detrás
de tu propio Nginx.

### Backups (VPS)

```bash
# cron diario, por ejemplo a las 4am
0 4 * * * pg_dump -U nortvira nortvira | gzip > /var/backups/nortvira-$(date +\%F).sql.gz
```

Sube esos volcados a almacenamiento externo (S3, Backblaze, etc.) para no
depender solo del disco del VPS. En Neon/Supabase los backups automáticos
ya vienen incluidos en la capa gratuita/básica.

## Multiusuario

La app ya soporta varios usuarios de forma nativa (todo el modelo de datos
está aislado por `userId`). Para dar acceso a alguien más solo hace falta
añadir su email a `ALLOWED_EMAILS` — no requiere cambios de código ni de
base de datos.

## Notas de seguridad

- Hay una vulnerabilidad conocida y sin parche aún en la versión de
  `postcss` que usa internamente Next.js 15.5.x (solo afecta al proceso de
  build, no a la app en producción). Se resolverá cuando Next.js publique
  un parche en la rama 15; no requiere una migración a Next 16 para operar
  con seguridad.
- Cambia `AUTH_SECRET` por un valor propio antes de desplegar a producción.
- Define siempre `ALLOWED_EMAILS` en producción.

## Estructura del proyecto

```
prisma/schema.prisma   Modelo de datos
src/
  auth.ts, auth.config.ts, middleware.ts   Auth.js (Google + restricción por email)
  app/            Páginas (App Router) y rutas de API
  components/     Componentes de UI
  lib/            Lógica de negocio (semanas ISO, recurrencia, dashboard, Todoist, Calendar, audit log)
```
