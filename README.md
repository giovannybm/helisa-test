# Arranque de la prueba técnica full-stack

Backend y frontend listos para correr, ya conectados entre sí. Es el punto de partida de la prueba, para que no gastes tiempo en instalar y configurar.

| Carpeta | Qué hay | Puerto |
|---------|---------|:------:|
| `api/` | NestJS con TypeScript, con CORS habilitado hacia el front | 3000 |
| `web/` | React con Vite y TypeScript | 5173 |

Catálogo contable con NestJS (Clean Architecture), Prisma/SQLite y frontend React con shadcn/ui, Tailwind y Axios.

## Requisitos

- **Node 22** (está en `.nvmrc`, con `nvm use` queda listo).
- **npm 10 o superior.** Con npm 9.2 la instalación falla. Revisa con `npm -v` antes de empezar.

## Cómo correrlo

```bash
npm install     # instala la raíz, api/ y web/
cp api/.env.example api/.env
cd api && npm run db:generate && npm run db:deploy && cd ..
npm run dev     # levanta los dos a la vez
```

Abre http://localhost:5173. Si ves *La API respondió: Hello World!*, el frontend está hablando con el backend y puedes empezar.

Esa pantalla existe solo para comprobar la conexión. Bórrala y construye lo tuyo.

## Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Levanta la API y el front juntos, en modo watch |
| `npm run dev:api` | Solo la API |
| `npm run dev:web` | Solo el front |
| `npm run build` | Compila los dos |
| `npm test` | Corre las pruebas de la API con Vitest |
| `npm run lint` | Revisa los dos con oxlint |

## Configuración

El front lee la URL de la API de `VITE_API_URL`. Si no defines la variable, usa `http://localhost:3000`, así que no tienes que configurar nada para empezar. El ejemplo está en [`web/.env.example`](./web/.env.example).

La API acepta peticiones del origen que diga `WEB_ORIGIN`, y por defecto `http://localhost:5173`. Si cambias el puerto del front, cambia esa variable.

## Arquitectura del backend

```text
api/src/accounts/
  domain/                     Entidad Account, reglas contables y errores puros
  application/                Casos de uso y puertos Repository / UnitOfWork
  infrastructure/
    http/                     Controlador NestJS, validación HTTP y filtro de errores
    persistence/              Adaptadores Prisma, mapeo de entidades y transacciones
  accounts.module.ts          Composition root: conecta puertos con adaptadores
```

Las dependencias apuntan hacia dentro: infraestructura → aplicación → dominio. Dominio y aplicación no importan NestJS, Prisma, Express ni conexiones de BD. El dominio valida códigos, nombres, naturaleza y jerarquía; los casos de uso coordinan las operaciones mediante interfaces. El puerto UnitOfWork permite operaciones atómicas sin exponer transacciones Prisma a la aplicación. Los errores del ORM se traducen en el adaptador de persistencia y los errores internos a HTTP únicamente en el filtro NestJS.

Las pruebas unitarias de dominio/casos de uso usan un repositorio en memoria, sin framework ni base de datos; las e2e verifican los adaptadores reales con SQLite temporal.

## Catálogo de cuentas

Base local: `api/prisma/dev.db` (no se versiona). Las migraciones sí se versionan en `api/prisma/migrations`. La inicialización crea el esquema vacío, sin datos de demostración.

| Método | Ruta | Operación |
|--------|------|-----------|
| POST | `/accounts` | Crear cuenta |
| GET | `/accounts` | Listar ordenadas por código |
| GET | `/accounts?parentCode=1105` | Listar hijos directos |
| GET | `/accounts/:code` | Consultar una cuenta |
| PATCH | `/accounts/:code` | Actualizar nombre |
| DELETE | `/accounts/:code` | Eliminar (204) |

```bash
curl -X POST http://localhost:3000/accounts -H 'Content-Type: application/json' \
  -d '{"code":"1","name":"Activo","nature":"DEBIT"}'
curl -X POST http://localhost:3000/accounts -H 'Content-Type: application/json' \
  -d '{"code":"11","name":"Disponible"}'
```

