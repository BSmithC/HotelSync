# HotelSync

![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.3%2B-777BB4?logo=php&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Inertia](https://img.shields.io/badge/Inertia.js-3-9553E9?logo=inertia&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Pest](https://img.shields.io/badge/Pest-4-0B7A5C?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-compatible-4479A1?logo=mysql&logoColor=white)

Sistema de gestión hotelera **multi-sucursal** construido con Laravel, Inertia y React. Centraliza huéspedes, habitaciones, reservas, facturación, inventario y la operación diaria de uno o varios hoteles en una sola aplicación.

La interfaz es un dashboard responsive inspirado en productos analíticos modernos: barra lateral navy, superficies claras, acento azul, tipografía Instrument Sans, modo claro/oscuro y componentes accesibles reutilizables.

> **Principio central:** todos los datos que se muestran son reales. Si una métrica no se puede calcular, la interfaz lo indica en lugar de inventar cifras, reservas o promociones.

---

## ✨ Características / Features

| Módulo | Descripción |
| --- | --- |
| 📊 **Dashboard** | Ingresos facturados y cobrados, ocupación, reservas activas, comparativas honestas y gráficas con Recharts. |
| 🛎️ **Recepción** | Check-in, check-out, huéspedes alojados, cambio de habitación, estados e incidencias. |
| 💰 **Finanzas** | Facturas, cobros, gastos y movimientos *append-only*, anulaciones con reverso y exportación CSV. |
| 📦 **Inventario** | Catálogo con SKU único por hotel, entradas, salidas, ajustes, reversos y saldo transaccional. |
| ✨ **Servicios** | Solicitudes de huéspedes con ciclo `pendiente → en_proceso → completado → facturado`. |
| 👥 **Empleados** | Expedientes, datos sensibles protegidos y vinculación opcional de accesos. |
| 📈 **Reportes** | Períodos reales, comparativas, desgloses, exportación CSV y paginación por pestaña. |
| 🗓️ **Calendario** | Vista mensual y de lista, eventos, bloqueos y mantenimientos en la zona horaria del hotel. |
| 🛏️ **Habitaciones** | CRUD, plano interactivo por áreas con arrastrar y soltar, camas e historial de estados. |
| 🧾 **Huéspedes y reservas** | Clientes, reservas con validación de estancia/capacidad y facturación asociada. |
| ⚙️ **Configuración** | Identidad, preferencias regionales, políticas de reserva, finanzas y colores operativos. |

---

## 🛠️ Stack tecnológico / Technology Stack

| Tecnología | Versión | Uso |
| --- | --- | --- |
| 🐘 PHP | `^8.3` | Lenguaje del servidor |
| 🚀 Laravel | `^13.17` | Framework principal |
| 🔐 Laravel Fortify | `^1.37` | Autenticación, verificación y seguridad |
| 🧩 Inertia Laravel + React | `^3.0` | Páginas React sin API REST separada |
| 🧭 Laravel Wayfinder | `^0.1.14` | Rutas y acciones tipadas para TypeScript |
| ⚛️ React + TypeScript | `^19.2` / `^5.7` | Interfaz de usuario |
| ⚡ Vite | `^8.0` | Bundler y servidor de desarrollo |
| 🎨 Tailwind CSS | `^4.1` | Tokens de diseño y estilos utilitarios |
| ♿ Radix UI + Lucide | — | Primitivas accesibles e iconografía |
| 📊 Recharts + Sonner | `^3.11` / `^2.0` | Gráficas y notificaciones |
| 🗄️ SQLite / MySQL / PostgreSQL | — | Persistencia (SQLite por defecto) |

**Calidad:** Pest 4, Laravel Pint, Larastan/PHPStan, ESLint, Prettier y GitHub Actions opcional vía `composer ci:check`.

---

## 🏗️ Arquitectura

### Multi-hotel (multi-tenant)

- `hotels` es la entidad raíz; cada registro de negocio lleva `hotel_id`.
- `App\Models\Concerns\BelongsToHotel` aplica un *global scope* que filtra consultas y asigna automáticamente el hotel al crear registros.
- `App\Support\CurrentHotel` resuelve el hotel de la petición: valor explícito → sesión validada → primer hotel del usuario autenticado.
- `ResolveCurrentHotel` exige acceso y fija el contexto; el cambio de hotel se hace con `POST /hotels/{hotel}/switch`.
- La tabla `hotel_user` guarda el rol por hotel. **Ninguna petición acepta un `hotel_id` del frontend.**

### Comunicación servidor → cliente

No hay API REST propia. Cada controlador devuelve `Inertia::render(...)` con props tipadas consumidas por páginas React. Las rutas se importan desde `resources/js/routes` y `resources/js/actions`, generadas por Wayfinder:

```bash
php artisan wayfinder:generate --with-form
```

> Sin `--with-form` se eliminan los helpers que usan los formularios de autenticación.

### Permisos

Los roles viven en `hotel_user.role` y las habilidades se declaran en `App\Support\Permission` y `App\Support\Role`. No se usa Spatie. Gates, policies y `AuthorizesRequests` validan cada endpoint de escritura; la interfaz solo oculta acciones no permitidas.

### Dinero, inventario y trazabilidad

- Facturado, cobrado, pendiente y gastos son cifras independientes: nunca se suman dos veces.
- Los movimientos financieros y de inventario son *append-only*: una anulación crea un reverso con `reversal_of_id`.
- Pagos, gastos, movimientos y solicitudes admiten claves de idempotencia únicas por hotel.
- `audit_logs` registra actor, acción y cambios de las operaciones sensibles.

### Zonas horarias

Los timestamps se guardan en UTC. Cada hotel define su zona horaria; dashboard, recepción, calendario y reportes calculan “hoy”, períodos y agrupaciones en la zona del hotel antes de convertir a UTC.

---

## 👥 Roles y permisos

| Rol (`hotel_user.role`) | Nombre | Alcance |
| --- | --- | --- |
| `owner` | Propietario | Acceso total al hotel |
| `admin` | Administrador | Gestión completa salvo acciones reservadas al propietario |
| `recepcion` | Recepción | Llegadas, salidas, habitaciones, incidencias y solicitudes |
| `finanzas` | Finanzas | Facturación, cobros, gastos, anulaciones y exportación |
| `inventario` | Inventario | Catálogo, entradas, salidas y ajustes |
| `servicios` | Servicios | Catálogo y solicitudes de servicio |
| `rrhh` | Recursos Humanos | Expedientes, datos sensibles y accesos |

Habilidades principales: `reception.*`, `finance.*`, `inventory.*`, `services.*`, `employees.*`, `reports.*`, `rooms.*` y `settings.manage` (solo propietario y administrador).

> Los empleados **no** se convierten en usuarios automáticamente. Vincular un acceso requiere `employees.access`; los campos sensibles requieren `employees.sensitive`.

---

## 🧩 Modelo de datos

| Tabla | Propósito |
| --- | --- |
| `hotels`, `hotel_user`, `users` | Tenants, acceso por rol y cuentas |
| `clients`, `rooms`, `areas`, `beds` | Huéspedes, habitaciones y plano operativo |
| `reservations`, `room_assignments`, `room_status_logs`, `incidents` | Estancias e historial de recepción |
| `calendar` | Eventos, bloqueos y mantenimientos |
| `bills`, `bill_details`, `payments`, `expenses`, `finance_movements` | Facturación y libro financiero |
| `inventory_items`, `inventory_movements` | Catálogo y libro de existencias |
| `services`, `service_requests` | Catálogo y solicitudes |
| `employees`, `branches`, `buildings` | Equipo y estructura física |
| `audit_logs` | Trazabilidad de operaciones sensibles |

Todas las tablas de negocio incluyen `hotel_id`, `active` y marcas de tiempo. La columna JSON `hotels.settings` guarda secciones tipadas (`regional`, `reservations`, `finance`, `room_status_colors`); las claves desconocidas se preservan.

---

## ✅ Requisitos / Requirements

- PHP 8.3+ con extensiones habituales de Laravel (`pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`).
- Composer 2.
- Node.js 22 LTS o superior y npm.
- SQLite (incluido por defecto) o MySQL/PostgreSQL.
- Opcional: Laragon, Laravel Sail o Docker.

---

## 🚀 Instalación / Installation

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/BSmithC/HotelSync.git
cd HotelSync
composer install
npm install

# 2. Entorno y clave
cp .env.example .env
php artisan key:generate

# 3. Base de datos SQLite (por defecto)
touch database/database.sqlite

# 4. Migrar y cargar datos de demostración
php artisan migrate --seed

# 5. Compilar el frontend
npm run build

# 6. Levantar servidor, colas y Vite
composer dev
```

En Windows (PowerShell):

```powershell
Copy-Item .env.example .env
New-Item -ItemType File -Path database/database.sqlite -Force
```

Para MySQL/PostgreSQL ajusta `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD` en `.env`.

Abre `http://localhost:8000` (o `APP_URL`) e inicia sesión con el usuario de demostración.

### 🔑 Credenciales de demostración

| Campo | Valor |
| --- | --- |
| Correo | `test@example.com` |
| Contraseña | `12345678` |

> ⚠️ El seeder es solo para desarrollo. Cambia estas credenciales antes de desplegar.

---

## 🧭 Rutas principales

| Grupo | Rutas de ejemplo |
| --- | --- |
| Panel | `GET /dashboard`, `/reception`, `/finance`, `/inventory`, `/services`, `/employees`, `/reports`, `/calendars` |
| Recepción | `POST /reception/reservations/{reservation}/check-in`, `POST .../check-out`, `PATCH .../room` |
| Finanzas | `POST /finance/payments`, `POST /finance/expenses`, `POST /finance/bills/{bill}/void`, `GET /finance/export` |
| Inventario y servicios | `POST /inventory/items/{item}/movements`, `POST /services/requests/{request}/bill` |
| Catálogos | `/clients`, `/rooms`, `/beds`, `/reservations`, `/buildings`, `/branches`, `/bills` |
| Configuración | `/settings/profile`, `/settings/security`, `/settings/appearance`, `/settings/hotel/{section}` |
| Multi-hotel | `POST /hotels/{hotel}/switch` |

Los recursos clásicos usan `Route::resources(...)`. Para ver el listado completo:

```bash
php artisan route:list
```

---

## 🎨 Diseño y experiencia de usuario

| Token | Valor |
| --- | --- |
| Primary | `#465FFF` |
| Sidebar | `#1C2434` |
| Fondo claro / oscuro | `#F9FAFB` / `#101828` |
| Éxito / error / advertencia | `#12B76A` / `#F04438` / `#F79009` |
| Radio base | `12px` |
| Tipografía | Instrument Sans (400, 500, 600) |

- Modo claro y oscuro, barra lateral colapsable y diseño responsive.
- Estados de carga, vacío y error visibles; confirmaciones antes de anular o desactivar.
- Validación en servidor con errores por campo; fechas y moneda formateadas para `es-DO` (`DOP` por defecto).
- Componentes compartidos: `PageHeader`, `DataTable`, `ListFilters`, `ConfirmDialog`, `StatCard`, `Skeleton` y gráficas Recharts.

---

## 🧪 Pruebas y calidad

La suite usa **Pest** con `RefreshDatabase` y cubre autenticación, permisos, aislamiento entre hoteles, CRUD, filtros y paginación, flujo de recepción, finanzas, inventario, servicios, empleados, reportes, calendario y páginas de error.

```bash
php artisan test              # Suite completa
composer test                 # Pint + PHPStan + suite
composer ci:check             # ESLint + Prettier + TypeScript + suite
npm run types:check           # tsc --noEmit
```

Para ejecutar un archivo concreto:

```bash
php artisan test --filter=ReportsTest
```

---

## 📜 Scripts disponibles

### Composer

| Comando | Descripción |
| --- | --- |
| `composer setup` | Dependencias, `.env`, clave, migración, npm y build |
| `composer dev` | Servidor + colas + Vite en paralelo |
| `composer test` | Pint, PHPStan y pruebas |
| `composer lint` / `composer lint:check` | Aplicar / verificar formato PHP |
| `composer types:check` | Larastan/PHPStan |
| `composer ci:check` | Verificaciones de frontend y pruebas |

### NPM

| Comando | Descripción |
| --- | --- |
| `npm run dev` / `npm run build` | Desarrollo con HMR / compilación de producción |
| `npm run build:ssr` | Compilación cliente + SSR |
| `npm run lint` / `npm run lint:check` | ESLint con / sin autocorrección |
| `npm run format` / `npm run format:check` | Prettier con / sin escritura |
| `npm run types:check` | Comprobación de tipos |

---

## 📁 Estructura del proyecto

```text
HotelSync/
├── app/
│   ├── Http/Controllers/       # Controladores por módulo y Settings
│   ├── Http/Middleware/        # ResolveCurrentHotel, Inertia, apariencia
│   ├── Models/                 # Eloquent + Concerns/BelongsToHotel
│   ├── Policies/               # Autorización por hotel
│   ├── Services/               # Finanzas, inventario, servicios, auditoría
│   └── Support/                # CurrentHotel, Role, Permission, HotelConfig
├── database/                   # Migrations, factories y seeders
├── resources/js/
│   ├── actions/                # Acciones generadas por Wayfinder
│   ├── components/             # ui/, charts/ y componentes por módulo
│   ├── hooks/, layouts/, lib/  # Utilidades compartidas
│   ├── pages/                  # Páginas Inertia por módulo
│   ├── routes/                 # Rutas tipadas de Wayfinder
│   ├── types/                  # Contratos compartidos
│   └── app.tsx                 # Entrada de Inertia
├── routes/                     # web.php + settings.php
├── tests/                      # Feature y Unit con Pest
└── README.md
```

### Convenciones

- Wayfinder para rutas; no escribir URLs a mano salvo rutas no generadas.
- Scope de hotel activo en toda consulta de negocio; `hotel_id` nunca llega del frontend.
- Autorización en servidor, filtros validados contra listas blancas y paginación con `withQueryString()`.
- Transacciones e idempotencia en operaciones financieras y de inventario; sin borrado de historia.
- Pint para PHP, Prettier + ESLint para TypeScript/React; todo cambio de backend se acompaña de pruebas.

---

## 🚧 Limitaciones / Next steps

Estas funciones **no** están implementadas y no se simulan en la interfaz:

- ITBIS, NCF y facturación electrónica (e-CF); el impuesto es configurable pero no hay integración con DGII.
- Recálculo de facturas históricas al cambiar impuestos, moneda o numeración.
- Consolidación de reportes entre hoteles y exportación nativa a PDF/Excel (hoy CSV + impresión).
- Preferencias de usuario en base de datos, notificaciones automáticas, backups y correo saliente.
- Tipos de habitación, tarifas por temporada, fotografías y página pública del hotel.
- Pagos en línea, depósitos, conciliación bancaria y compras que generen gastos automáticamente.
- Gestión documental de empleados y almacenamiento remoto de imágenes.

---

## 📄 Licencia

Proyecto privado de gestión hotelera. El skeleton base de Laravel se distribuye bajo licencia MIT; el código de negocio de HotelSync pertenece a sus autores.
