# Generador de contratos de trastero

Aplicación con frontend de HTML, CSS y JavaScript básico, backend Node.js + Express y PostgreSQL. Permite crear, listar, consultar, editar y eliminar contratos, previsualizarlos y descargarlos como PDF A4 mediante Chromium/Puppeteer. El backend sirve el frontend; no hace falta compilarlo.

## Arranque con Docker (recomendado)

Necesitas Docker con el complemento Compose. Desde la raíz:

```bash
cp .env.example .env
docker compose up --build -d
```

Abre **http://localhost:3000**. Si cambias `PORT` en `.env`, usa ese puerto. La primera construcción descarga Chromium y puede tardar unos minutos. PostgreSQL se inicializa automáticamente con `database/init.sql`, sin insertar datos personales de ejemplo. La aplicación espera a que PostgreSQL esté disponible.

```bash
docker compose logs -f app
docker compose ps
docker compose down
```

`down` conserva los datos en el volumen `postgres_data`. **`docker compose down -v` elimina permanentemente la base de datos.** El script de inicialización automático solo se ejecuta cuando el volumen está vacío. Para volver a aplicar el SQL de manera manual:

```bash
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < database/init.sql
```

El esquema es idempotente para una instalación de esta versión; los cambios futuros de estructura necesitan migraciones. PostgreSQL no expone su puerto al equipo anfitrión. Las variables `PG*` de Compose conectan la aplicación con `db`; `DATABASE_URL` de `.env` se usa para ejecución local.

## Ejecución sin Docker

Necesitas Node.js 22.12 o posterior y PostgreSQL 17. Crea un usuario y una base vacía en PostgreSQL (ejemplo ejecutado como administrador):

```sql
CREATE USER contratos WITH PASSWORD 'contratos_local';
CREATE DATABASE contratos OWNER contratos;
```

Después:

```bash
cp .env.example .env
npm ci
npm run db:init
npm start
```

Ajusta `DATABASE_URL` a tus credenciales. `npm run db:init` crea tablas, restricciones, índice y función de actualización dentro de la base indicada. Alternativa: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/init.sql` (con la variable exportada en la terminal).

Puppeteer descarga su navegador al instalar las dependencias. En Linux puede necesitar bibliotecas del sistema; Docker ya las incluye. Puedes usar un Chromium instalado definiendo `PUPPETEER_EXECUTABLE_PATH`. `npm run dev` reinicia el servidor al cambiar código.

## Datos y plantilla

`contrato.html` es la plantilla original y conserva los datos fijos del arrendador, cuenta bancaria, inmueble y cláusulas. Cambia ese archivo para adaptar el texto a tu caso. Los valores variables se escapan antes de insertarlos en el HTML. El PDF añade estilos de impresión A4 y una fuente del sistema, porque las fuentes enlazadas por el original no están incluidas en el proyecto.

Campos: `nombre`, `dni`, `residencia`, `trastero` (1–34), `superficie` (m²), `fechainicio`, `fechafinal`, `fechafirma`, `preciooriginal` e `iva`. Las fechas usan `AAAA-MM-DD`, la fecha final debe superar la inicial y los números aceptan hasta dos decimales. El DNI/NIE se registra como texto; no se comprueba su letra. **IVA es el importe en euros, no un porcentaje.** `preciototal` se calcula en PostgreSQL como renta + IVA y no se acepta como valor editable.

La cláusula original indica una duración de 12 meses. El formulario permite introducir las fechas pactadas; revisa su coherencia con el texto. El contrato descargado no incorpora firma electrónica. Las fechas se almacenan sin zona horaria.

## API

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/api/health` | Estado de conexión a PostgreSQL |
| GET | `/api/contratos` | Lista de contratos, más recientes primero |
| GET | `/api/contratos/:id` | Contrato por identificador |
| POST | `/api/contratos` | Crea un contrato (201) |
| PUT | `/api/contratos/:id` | Sustituye sus campos editables |
| DELETE | `/api/contratos/:id` | Elimina el contrato (204) |
| GET | `/api/contratos/:id/html` | Vista previa |
| GET | `/api/contratos/:id/pdf` | Descarga el PDF |

