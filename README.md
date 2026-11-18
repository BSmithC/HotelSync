# HotelSync

Sistema de gestión hotelera multi-sucursal construido sobre **Laravel + Inertia + React**. Centraliza clientes, habitaciones, reservas, facturación, calendario y la operación diaria de uno o varios hoteles desde una sola aplicación.

La interfaz sigue un lenguaje visual premium inspirado en dashboards analíticos modernos: barra lateral navy, superficies blancas, acento azul, tipografía **Instrument Sans**, modo claro/oscuro y componentes reutilizables.

---

## Tabla de contenido

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Modelo de datos](#modelo-de-datos)
- [Rutas principales](#rutas-principales)
- [Diseño y experiencia de usuario](#diseño-y-experiencia-de-usuario)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Credenciales de demostración](#credenciales-de-demostración)
- [Scripts disponibles](#scripts-disponibles)
- [Pruebas](#pruebas)
- [Convenciones del proyecto](#convenciones-del-proyecto)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Limitaciones y próximos pasos](#limitaciones-y-próximos-pasos)
- [Licencia](#licencia)

---

## Stack tecnológico

### Backend

| Tecnología | Versión | Uso |
| --- | --- | --- |
| PHP | `^8.3` (probado con 8.5) | Lenguaje del servidor |
| Laravel | `^13.17` | Framework principal |
| Inertia Laravel | `^3.0` | Puente servidor → React sin API REST separada |
| Laravel Fortify | `^1.37` | Autenticación, verificación y seguridad |
| Laravel Wayfinder | `^0.1.14` | Generación de helpers de rutas tipados para TypeScript |
| Laravel Tinker | `^3.0` | Consola interactiva |
| Laravel Chisel | `^0.1.0` | Utilidades del starter kit |
| Carbon | incluido en Laravel | Fechas y zonas horarias |
| SQLite / MySQL / PostgreSQL | — | Base de datos (SQLite por defecto) |

### Frontend

| Tecnología | Versión | Uso |
| --- | --- | --- |
| React | `^19.2` | Interfaz |
| TypeScript | `^5.7` | Tipado estricto |
| Inertia React | `^3.0` | Componentes de página y navegación |
| Vite | `^8.0` | Bundler y servidor de desarrollo |
| Tailwind CSS | `^4.1` | Estilos utilitarios y tokens de diseño |
| Radix UI | varios paquetes | Primitivas accesibles (dialog, select, dropdown, tooltip, etc.) |
| Lucide React | `^0.475` | Iconografía |
| Recharts | `^3.11` | Gráficos del dashboard |
| Sonner | `^2.0` | Notificaciones toast |
| class-variance-authority + clsx + tailwind-merge | — | Variantes y composición de clases |
| React Compiler (Babel) | `^1.0` | Optimización de render |

### Herramientas

| Herramienta | Uso |
| --- | --- |
| Pest `^4.7` + Pest Laravel | Pruebas automatizadas |
| Laravel Pint `^1.27` | Formato de PHP |
| Larastan / PHPStan `^3.9` | Análisis estático de PHP |
| ESLint `^9` | Reglas de JavaScript/TypeScript |
| Prettier `^3.4` + plugin Tailwind | Formato de frontend |
| Laravel Pail / Sail / Boost | Diagnóstico y entorno local |
| GitHub Actions (opcional) | CI mediante `composer ci:check` |

---

## Arquitectura

### Multi-hotel (multi-tenant)

- `hotels` es la entidad raíz. Cada registro de negocio pertenece a un hotel mediante `hotel_id`.
- El trait `App\Models\Concerns\BelongsToHotel` aplica un **global scope** que filtra automáticamente las consultas por el hotel activo y asigna `hotel_id` al crear registros.
- `App\Support\CurrentHotel` resuelve el hotel de la petición en este orden:
  1. Valor explícito definido por middleware o pruebas.
  2. Hotel guardado en sesión, solo si el usuario pertenece a él.
  3. Primer hotel asignado al usuario autenticado.
- El middleware `ResolveCurrentHotel` valida que el usuario tenga al menos un hotel y fija el contexto en sesión.
- La tabla pivote `hotel_user` guarda el rol del usuario dentro de cada hotel (`owner` por defecto).
- El navbar permite cambiar de hotel sin recargar la sesión completa (`POST /hotels/{hotel}/switch`).

### Comunicación servidor → cliente

No existe una API REST pública. Cada controlador devuelve `Inertia::render(...)` con props tipadas consumidas por páginas React. Las rutas del frontend se importan desde `resources/js/routes` y `resources/js/actions`, generadas por **Wayfinder**.

### Zonas horarias

- La aplicación guarda timestamps en UTC (`APP_TIMEZONE=UTC`).
- Cada hotel define su zona horaria (`America/Santo_Domingo` por defecto).
- El dashboard y el calendario calculan “hoy”, límites de mes y agrupación por día usando la zona del hotel, convirtiendo los límites a UTC antes de consultar.

### Estado del servidor y filtros

Los seis índices principales (clientes, reservas, facturas, calendario, edificios y sucursales) comparten el mismo patrón:

- Paginación de 10 registros con `withQueryString()`.
- Búsqueda con debounce.
- Filtros de estado (`status`), estado de negocio (`state`) y tipo (`type`) validados en el servidor contra listas blancas.
- Filtros persistidos en la URL para poder compartir o recargar la vista.
- Confirmaciones de desactivación/restauración con diálogo propio, sin `window.confirm()`.

---

## Funcionalidades

### Autenticación y cuenta

- Inicio y cierre de sesión con Fortify.
- Verificación de correo.
- Perfil editable (`/settings/profile`).
- Cambio de contraseña con limitación de intentos (`throttle:6,1`).
- Apariencia clara/oscura persistida en el navegador.
- Selector de hotel activo para usuarios con acceso a varios hoteles.

### Dashboard

Métricas reales calculadas en el backend, sin datos de ejemplo:

- Ingresos facturados de hoy y del mes (facturas no anuladas).
- Cobros registrados como `Pagada`, separados de la facturación emitida.
- Comparativas contra el día/mes anterior; cuando no hay base de comparación se muestra un estado honesto de “no disponible”.
- Reservas activas, pendientes y huéspedes en casa.
- Ocupación actual por estado de habitación (`disponible`, `ocupada`, `reservada`, `mantenimiento`).
- Series de ingresos, tendencia de reservas, distribución de habitaciones y reservas por estado con Recharts.
- Reservas recientes, próximos check-in/check-out y facturas recientes.
- Estados vacíos cuando aún no existen datos.

### Clientes

- CRUD completo con cédula/RNC, dirección y teléfono.
- Documentos únicos por hotel.
- Búsqueda, filtro activo/inactivo, paginación.
- Desactivación y restauración sin borrado físico.

### Habitaciones, áreas y camas

- CRUD de habitaciones con capacidad, precio, estado, descripción y contacto.
- Plano interactivo por área con **arrastrar y soltar** para posicionar habitaciones.
- Creación de áreas y habitaciones desde modales.
- Modal de detalle de habitación.
- CRUD de camas asociadas a áreas.
- Vista de detalle de habitación con información operativa.

### Reservas

- CRUD de reservas asociadas a cliente, habitación y usuario.
- Estados: `Pendiente`, `Confirmada`, `En curso`, `Finalizada`, `Cancelada`.
- Fechas de reserva y finalización, número de huéspedes y notas.
- Búsqueda, filtro por estado de negocio y por registro activo/inactivo.
- Enlaces cruzados con facturas y eventos de calendario.

### Calendario

- **Vista mensual** tipo calendario de eventos: cuadrícula de 7 columnas, navegación anterior/siguiente, botón “Hoy”, zona horaria del hotel y fines de semana diferenciados.
- Eventos coloreados por tipo: `evento`, `bloqueo` y `mantenimiento`.
- Eventos de varios días se muestran en cada día que ocupan.
- Hasta tres eventos visibles por celda; el botón “+N más” abre el detalle del día.
- Clic en el `+` de un día abre el formulario de creación con fecha y hora precargadas (`starts_at`).
- **Vista de lista** con tabla, paginación, búsqueda y filtros.
- Filtros compartidos entre ambas vistas; el mes y la vista se conservan al filtrar.
- Leyenda con conteo por tipo y mensaje honesto cuando el mes no tiene eventos.
- Estados de carga con esqueleto y respeto a la zona horaria del hotel.

### Facturación

- CRUD de facturas con número único por hotel, cliente, reserva, subtotal, impuesto, total, estado y notas.
- Estados: `Pendiente`, `Pagada`, `Anulada`.
- Detalles de factura (descripción, cantidad, precio unitario, subtotal).
- Búsqueda por número y filtro por estado.
- Desactivación/restauración con confirmación.

### Sucursales y edificios

- CRUD de sucursales con descripción, teléfono y estado.
- CRUD de edificios vinculados a sucursal, con dirección, pisos y descripción.
- Búsqueda, filtros y paginación.

### Notificaciones

- El menú de notificaciones mantiene un estado vacío explícito hasta que existan los módulos de Recepción y Finanzas. No se inventan alertas.

---

## Modelo de datos

| Tabla | Propósito | Relaciones principales |
| --- | --- | --- |
| `hotels` | Hotel/tenant | `users`, `clients`, `areas`, `rooms`, `beds`, `reservations`, `branches` |
| `hotel_user` | Acceso y rol por hotel | `hotel_id`, `user_id`, `role` |
| `users` | Usuarios autenticados | `hotels` (muchos a muchos) |
| `clients` | Huéspedes y clientes fiscales | `reservations`, `bills` |
| `areas` | Zonas del plano | `rooms`, `beds` |
| `rooms` | Habitaciones | `area`, `reservations`, `calendar` |
| `beds` | Camas por área | `area` |
| `reservations` | Reservas | `client`, `room`, `user`, `bills`, `calendar` |
| `calendar` | Eventos, bloqueos y mantenimientos | `room`, `reservation` |
| `branches` | Sucursales | `buildings` |
| `buildings` | Edificios | `branch` |
| `bills` | Facturas | `client`, `reservation`, `details` |
| `bill_details` | Líneas de factura | `bill` |

Todas las tablas de negocio incluyen `hotel_id`, `active` y marcas de tiempo. Los documentos de cliente (`cedula`, `rnc`) son únicos dentro de cada hotel.

---

## Rutas principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/dashboard` | Dashboard analítico |
| `GET` | `/clients` | Listado paginado de clientes |
| `GET` | `/rooms` | Plano de habitaciones |
| `GET` | `/beds` | Camas |
| `GET` | `/reservations` | Reservas |
| `GET` | `/calendars` | Calendario mensual o lista |
| `GET` | `/buildings` | Edificios |
| `GET` | `/branches` | Sucursales |
| `GET` | `/bills` | Facturas |
| `PATCH` | `/{recurso}/{id}/restore` | Restaurar registro desactivado |
| `POST` | `/hotels/{hotel}/switch` | Cambiar hotel activo |
| `GET` | `/settings/profile` | Perfil |
| `GET` | `/settings/security` | Seguridad y contraseña |
| `GET` | `/settings/appearance` | Apariencia |

Los recursos usan `Route::resources(...)` y generan las rutas estándar `index`, `create`, `store`, `show`, `edit`, `update` y `destroy`.

---

## Diseño y experiencia de usuario

### Tokens principales

| Token | Valor |
| --- | --- |
| Primary | `#465FFF` |
| Sidebar | `#1C2434` |
| Fondo claro | `#F9FAFB` |
| Fondo oscuro | `#101828` |
| Éxito | `#12B76A` |
| Error | `#F04438` |
| Advertencia | `#F79009` |
| Radio base | `12px` |
| Tipografía | Instrument Sans (400, 500, 600) |

### Componentes compartidos

- `PageHeader`, `EmptyState`, `DataTable`, `Pagination`, `StatusBadge`.
- `ListFilters`: búsqueda con debounce y selects que resetean la paginación.
- `RowActions`: menú estable de acciones por fila.
- `ConfirmDialog`: confirmaciones de desactivación/restauración.
- `useRecordAction`: máquina de estados compartida para acciones de registro.
- `Skeleton`, `Spinner`, `Badge`, `Button`, `Dialog`, `Select`, `Tooltip`, `DropdownMenu`, `Sheet`, `Sidebar`.
- Gráficos: `RevenueAreaChart`, `ReservationTrendChart`, `RoomDistributionChart`, `DonutChart`.

### Reglas de interfaz

- Modo claro y oscuro.
- Diseño responsive con barra lateral colapsable.
- Estados de carga, vacío y error visibles.
- Validación de formularios en servidor y mensajes por campo.
- Confirmación antes de desactivar o restaurar.
- Fechas y moneda formateadas para `es-DO` (`DOP` por defecto).
- El plano de habitaciones conserva su comportamiento de arrastrar y soltar.

---

## Requisitos

- **PHP 8.3+** con extensiones habituales de Laravel (`pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`).
- **Composer 2**.
- **Node.js 22 LTS o superior** y npm.
- **SQLite** (por defecto) o un servidor MySQL/PostgreSQL.
- Opcional: Laragon, Sail o Docker para el entorno local.

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/BSmithC/HotelSync.git
cd HotelSync
composer install
npm install
```

### 2. Configurar el entorno

```bash
cp .env.example .env
php artisan key:generate
```

En Windows (PowerShell):

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

### 3. Base de datos

**SQLite (opción por defecto):**

```bash
# macOS / Linux
touch database/database.sqlite

# Windows PowerShell
New-Item -ItemType File -Path database/database.sqlite -Force
```

Verifica en `.env`:

```env
DB_CONNECTION=sqlite
```

**MySQL/PostgreSQL:** ajusta `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD`.

### 4. Migrar y sembrar

```bash
php artisan migrate --seed
```

La migración de tenants crea el hotel **Hotel Principal** (`slug: principal`). El seeder crea el usuario de demostración y lo asocia a ese hotel como `owner`.

### 5. Compilar el frontend

```bash
npm run build
```

O inicia el entorno de desarrollo completo:

```bash
composer dev
```

Este comando levanta en paralelo el servidor Laravel, el worker de colas y Vite.

### 6. Abrir la aplicación

Visita `http://localhost:8000` (o la URL configurada en `APP_URL`) e inicia sesión con las credenciales de demostración.

---

## Credenciales de demostración

| Campo | Valor |
| --- | --- |
| Correo | `test@example.com` |
| Contraseña | `12345678` |

> ⚠️ Cambia estas credenciales antes de desplegar en producción. El seeder es solo para desarrollo.

---

## Scripts disponibles

### Composer

| Comando | Descripción |
| --- | --- |
| `composer setup` | Instala dependencias, crea `.env`, genera clave, migra, instala npm y compila |
| `composer dev` | Servidor + colas + Vite en paralelo |
| `composer test` | Limpia configuración, ejecuta Pint, PHPStan y toda la suite |
| `composer lint` | Aplica Pint |
| `composer lint:check` | Verifica formato PHP sin modificar |
| `composer types:check` | Ejecuta PHPStan/Larastan |
| `composer ci:check` | ESLint + Prettier + TypeScript + pruebas |

### NPM

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor Vite con HMR |
| `npm run build` | Compilación de producción |
| `npm run build:ssr` | Compilación cliente + SSR |
| `npm run lint` | ESLint con autocorrección |
| `npm run lint:check` | ESLint sin modificar |
| `npm run format` | Prettier con escritura |
| `npm run format:check` | Prettier en modo verificación |
| `npm run types:check` | `tsc --noEmit` |

### Artisan

```bash
php artisan test              # Suite completa
php artisan test --filter=CalendarViewTest
php artisan migrate:fresh --seed
php artisan route:list
php artisan optimize:clear
```

---

## Pruebas

La suite usa **Pest** con `RefreshDatabase` y cubre, entre otros:

- Autenticación y acceso a módulos.
- Aislamiento de datos entre hoteles.
- CRUD y restauración de los módulos de negocio.
- Paginación, búsqueda y filtros de los seis índices.
- Dashboard con métricas reales y estados sin datos.
- Calendario: cuadrícula mensual, rango de semanas, solapamiento de eventos, zona horaria, mes inválido y cambio de vista.
- Páginas de error.

Última ejecución de referencia: **91 pruebas, 727 aserciones, 3 omitidas**.

Comandos:

```bash
php artisan test
composer ci:check
```

---

## Convenciones del proyecto

- **Wayfinder** para rutas: importar `index`, `create`, `show`, etc. desde `@/routes/...` en lugar de escribir URLs a mano.
- **Aislamiento por hotel** mediante `BelongsToHotel`; nunca consultar tablas de negocio sin el scope activo.
- **Filtros validados** contra listas blancas en el controlador; valores inválidos se ignoran.
- **Paginación con `withQueryString()`** para conservar búsqueda y filtros.
- **Zona horaria del hotel** para límites de “hoy”, mes y agrupación de eventos.
- **Sin datos falsos**: si una métrica no puede calcularse, se muestra un estado honesto.
- **Formato**: Pint para PHP, Prettier + ESLint para TypeScript/React.
- **Componentes compartidos** antes de duplicar UI en una página.
- **No romper rutas ni funciones existentes**: los cambios de backend se acompañan de pruebas.

---

## Estructura de carpetas

```text
HotelSync/
├── app/
│   ├── Http/
│   │   ├── Controllers/          # Controladores por módulo + Settings
│   │   └── Middleware/           # ResolveCurrentHotel, Inertia, apariencia
│   ├── Models/                   # Modelos Eloquent y Concerns/BelongsToHotel
│   └── Support/CurrentHotel.php  # Resolución del tenant activo
├── bootstrap/
├── config/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── resources/
│   ├── css/app.css               # Tokens y estilos Tailwind
│   └── js/
│       ├── actions/              # Acciones generadas por Wayfinder
│       ├── components/
│       │   ├── charts/           # Gráficos Recharts
│       │   ├── rooms/            # Modales del plano
│       │   └── ui/               # Kit basado en Radix + Tailwind
│       ├── hooks/                # useRecordAction, apariencia, etc.
│       ├── layouts/              # App, auth y settings
│       ├── lib/                  # Formato, utilidades
│       ├── pages/                # Páginas Inertia por módulo
│       ├── routes/               # Rutas tipadas de Wayfinder
│       ├── types/                # Tipos compartidos (paginación, filtros)
│       └── app.tsx               # Entrada de Inertia + layouts
├── routes/
│   ├── web.php                   # Rutas de negocio
│   └── settings.php              # Perfil, seguridad y apariencia
├── tests/
│   ├── Feature/                  # Pruebas de módulos, filtros y calendario
│   └── Unit/
├── composer.json
├── package.json
├── vite.config.ts
└── README.md
```

---

## Limitaciones y próximos pasos

Estas funciones **no** están implementadas todavía y no se simulan en la interfaz:

- Gestión de gastos y comparativa ingresos vs. gastos.
- Registro de pagos y conciliación.
- Tipos de habitación, tarifas por temporada y fotografías.
- Check-in/check-out automatizados y folio de huésped.
- Historial de ocupación (solo existe el estado actual de la habitación).
- ITBIS 18 %, NCF y facturación electrónica (e-CF).
- Roles operativos detallados (recepción, housekeeping, finanzas).
- Depósitos, inventario y pagos en línea.
- Almacenamiento de imágenes local vs. S3.

---

## Licencia

Proyecto privado de gestión hotelera. El skeleton base de Laravel se distribuye bajo licencia MIT; el código de negocio de HotelSync pertenece a sus autores.
