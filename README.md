# HotelSync

![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.3%2B-777BB4?logo=php&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Inertia](https://img.shields.io/badge/Inertia.js-3-9553E9?logo=inertia&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Pest](https://img.shields.io/badge/Pest-4.7-0B7A5C?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-compatible-4479A1?logo=mysql&logoColor=white)

Sistema de gestión hotelera multi-sucursal construido sobre **Laravel + Inertia + React**. Centraliza clientes, habitaciones, reservas, facturación, calendario y la operación diaria de uno o varios hoteles desde una sola aplicación.

Cuenta con seis módulos operativos —**Recepción**, **Finanzas**, **Inventario**, **Servicios**, **Empleados** y **Reportes**— además del núcleo de huéspedes, habitaciones, reservas, calendario y facturación.

La interfaz sigue un lenguaje visual premium inspirado en dashboards analíticos modernos: barra lateral navy, superficies blancas, acento azul, tipografía **Instrument Sans**, modo claro/oscuro y componentes reutilizables.

---

## Tabla de contenido

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Roles y permisos](#roles-y-permisos)
- [Módulos](#módulos)
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
| 🐘 PHP | `^8.3` (probado con 8.5) | Lenguaje del servidor |
| 🚀 Laravel | `^13.17` | Framework principal |
| 🧩 Inertia Laravel | `^3.0` | Puente servidor → React sin API REST separada |
| 🔐 Laravel Fortify | `^1.37` | Autenticación, verificación y seguridad |
| 🧭 Laravel Wayfinder | `^0.1.14` | Helpers de rutas tipados para TypeScript |
| 🧪 Laravel Tinker | `^3.0` | Consola interactiva |
| 🛠️ Laravel Chisel | `^0.1.0` | Utilidades del starter kit |
| 🕒 Carbon | incluido en Laravel | Fechas y zonas horarias |
| 🗄️ SQLite / MySQL / PostgreSQL | — | Base de datos (SQLite por defecto) |

### Frontend

| Tecnología | Versión | Uso |
| --- | --- | --- |
| ⚛️ React | `^19.2` | Interfaz |
| 🔷 TypeScript | `^5.7` | Tipado estricto |
| 🧩 Inertia React | `^3.0` | Componentes de página y navegación |
| ⚡ Vite | `^8.0` | Bundler y servidor de desarrollo |
| 🎨 Tailwind CSS | `^4.1` | Estilos utilitarios y tokens de diseño |
| ♿ Radix UI | varios paquetes | Primitivas accesibles (dialog, select, dropdown, tooltip, etc.) |
| ✨ Lucide React | `^0.475` | Iconografía |
| 📊 Recharts | `^3.11` | Gráficos del dashboard y reportes |
| 🔔 Sonner | `^2.0` | Notificaciones toast |
| 🧱 class-variance-authority + clsx + tailwind-merge | — | Variantes y composición de clases |
| ⚙️ React Compiler (Babel) | `^1.0` | Optimización de render |

### Herramientas

| Herramienta | Uso |
| --- | --- |
| 🧪 Pest `^4.7` + Pest Laravel | Pruebas automatizadas |
| 🖌️ Laravel Pint `^1.27` | Formato de PHP |
| 🔍 Larastan / PHPStan `^3.9` | Análisis estático de PHP |
| 🧹 ESLint `^9` | Reglas de JavaScript/TypeScript |
| 💅 Prettier `^3.4` + plugin Tailwind | Formato de frontend |
| 🩺 Laravel Pail / Sail / Boost | Diagnóstico y entorno local |
| 🤖 GitHub Actions (opcional) | CI mediante `composer ci:check` |

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

> Regenera los helpers con `php artisan wayfinder:generate --with-form`. Sin `--with-form` se eliminan los helpers `.form` que usan los formularios de autenticación.

### Zonas horarias

- La aplicación guarda timestamps en UTC (`APP_TIMEZONE=UTC`).
- Cada hotel define su zona horaria (`America/Santo_Domingo` por defecto).
- Dashboard, recepción, calendario y reportes calculan “hoy”, límites de mes, rangos de reporte y agrupación por día usando la zona del hotel, convirtiendo los límites a UTC antes de consultar.

### Estado del servidor y filtros

Los índices de todos los módulos comparten el mismo patrón:

- Paginación con `withQueryString()` y parámetros de página independientes por tabla (`bills_page`, `payments_page`, `detail_page`, etc.).
- Búsqueda con debounce y filtros validados en el servidor contra listas blancas.
- Filtros persistidos en la URL para compartir o recargar la vista.
- Confirmaciones de anulación/desactivación con diálogo propio, sin `window.confirm()`.
- Estados de carga, vacío y error visibles.

### Autorización

- Los roles viven en `hotel_user.role`; las habilidades se declaran en `App\Support\Permission` y `App\Support\Role`.
- Cada habilidad define en código qué roles la poseen. No se usa Spatie ni permisos editables en base de datos.
- Laravel Gates, policies y `AuthorizesRequests` validan **cada endpoint de escritura**.
- Las habilidades se comparten con Inertia para ocultar acciones no permitidas; la interfaz nunca sustituye la validación del servidor.

### Dinero, inventario y trazabilidad

- **Facturado**, **cobrado**, **pendiente** y **gastos** son cifras independientes: una factura no es un cobro y nunca se suman dos veces.
- Los movimientos financieros son *append-only*. Una anulación crea el movimiento opuesto con `reversal_of_id`; no se borra historia.
- Una factura con cobros registrados no puede anularse.
- El inventario combina una columna `stock` (saldo consultable) con el libro `inventory_movements`. Cada movimiento se aplica dentro de una transacción y actualiza el saldo en la misma operación.
- Las salidas nunca pueden dejar existencias negativas sin autorización.
- Pagos, gastos, movimientos de inventario y solicitudes de servicio aceptan claves de idempotencia únicas por hotel para evitar duplicados.
- `audit_logs` registra actor, acción, entidad y cambios relevantes de las operaciones sensibles.

---

## Roles y permisos

### Roles

| Rol (`hotel_user.role`) | Nombre visible | Alcance |
| --- | --- | --- |
| `owner` | Propietario | Acceso total al hotel |
| `admin` | Administrador | Gestión completa salvo acciones reservadas al propietario |
| `recepcion` | Recepción | Llegadas, salidas, habitaciones, incidencias y solicitudes |
| `finanzas` | Finanzas | Facturación, cobros, gastos, anulaciones y exportación |
| `inventario` | Inventario | Catálogo, entradas, salidas y ajustes |
| `servicios` | Servicios | Catálogo y solicitudes de servicio |
| `rrhh` | Recursos Humanos | Expedientes, datos sensibles y accesos |

### Matriz de habilidades

| Habilidad | owner | admin | recepcion | finanzas | inventario | servicios | rrhh |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `reception.view` / `reception.operate` / `reception.incidents` | ✅ | ✅ | ✅ | — | — | — | — |
| `finance.view` / `finance.manage` / `finance.void` | ✅ | ✅ | — | ✅ | — | — | — |
| `inventory.view` / `inventory.manage` / `inventory.adjust` | ✅ | ✅ | — | — | ✅ | — | — |
| `services.view` / `services.manage` | ✅ | ✅ | ✅ | — | — | ✅ | — |
| `services.bill` | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| `employees.view` / `employees.manage` / `employees.sensitive` / `employees.access` | ✅ | ✅ | — | — | — | — | ✅ |
| `reports.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reports.export` | ✅ | ✅ | — | ✅ | — | — | — |
| `rooms.view` | ✅ | ✅ | ✅ | ✅ | — | ✅ | — |
| `rooms.manage` / `rooms.layout` | ✅ | ✅ | — | — | — | — | — |
| `settings.manage` | ✅ | ✅ | — | — | — | — | — |

> Los empleados **no** son usuarios automáticamente. Vincular un empleado a una cuenta requiere `employees.access`. Los campos sensibles (documentos, contacto personal, salario) solo se exponen con `employees.sensitive`.

---

## Módulos

### 📊 Dashboard

Métricas reales calculadas en el backend, sin datos de ejemplo:

- Ingresos facturados de hoy y del mes (facturas no anuladas).
- Cobros registrados, separados de la facturación emitida.
- Comparativas contra el día/mes anterior; cuando no hay base se muestra un estado honesto de “no disponible”.
- Reservas activas, pendientes y huéspedes en casa.
- Ocupación actual por estado de habitación.
- Series de ingresos, tendencia de reservas, distribución de habitaciones y reservas por estado con Recharts.
- Reservas recientes, próximos check-in/check-out y facturas recientes.
- Estados vacíos cuando aún no existen datos.

### 🛎️ Recepción

Centro de operaciones diario con pestañas y paginación independiente:

- KPIs de llegadas, salidas, huéspedes alojados, habitaciones disponibles y salidas atrasadas.
- **Llegadas** del día con check-in y asignación de habitación.
- **Salidas** con check-out, cierre de la estancia y liberación de la habitación.
- **Huéspedes alojados** con acceso al expediente operativo del cliente.
- **Habitaciones** con cambio de estado (`disponible`, `ocupada`, `reservada`, `mantenimiento`).
- **Incidencias** con creación, seguimiento y cierre.
- Cambio de habitación de una estancia activa.
- Filtros por fecha, búsqueda y estado; paginación `arrivals_page`, `departures_page`, `in_house_page`, `rooms_page`, `incidents_page`.
- Historial de asignaciones (`room_assignments`) y cambios de estado (`room_status_logs`).

### 💰 Finanzas

Facturación, cobros, gastos y libro de movimientos:

- KPIs de **facturado**, **cobrado**, **gastos**, **flujo neto** y **pendiente por cobrar**, con comparativa contra el período anterior.
- Pestañas de **facturas**, **cobros**, **gastos** y **movimientos**, cada una con paginación propia.
- Registro de cobros con método, referencia, fecha y notas.
- Registro de gastos por categoría, método y fecha.
- Anulación con motivo de facturas, cobros y gastos: genera movimientos de reverso y conserva la historia.
- Bloqueo de anulación de facturas con cobros registrados.
- Edición de la facturación base desde el módulo de facturación.
- Exportación CSV compatible con Excel.
- Búsqueda, filtros por fecha, tipo y estado.

### 📦 Inventario

Catálogo y libro de existencias:

- KPIs de artículos activos, unidades en stock, artículos bajo mínimo, agotados y valor del inventario.
- Catálogo con SKU único por hotel, categoría, unidad, mínimo y costo unitario.
- Entradas, salidas y ajustes con motivo y referencia.
- Actualización transaccional del saldo y del libro de movimientos.
- Reverso de movimientos sin borrar historia (`vigente`, `reverso`, `anulado`).
- Protección contra existencias negativas no autorizadas.
- Idempotencia por hotel para evitar movimientos duplicados.
- Filtros por categoría, estado y búsqueda; paginación `items_page` y `movements_page`.

### ✨ Servicios

Catálogo y solicitudes de huéspedes:

- KPIs de servicios activos, solicitudes del período, abiertas, listas para facturar e ingresos facturados.
- Catálogo con nombre, categoría, descripción, precio y estado.
- Solicitudes con cliente, servicio, cantidad, precio unitario, total y notas.
- Ciclo de vida `pendiente → en_proceso → completado → facturado`, con `anulado`.
- Facturación de una solicitud como línea de factura, sin duplicar cargos.
- Anulación con motivo y trazabilidad.
- Idempotencia por hotel en la creación de solicitudes.
- Filtros por estado, categoría y fecha; paginación `services_page` y `requests_page`.

### 👥 Empleados

Directorio y expedientes del equipo:

- KPIs de activos, en licencia, inactivos, ingresos del mes, accesos vinculados y nómina mensual.
- Datos básicos visibles con `employees.view`; datos sensibles solo con `employees.sensitive`.
- Estados `activo`, `licencia` e `inactivo`. Una salida se registra como `inactivo`; nunca se borra al empleado.
- Vinculación y revocación de acceso al hotel solo con `employees.access`.
- Los empleados no se convierten en usuarios automáticamente.
- Búsqueda, filtros por estado y departamento; paginación `employees_page`.

### 📈 Reportes

Centro de reportes con datos reales, comparativas y exportación:

- Pestañas **Resumen**, **Finanzas**, **Operación**, **Servicios** e **Inventario**.
- Presets de período (`Este mes`, `Mes anterior`, `Últimos 30 días`, `Este año`) y rango personalizado, limitado a 366 días.
- KPIs de facturado, cobrado, pendiente por cobrar, gastos, flujo neto, ocupación, habitaciones-noche, huéspedes, reservas, ingresos por servicios y ticket medio.
- Comparación contra el período anterior con variación porcentual.
- Gráficos interactivos de evolución diaria de ingresos/gastos y ocupación.
- Desgloses de gastos por categoría, cobros por método, reservas por estado, servicios más solicitados y stock bajo.
- Tablas de detalle paginadas por pestaña (`detail_page`) con búsqueda.
- Exportación **CSV** (UTF-8 con BOM, compatible con Excel) e impresión del navegador para PDF.
- El reporte siempre usa el hotel activo y excluye documentos anulados o inactivos.

### 🗓️ Calendario

- **Vista mensual** tipo calendario: cuadrícula de 7 columnas, navegación anterior/siguiente, botón “Hoy”, zona horaria del hotel y fines de semana diferenciados.
- Eventos coloreados por tipo: `evento`, `bloqueo` y `mantenimiento`.
- Eventos de varios días visibles en cada día que ocupan.
- Hasta tres eventos por celda; “+N más” abre el detalle del día.
- Clic en el `+` de un día abre el formulario con fecha y hora precargadas.
- **Vista de lista** con tabla, paginación, búsqueda y filtros.
- Filtros compartidos entre ambas vistas; mes y vista se conservan al filtrar.
- Leyenda con conteo por tipo y estado vacío honesto.
- Carga con esqueleto y respeto a la zona horaria del hotel.

### 🛏️ Habitaciones, áreas y camas

- CRUD de habitaciones con capacidad, precio, estado, descripción y contacto.
- Plano interactivo por área con **arrastrar y soltar** para posicionar habitaciones.
- Creación de áreas y habitaciones desde modales.
- Modal de detalle de habitación.
- CRUD de camas asociadas a áreas.
- Vista de detalle de habitación con información operativa.

### 🧾 Huéspedes, reservas y facturación

- CRUD de clientes con cédula/RNC único por hotel, dirección y teléfono; desactivación y restauración sin borrado físico.
- CRUD de reservas con cliente, habitación y usuario; estados `Pendiente`, `Confirmada`, `En curso`, `Finalizada` y `Cancelada`.
- Facturas con número único por hotel, cliente, reserva, subtotal, impuesto, total, estado y notas.
- Líneas de factura con descripción, cantidad, precio unitario y subtotal.
- Búsqueda, filtros y paginación en cada índice.

### 🏢 Sucursales y edificios

- CRUD de sucursales con descripción, teléfono y estado.
- CRUD de edificios vinculados a sucursal, con dirección, pisos y descripción.

### ⚙️ Configuración del hotel

Centro único en `/settings`, con dos grupos:

- **Mi cuenta**: perfil, seguridad y apariencia (tema claro, oscuro o del sistema).
- **Hotel**: visible solo con la habilidad `settings.manage` (propietario y administrador).

La sección **Hotel** modifica datos reales del hotel activo; nunca acepta un `hotel_id` del frontend:

- **General**: nombre comercial, razón social, RNC, dirección, teléfono y correo. Se guardan en columnas de `hotels`.
- **Regional**: moneda, zona horaria e idioma. El formato de fechas, números e importes se aplica en toda la interfaz desde las props compartidas.
- **Reservaciones**: horario de check-in/check-out y estancia mínima/máxima. El servidor valida las noches y la capacidad de la habitación al crear o editar reservas.
- **Finanzas**: porcentaje de impuesto y prefijo de numeración. Solo afectan a las facturas nuevas generadas desde Servicios; las facturas históricas no se recalculan.
- **Habitaciones**: paleta de colores de los estados operativos, compartida con el plano y la recepción.

Cada sección incluye buscador, indicador de cambios sin guardar, descarte, guardado y restauración de predeterminados con confirmación. Los cambios se validan y autorizan en Laravel y quedan registrados en `audit_logs`.

### 🔔 Notificaciones

- El menú mantiene un estado vacío explícito. No se inventan alertas mientras no exista un motor de notificaciones.

---

## Modelo de datos

| Tabla | Propósito | Relaciones principales |
| --- | --- | --- |
| `hotels` | Hotel/tenant | `users`, `clients`, `areas`, `rooms`, `beds`, `reservations`, `branches` |
| `hotel_user` | Acceso y rol por hotel | `hotel_id`, `user_id`, `role` |
| `users` | Usuarios autenticados | `hotels` (muchos a muchos) |
| `clients` | Huéspedes y clientes fiscales | `reservations`, `bills`, `payments`, `service_requests` |
| `areas` | Zonas del plano | `rooms`, `beds` |
| `rooms` | Habitaciones | `area`, `reservations`, `calendar`, `room_assignments` |
| `beds` | Camas por área | `area` |
| `reservations` | Reservas y estancias | `client`, `room`, `user`, `bills`, `calendarEvents`, `assignments`, `incidents` |
| `room_assignments` | Historial de habitación por estancia | `reservation`, `fromRoom`, `toRoom`, `assignedBy` |
| `room_status_logs` | Historial de estados de habitación | `room`, `reservation`, `changedBy` |
| `incidents` | Incidencias de recepción | `room`, `reservation`, `reportedBy`, `resolvedBy` |
| `calendar` | Eventos, bloqueos y mantenimientos | `room`, `reservation` |
| `branches` | Sucursales | `buildings` |
| `buildings` | Edificios | `branch` |
| `bills` | Facturas | `client`, `reservation`, `details`, `payments`, `voidedBy` |
| `bill_details` | Líneas de factura | `bill` |
| `payments` | Cobros registrados | `bill`, `client`, `createdBy`, `movements` |
| `expenses` | Gastos registrados | `createdBy`, `movements` |
| `finance_movements` | Libro append-only de ingresos/egresos | `source`, `reversalOf`, `createdBy` |
| `inventory_items` | Catálogo y saldo actual | `movements` |
| `inventory_movements` | Libro de entradas, salidas y ajustes | `item`, `createdBy`, `reversalOf` |
| `services` | Catálogo de servicios | `requests` |
| `service_requests` | Solicitudes de servicio | `service`, `client`, `reservation`, `bill`, `createdBy` |
| `employees` | Expedientes del equipo | `user` (acceso opcional) |
| `audit_logs` | Trazabilidad de operaciones sensibles | `user`, `subject` (polimórfico) |

Todas las tablas de negocio incluyen `hotel_id`, `active` y marcas de tiempo. Los documentos de cliente (`cedula`, `rnc`) son únicos dentro de cada hotel.

La columna JSON `hotels.settings` guarda las preferencias del hotel en secciones tipadas: `regional` (`locale`), `reservations` (`check_in_time`, `check_out_time`, `min_nights`, `max_nights`), `finance` (`tax_rate`, `invoice_prefix`) y `room_status_colors`. Las claves desconocidas se preservan al escribir, de modo que nuevas secciones pueden convivir con instalaciones existentes.

---

## Rutas principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/dashboard` | Dashboard analítico |
| `GET` | `/reception` | Centro de recepción |
| `GET` | `/reception/guests/{client}` | Expediente operativo del huésped |
| `POST` | `/reception/reservations/{reservation}/check-in` | Registrar check-in |
| `POST` | `/reception/reservations/{reservation}/check-out` | Registrar check-out |
| `PATCH` | `/reception/reservations/{reservation}/room` | Cambiar habitación |
| `POST` | `/reception/incidents` | Crear incidencia |
| `PATCH` | `/reception/incidents/{incident}` | Actualizar incidencia |
| `PATCH` | `/reception/rooms/{room}/status` | Cambiar estado de habitación |
| `GET` | `/finance` | Centro financiero |
| `GET` | `/finance/export` | Exportar movimientos financieros (CSV) |
| `POST` | `/finance/payments` | Registrar cobro |
| `POST` | `/finance/payments/{payment}/void` | Anular cobro |
| `POST` | `/finance/expenses` | Registrar gasto |
| `POST` | `/finance/expenses/{expense}/void` | Anular gasto |
| `POST` | `/finance/bills/{bill}/void` | Anular factura |
| `GET` | `/inventory` | Catálogo y movimientos |
| `POST` | `/inventory/items` | Crear artículo |
| `PATCH` | `/inventory/items/{item}` | Actualizar artículo |
| `POST` | `/inventory/items/{item}/movements` | Registrar movimiento |
| `POST` | `/inventory/movements/{movement}/void` | Reversar movimiento |
| `GET` | `/services` | Catálogo y solicitudes |
| `POST` | `/services/catalog` | Crear servicio |
| `PATCH` | `/services/catalog/{service}` | Actualizar servicio |
| `POST` | `/services/requests` | Crear solicitud |
| `POST` | `/services/requests/{serviceRequest}/status` | Cambiar estado |
| `POST` | `/services/requests/{serviceRequest}/void` | Anular solicitud |
| `POST` | `/services/requests/{serviceRequest}/bill` | Facturar solicitud |
| `GET` | `/employees` | Directorio de empleados |
| `POST` | `/employees` | Crear empleado |
| `PATCH` | `/employees/{employee}` | Actualizar empleado |
| `POST` | `/employees/{employee}/access` | Vincular acceso |
| `DELETE` | `/employees/{employee}/access` | Revocar acceso |
| `GET` | `/reports` | Centro de reportes |
| `GET` | `/reports/export` | Exportar reporte (CSV) |
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
| `GET` | `/settings/hotel/general` | Identidad y contacto del hotel |
| `PATCH` | `/settings/hotel/general` | Guardar identidad del hotel |
| `GET` | `/settings/hotel/regional` | Moneda, zona horaria e idioma |
| `PATCH` | `/settings/hotel/regional` | Guardar configuración regional |
| `GET` | `/settings/hotel/reservations` | Política de reservaciones |
| `PATCH` | `/settings/hotel/reservations` | Guardar política de reservaciones |
| `GET` | `/settings/hotel/finance` | Impuesto y numeración |
| `PATCH` | `/settings/hotel/finance` | Guardar configuración financiera |
| `GET` | `/settings/hotel/rooms` | Colores de estados de habitación |
| `PATCH` | `/settings/hotel/{section}/reset` | Restaurar predeterminados de una sección |
| `PATCH` | `/hotels/current/settings` | Guardar la paleta de habitaciones |

Los recursos clásicos usan `Route::resources(...)` y generan las rutas estándar `index`, `create`, `store`, `show`, `edit`, `update` y `destroy`.

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

- `PageHeader`, `EmptyState`, `DataTable`, `Pagination`, `StatusBadge`, `StatCard`, `ChartCard`.
- `ListFilters`: búsqueda con debounce y selects que resetean la paginación y conservan parámetros extra (mes, pestaña, rango de fechas).
- `RowActions`: menú estable de acciones por fila.
- `ConfirmDialog`: confirmaciones de anulación/desactivación.
- `useRecordAction`: máquina de estados compartida para acciones de registro.
- `Skeleton`, `Spinner`, `Badge`, `Button`, `Dialog`, `Select`, `Tooltip`, `DropdownMenu`, `Sheet`, `Sidebar`.
- Gráficos: `RevenueAreaChart`, `ReservationTrendChart`, `RoomDistributionChart`, `DonutChart`, `FinanceTrendChart`, `ReportPerformanceChart`, `ReportOccupancyChart`.

### Reglas de interfaz

- Modo claro y oscuro.
- Diseño responsive con barra lateral colapsable.
- Estados de carga, vacío y error visibles.
- Validación de formularios en servidor y mensajes por campo; la validación del cliente es solo ayuda visual.
- Confirmación antes de anular, desactivar o restaurar.
- Fechas y moneda formateadas para `es-DO` (`DOP` por defecto), sin desplazar fechas solo-fecha por zona horaria.
- Acciones sensibles ocultas según permisos compartidos por Inertia.
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
php artisan test --filter=ReportsTest
php artisan wayfinder:generate --with-form
php artisan migrate:fresh --seed
php artisan route:list
php artisan optimize:clear
```

---

## Pruebas

La suite usa **Pest** con `RefreshDatabase` y cubre, entre otros:

- Autenticación, acceso a módulos y matriz de permisos.
- Aislamiento de datos entre hoteles y trazabilidad en `audit_logs`.
- CRUD y restauración de los módulos de negocio.
- Paginación, búsqueda y filtros de todos los índices.
- Flujo de recepción: check-in, check-out, cambio de habitación, estados e incidencias.
- Finanzas: cobros, gastos, idempotencia, anulación con reverso y bloqueo de facturas cobradas.
- Inventario: stock, movimientos, reversos y protección contra negativos.
- Servicios: catálogo, ciclo de solicitudes, facturación y anulación.
- Empleados: privacidad de datos sensibles y vinculación/revocación de accesos.
- Reportes: separación de cifras, ocupación, aislamiento por hotel, paginación, límite de 366 días y exportación protegida.
- Calendario: cuadrícula mensual, rango de semanas, solapamiento de eventos, zona horaria, mes inválido y cambio de vista.
- Páginas de error.

Última ejecución de referencia: **199 pruebas, 1642 aserciones, 3 omitidas** (196 aprobadas).

Comandos:

```bash
php artisan test
composer ci:check
```

---

## Convenciones del proyecto

- **Wayfinder** para rutas: importar `index`, `create`, `show`, etc. desde `@/routes/...`; no escribir URLs a mano, salvo rutas no generadas. Regenerar con `--with-form`.
- **Aislamiento por hotel** mediante `BelongsToHotel`; nunca consultar tablas de negocio sin el scope activo.
- **Autorización en servidor** para cada endpoint de escritura mediante Gates y policies.
- **Filtros validados** contra listas blancas en el controlador; valores inválidos se ignoran.
- **Paginación con `withQueryString()`** y parámetros de página por tabla para conservar búsqueda y filtros.
- **Zona horaria del hotel** para límites de “hoy”, mes, períodos de reporte y agrupación de eventos.
- **Transacciones + idempotencia** en operaciones financieras y de inventario.
- **Sin borrado de historia**: anulaciones con reverso y estados, nunca eliminación de operaciones.
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
│   ├── Policies/                 # Policy del hotel y reglas asociadas
│   ├── Services/                 # Reglas de finanzas, inventario, servicios, auditoría
│   └── Support/                  # CurrentHotel, Role, Permission
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
│       │   ├── reception/        # Modales de check-in, cambio de habitación
│       │   ├── finance/          # Cobros, gastos, anulaciones
│       │   ├── inventory/        # Artículos y movimientos
│       │   ├── services/         # Catálogo, solicitudes y facturación
│       │   ├── employees/        # Expedientes y accesos
│       │   ├── reports/          # Gráficos del centro de reportes
│       │   ├── rooms/            # Modales del plano
│       │   └── ui/               # Kit basado en Radix + Tailwind
│       ├── hooks/                # useRecordAction, permisos, apariencia
│       ├── layouts/              # App, auth y settings
│       ├── lib/                  # Formato, etiquetas y utilidades
│       ├── pages/                # Páginas Inertia por módulo
│       ├── routes/               # Rutas tipadas de Wayfinder
│       ├── types/                # Tipos compartidos por módulo
│       └── app.tsx               # Entrada de Inertia + layouts
├── routes/
│   ├── web.php                   # Rutas de negocio
│   └── settings.php              # Cuenta, apariencia y configuración del hotel
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

- ITBIS 18 %, NCF y facturación electrónica (e-CF). El porcentaje de impuesto ya es configurable, pero no se emiten comprobantes fiscales ni se integra la DGII.
- Recálculo de facturas históricas al cambiar impuestos, moneda o numeración.
- Configuración de notificaciones, backups, correo saliente e integraciones: no se muestran porque esas funciones todavía no existen.
- Preferencias de usuario almacenadas en base de datos; hoy el tema se guarda en cookie/localStorage.
- Exportación a PDF/Excel nativo; hoy se ofrece CSV compatible con Excel e impresión del navegador.
- Consolidación de reportes entre varios hoteles; el centro de reportes trabaja con el hotel activo.
- Compras que generen gastos automáticamente (decisión de producto pendiente).
- Tipos de habitación, tarifas por temporada y fotografías.
- Historial de ocupación histórica más allá de las reservas y los reportes por período.
- Depósitos, pagos en línea y conciliación bancaria.
- Motor de notificaciones y alertas automáticas.
- Gestión documental de empleados y almacenamiento de imágenes local vs. S3.

---

## Licencia

Proyecto privado de gestión hotelera. El skeleton base de Laravel se distribuye bajo licencia MIT; el código de negocio de HotelSync pertenece a sus autores.