POST y PUT reciben `Content-Type: application/json` y todos los campos editables:

```json
{
  "nombre": "Persona de ejemplo",
  "dni": "12345678Z",
  "residencia": "Calle Ejemplo 10, Zaragoza",
  "trastero": 3,
  "superficie": 4.5,
  "fechainicio": "2026-11-08",
  "fechafinal": "2027-11-08",
  "fechafirma": "2026-11-08",
  "preciooriginal": 50,
  "iva": 10.5
}
```

Los errores devuelven JSON `{ "error": "…" }`: 400 para datos inválidos, 404 para contratos inexistentes, 413 para peticiones grandes, 503 si el generador PDF está ocupado y 500 para fallos internos. Los campos NUMERIC se devuelven como cadenas decimales para preservar su precisión. Se genera un PDF a la vez; si el generador está ocupado, vuelve a intentarlo.

## Pruebas

```bash
npm test
```

Incluye validación, escape de HTML y sustitución de la plantilla. La prueba de integración se omite si no defines `TEST_DATABASE_URL`. Usa una **base exclusiva de pruebas** e inicialízala primero con `database/init.sql`:

```bash
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/contratos_test npm test
```

La integración verifica CRUD, cálculos, fechas, errores y rutas de vista previa y PDF; usa un generador PDF simulado. Para comprobar Chromium realmente, arranca la aplicación y descarga un PDF desde el listado.

## Archivos

- `contratos-backend/`: servidor, API, validación y renderizado.
- `contratos-frontend/`: pantallas y JavaScript sin frameworks. Los archivos antiguos de Tailwind no se usan.
- `database/init.sql`: esquema completo ejecutable.
- `database/init.js`: ejecutor SQL para Node.
- `Dockerfile` y `compose.yaml`: aplicación con Chromium y PostgreSQL persistente.
- `tests/`: pruebas unitarias y de integración.

El acceso requiere el usuario **andres** y la contraseña **andres**. La sesión dura 8 horas y se guarda en una cookie HttpOnly con SameSite=Strict. Cerrar sesión invalida la cookie en el servidor. Las sesiones se mantienen en memoria: al reiniciar el backend hay que entrar de nuevo. Hay un límite global de 20 intentos de login por minuto. Compose publica únicamente en `127.0.0.1`. Para compartirla por Internet, configura HTTPS y `COOKIE_SECURE=true`. Las credenciales fijas solicitadas están en `contratos-backend/auth.js`; usa una contraseña más robusta antes de exponerla públicamente. Si usas Nginx conserva la cabecera Host con `proxy_set_header Host $host;`. Guarda copias de seguridad del volumen. Dentro del contenedor Chromium se ejecuta sin su sandbox interno y con un usuario sin privilegios; solo renderiza la plantilla local con entradas escapadas y bloquea las peticiones externas.

Referencias técnicas: [consultas parametrizadas de node-postgres](https://node-postgres.com/features/queries), [generación PDF de Puppeteer](https://pptr.dev/next/api/puppeteer.page.pdf) e [inicialización de PostgreSQL en Docker](https://docs.docker.com/guides/postgresql).

## Acceso y validación

- `POST /api/login`: JSON `{ "usuario": "andres", "password": "andres" }`.
- `GET /api/session`: usuario de la sesión, o 401.
- `POST /api/logout`: cierra la sesión.
- Todas las rutas `/api/contratos` requieren la cookie de sesión, también HTML y PDF.
- Los errores 400 del formulario incluyen `fieldErrors`, un objeto con mensajes por campo. El navegador muestra el error junto al dato y enfoca el primer campo incorrecto.
- En pantallas pequeñas el listado se convierte en tarjetas, sin desplazamiento horizontal de la tabla.

Después de actualizar: `docker compose up --build -d`.