- Códigos de texto, únicos, numéricos y sin cero inicial: 1 dígito = `CLASS`, 2 = `GROUP`, 4 = `ACCOUNT`, 6 = `SUBACCOUNT`. El campo `level` se calcula al responder.
- El padre se deriva del prefijo inmediato: `110505` → `1105` → `11` → `1`. Debe existir antes de crear al hijo.
- Las clases requieren `nature`: `DEBIT` (débito) o `CREDIT` (crédito). Los descendientes la heredan; una naturaleza incompatible se rechaza.
- Código, padre y naturaleza son inmutables mediante PATCH; solo se modifica `name`. Esto evita mover ramas o dejar naturalezas inconsistentes.
- La relación autorreferenciada usa `ON DELETE RESTRICT`: no se puede borrar un padre con hijos, incluso ante eliminaciones fuera de la API. Se elimina desde las hojas hacia la raíz.
- Errores: 400 para datos inválidos/padre ausente, 404 para cuenta inexistente, 409 para código duplicado o eliminación con hijos. Todas las respuestas de error usan RFC 9457. No hay autenticación todavía.

Desde `api/`: `npm run db:migrate -- --name cambio` crea migraciones de desarrollo, `npm run db:deploy` aplica las existentes y `npm run db:studio` abre el explorador.

Pruebas: `cd api && npm test && npm run test:e2e`. Las pruebas del catálogo usan SQLite temporal aislado y verifican jerarquía, naturaleza, validación, CRUD, borrado restringido y RFC 9457. Frontend: `cd web && npm test` verifica el interceptor Axios.

## Frontend

- CRUD en `web/src/App.tsx`, con búsqueda por nombre/código que conserva los ancestros de los resultados.
- File tree en `web/src/components/account-file-tree.tsx`, compuesto con `Collapsible` de shadcn/ui (no existe un componente oficial llamado FileTree en el registro base). Botones nativos permiten navegar por teclado; los formularios usan Dialog con gestión de foco de Radix.
- Componentes shadcn/ui generados desde el registro: Button, Input, Dialog y Collapsible; configuración en `web/components.json`.
- El backend es la única autoridad de validación de crear, editar y eliminar. El frontend no comprueba códigos, duplicados, longitudes ni nombres vacíos, no aplica `required`/`maxLength` y envía los valores sin normalizar. También permite intentar agregar hijos desde cualquier nivel y eliminar padres con hijos. Las restricciones se resuelven en la API y el interceptor muestra sus errores RFC 9457. Solo se edita el nombre según el contrato PATCH; la naturaleza heredada se presenta como información del servidor. Las acciones pendientes se deshabilitan únicamente para evitar peticiones duplicadas.
- Estados de carga, error con reintento, catálogo vacío y operaciones pendientes. Los formularios mantienen sus datos ante errores.

## Errores RFC 9457

El filtro global `api/src/problem-details.filter.ts` transforma errores de dominio, HTTP y errores inesperados. Estos últimos no exponen detalles internos. Responde con `Content-Type: application/problem+json`:

```json
{
  "type": "urn:accounting:problem:account-has-children",
  "title": "CONFLICT",
  "status": 409,
  "detail": "No se puede eliminar una cuenta con hijos.",
  "instance": "/accounts/1",
  "code": "ACCOUNT_HAS_CHILDREN"
}
```

`code` es una extensión estable para consumo programático: `INVALID_ACCOUNT`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_CODE_EXISTS`, `ACCOUNT_HAS_CHILDREN`, `ACCOUNT_RELATION_CONFLICT`, `CONCURRENT_MODIFICATION`, `HTTP_<status>` e `INTERNAL_ERROR`.

`web/src/api.ts` centraliza Axios y normaliza Problem Details, fallos de conexión y respuestas no compatibles. El interceptor muestra una notificación global Sonner y rechaza con `ApiError`; los componentes solo gestionan el estado local, sin duplicar notificaciones. Las cancelaciones no generan alertas.
