<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Bed;
use App\Models\Bill;
use App\Models\BillDetail;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Calendar;
use App\Models\Client;
use App\Models\Employee;
use App\Models\Hotel;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\EmployeeService;
use App\Services\FinanceService;
use App\Services\InventoryService;
use App\Services\ReceptionService;
use App\Services\ServiceDeskService;
use App\Support\CurrentHotel;
use App\Support\Role;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Additive demo data for inspecting every module.
 *
 * It never resets the database: records are created with stable documents and
 * idempotency keys, and a demo client works as the marker so a second run is
 * a no-op. Financial and inventory operations go through the domain services
 * so the ledger, the cached balances and the audit trail stay correct.
 */
class DemoDataSeeder extends Seeder
{
    private const MARKER_CEDULA = '90000000001';

    private const PASSWORD = '12345678';

    private Hotel $hotel;

    private string $timezone;

    private CarbonImmutable $today;

    private AuditLogger $audit;

    private User $owner;

    /**
     * @var array<string, User>
     */
    private array $staff = [];

    public function run(): void
    {
        $hotel = Hotel::query()->where('slug', 'principal')->first()
            ?? Hotel::query()->orderBy('id')->first();

        if ($hotel === null) {
            $hotel = Hotel::create([
                'name' => 'Hotel Principal',
                'slug' => 'principal',
                'currency' => 'DOP',
                'timezone' => 'America/Santo_Domingo',
                'active' => true,
            ]);
        }

        $this->hotel = $hotel;
        $this->timezone = $hotel->timezone;
        $this->today = CarbonImmutable::now($this->timezone);
        $this->audit = app(AuditLogger::class);

        app(CurrentHotel::class)->set((int) $hotel->id);

        $owner = $this->ensureUser('Test User', 'test@example.com', Role::Owner);
        $this->owner = $owner;
        $this->staff = $this->ensureStaff();

        Auth::setUser($owner);

        $alreadySeeded = Client::query()
            ->where('hotel_id', $hotel->id)
            ->where('cedula', self::MARKER_CEDULA)
            ->exists();

        if ($alreadySeeded) {
            $this->command->info('Los datos de demostración ya existen; no se duplicaron.');

            return;
        }

        $branch = $this->ensureBranch();
        $this->ensureBuilding($branch);

        [$garden, $pool, $terrace] = $this->ensureAreas();

        $rooms = $this->ensureRooms($garden, $pool, $terrace);
        $this->ensureBeds($garden, $terrace);

        $clients = $this->ensureClients();

        /** @var array<string, Reservation> $reservations */
        $reservations = $this->seedReception($clients, $rooms);

        $this->seedFinance($clients, $reservations);
        $this->seedInventory();
        $this->seedServices($clients, $reservations);
        $this->seedEmployees();
        $this->seedOperationsExtras($reservations, $rooms);

        Auth::setUser($owner);

        $this->command->info('Datos de demostración agregados al hotel '.$hotel->name.'.');
    }

    private function ensureUser(string $name, string $email, Role $role): User
    {
        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make(self::PASSWORD),
            ],
        );

        $user->hotels()->syncWithoutDetaching([
            $this->hotel->id => ['role' => $role->value],
        ]);

        $user->forgetRoleCache();

        return $user;
    }

    /**
     * @return array<string, User>
     */
    private function ensureStaff(): array
    {
        $definitions = [
            ['key' => 'admin', 'name' => 'Alejandra Admin', 'email' => 'admin@hotelsync.test', 'role' => Role::Admin],
            ['key' => 'recepcion', 'name' => 'Rosa Delgado', 'email' => 'recepcion@hotelsync.test', 'role' => Role::Reception],
            ['key' => 'finanzas', 'name' => 'Pedro Castillo', 'email' => 'finanzas@hotelsync.test', 'role' => Role::Finance],
            ['key' => 'inventario', 'name' => 'Yamilet Ortiz', 'email' => 'inventario@hotelsync.test', 'role' => Role::Inventory],
            ['key' => 'servicios', 'name' => 'Daniel Reyes', 'email' => 'servicios@hotelsync.test', 'role' => Role::Services],
            ['key' => 'rrhh', 'name' => 'Carmen Lora', 'email' => 'rrhh@hotelsync.test', 'role' => Role::HumanResources],
        ];

        $staff = [];

        foreach ($definitions as $definition) {
            $staff[$definition['key']] = $this->ensureUser(
                $definition['name'],
                $definition['email'],
                $definition['role'],
            );
        }

        return $staff;
    }

    private function actor(string $key): User
    {
        $user = $this->staff[$key] ?? null;

        if (! $user instanceof User) {
            throw new RuntimeException("No se configuró el usuario de demostración [{$key}].");
        }

        return $user;
    }

    private function ensureBranch(): Branch
    {
        return Branch::query()->firstOrCreate(
            [
                'hotel_id' => $this->hotel->id,
                'name' => 'Sucursal Demo Zona Colonial',
            ],
            [
                'description' => 'Sucursal histórica usada para la demostración.',
                'phone_number' => '809-555-0101',
                'status' => true,
            ],
        );
    }

    private function ensureBuilding(Branch $branch): Building
    {
        return Building::query()->firstOrCreate(
            [
                'hotel_id' => $this->hotel->id,
                'name' => 'Edificio Demo Principal',
            ],
            [
                'branch_id' => $branch->id,
                'address' => 'Calle El Conde 120, Zona Colonial, Santo Domingo',
                'floors' => 4,
                'description' => 'Edificio principal con habitaciones y áreas comunes.',
                'active' => true,
            ],
        );
    }

    /**
     * @return array{0: Area, 1: Area, 2: Area}
     */
    private function ensureAreas(): array
    {
        $garden = Area::query()->firstOrCreate(
            ['hotel_id' => $this->hotel->id, 'name' => 'Área Demo Jardín'],
            ['x' => 20, 'y' => 20, 'width' => 420, 'height' => 300],
        );

        $pool = Area::query()->firstOrCreate(
            ['hotel_id' => $this->hotel->id, 'name' => 'Área Demo Piscina'],
            ['x' => 460, 'y' => 20, 'width' => 420, 'height' => 300],
        );

        $terrace = Area::query()->firstOrCreate(
            ['hotel_id' => $this->hotel->id, 'name' => 'Área Demo Terraza'],
            ['x' => 20, 'y' => 340, 'width' => 860, 'height' => 280],
        );

        return [$garden, $pool, $terrace];
    }

    /**
     * @return array<int, Room>
     */
    private function ensureRooms(Area $garden, Area $pool, Area $terrace): array
    {
        $definitions = [
            ['key' => 101, 'name' => 'Habitación 101', 'area' => $garden, 'capacity' => 2, 'price' => 5200, 'description' => 'Habitación doble con vista al jardín.', 'pos_x' => 40, 'pos_y' => 60],
            ['key' => 102, 'name' => 'Habitación 102', 'area' => $garden, 'capacity' => 3, 'price' => 6200, 'description' => 'Habitación familiar con balcón.', 'pos_x' => 190, 'pos_y' => 60],
            ['key' => 103, 'name' => 'Habitación 103', 'area' => $garden, 'capacity' => 2, 'price' => 4800, 'description' => 'Habitación estándar con cama queen.', 'pos_x' => 340, 'pos_y' => 60],
            ['key' => 201, 'name' => 'Habitación 201', 'area' => $pool, 'capacity' => 2, 'price' => 7200, 'description' => 'Vista directa a la piscina.', 'pos_x' => 480, 'pos_y' => 70],
            ['key' => 202, 'name' => 'Habitación 202', 'area' => $pool, 'capacity' => 4, 'price' => 8900, 'description' => 'Suite familiar junto a la piscina.', 'pos_x' => 630, 'pos_y' => 70],
            ['key' => 203, 'name' => 'Habitación 203', 'area' => $pool, 'capacity' => 2, 'price' => 5400, 'description' => 'Habitación doble con terraza privada.', 'pos_x' => 780, 'pos_y' => 70],
            ['key' => 301, 'name' => 'Suite 301', 'area' => $terrace, 'capacity' => 2, 'price' => 9800, 'description' => 'Suite con jacuzzi y vista panorámica.', 'pos_x' => 40, 'pos_y' => 380],
            ['key' => 302, 'name' => 'Suite 302', 'area' => $terrace, 'capacity' => 4, 'price' => 11500, 'description' => 'Suite presidencial con sala y comedor.', 'pos_x' => 220, 'pos_y' => 380],
            ['key' => 303, 'name' => 'Habitación 303', 'area' => $terrace, 'capacity' => 2, 'price' => 6100, 'description' => 'Habitación con salida a la terraza.', 'pos_x' => 400, 'pos_y' => 380],
        ];

        $rooms = [];

        foreach ($definitions as $definition) {
            $rooms[$definition['key']] = Room::query()->firstOrCreate(
                [
                    'hotel_id' => $this->hotel->id,
                    'name' => $definition['name'],
                ],
                [
                    'capacity' => $definition['capacity'],
                    'area_id' => $definition['area']->id,
                    'shape' => 'rectangle',
                    'pos_x' => $definition['pos_x'],
                    'pos_y' => $definition['pos_y'],
                    'width' => 120,
                    'height' => 90,
                    'rotation' => 0,
                    'active' => true,
                    'description' => $definition['description'],
                    'price' => $definition['price'],
                    'phone' => '809-555-02'.$definition['key'],
                    'status' => 'disponible',
                ],
            );
        }

        return $rooms;
    }

    private function ensureBeds(Area $garden, Area $terrace): void
    {
        $definitions = [
            ['name' => 'Cama Demo Jardín 1', 'area' => $garden, 'capacity' => 2, 'pos_x' => 80, 'pos_y' => 120],
            ['name' => 'Cama Demo Jardín 2', 'area' => $garden, 'capacity' => 1, 'pos_x' => 160, 'pos_y' => 120],
            ['name' => 'Cama Demo Terraza 1', 'area' => $terrace, 'capacity' => 2, 'pos_x' => 90, 'pos_y' => 430],
            ['name' => 'Cama Demo Terraza 2', 'area' => $terrace, 'capacity' => 2, 'pos_x' => 190, 'pos_y' => 430],
        ];

        foreach ($definitions as $definition) {
            Bed::query()->firstOrCreate(
                [
                    'hotel_id' => $this->hotel->id,
                    'name' => $definition['name'],
                ],
                [
                    'area_id' => $definition['area']->id,
                    'capacity' => $definition['capacity'],
                    'pos_x' => $definition['pos_x'],
                    'pos_y' => $definition['pos_y'],
                    'shape' => 'circle',
                    'width' => 60,
                    'height' => 60,
                    'rotation' => 0,
                    'active' => true,
                ],
            );
        }
    }

    /**
     * @return array<string, Client>
     */
    private function ensureClients(): array
    {
        $definitions = [
            ['key' => 'demo', 'cedula' => self::MARKER_CEDULA, 'first_name' => 'Cliente', 'last_name' => 'Demo Principal', 'address' => 'Av. Winston Churchill 95, Santo Domingo', 'phone_number' => '809-555-1000'],
            ['key' => 'ramirez', 'cedula' => '90000000002', 'first_name' => 'Carlos', 'last_name' => 'Ramírez', 'address' => 'Calle Las Damas 12, Zona Colonial', 'phone_number' => '809-555-1002'],
            ['key' => 'fernandez', 'cedula' => '90000000003', 'first_name' => 'Laura', 'last_name' => 'Fernández', 'address' => 'Av. Abraham Lincoln 452, Piantini', 'phone_number' => '809-555-1003'],
            ['key' => 'martinez', 'cedula' => '90000000004', 'first_name' => 'José', 'last_name' => 'Martínez', 'address' => 'Calle Gustavo Mejía Ricart 18, Naco', 'phone_number' => '809-555-1004'],
            ['key' => 'perez', 'cedula' => '90000000005', 'first_name' => 'Ana', 'last_name' => 'Pérez', 'address' => 'Av. Independencia 230, Gazcue', 'phone_number' => '809-555-1005'],
            ['key' => 'gomez', 'cedula' => '90000000006', 'first_name' => 'Luis', 'last_name' => 'Gómez', 'address' => 'Calle César Nicolás Penson 45, La Esperilla', 'phone_number' => '809-555-1006'],
            ['key' => 'nunez', 'cedula' => '90000000007', 'first_name' => 'Patricia', 'last_name' => 'Núñez', 'address' => 'Av. Sarasota 88, Bella Vista', 'phone_number' => '809-555-1007'],
            ['key' => 'santos', 'cedula' => '90000000008', 'first_name' => 'Miguel', 'last_name' => 'Santos', 'address' => 'Calle José Amado Soler 33, Naco', 'phone_number' => '809-555-1008'],
        ];

        $clients = [];

        foreach ($definitions as $definition) {
            $clients[$definition['key']] = Client::query()->firstOrCreate(
                [
                    'hotel_id' => $this->hotel->id,
                    'cedula' => $definition['cedula'],
                ],
                [
                    'first_name' => $definition['first_name'],
                    'last_name' => $definition['last_name'],
                    'rnc' => null,
                    'address' => $definition['address'],
                    'phone_number' => $definition['phone_number'],
                    'active' => true,
                ],
            );
        }

        return $clients;
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<int, Room>  $rooms
     * @return array<string, Reservation>
     */
    private function seedReception(array $clients, array $rooms): array
    {
        $reception = $this->actor('recepcion');
        Auth::setUser($reception);

        $now = CarbonImmutable::now('UTC');
        $reservations = [];

        $reservations['finished_garden'] = $this->createReservation(
            client: $clients['ramirez'],
            room: $rooms[102],
            arrival: $now->subDays(30),
            departure: $now->subDays(27),
            guests: 2,
            status: 'Finalizada',
            actor: $reception,
            checkedInAt: $now->subDays(30),
            checkedOutAt: $now->subDays(27),
            notes: 'Estancia de demostración finalizada.',
        );

        $reservations['finished_pool'] = $this->createReservation(
            client: $clients['fernandez'],
            room: $rooms[202],
            arrival: $now->subDays(70),
            departure: $now->subDays(66),
            guests: 3,
            status: 'Finalizada',
            actor: $reception,
            checkedInAt: $now->subDays(70),
            checkedOutAt: $now->subDays(66),
            notes: 'Estancia familiar de demostración.',
        );

        // The guest was booked in room 102 and received room 101 at the front
        // desk, so the demo leaves a room-assignment trace and a status log.
        $inHouse = $this->createReservation(
            client: $clients['demo'],
            room: $rooms[102],
            arrival: $now->subDay(),
            departure: $now->addDays(2),
            guests: 2,
            status: 'Confirmada',
            actor: $reception,
            notes: 'Huésped en casa para probar check-out y facturación.',
        );

        $reservations['in_house'] = app(ReceptionService::class)->checkIn(
            $inHouse,
            $reception,
            $rooms[101]->id,
        );

        $reservations['confirmed'] = $this->createReservation(
            client: $clients['martinez'],
            room: $rooms[201],
            arrival: $now->addDays(3),
            departure: $now->addDays(6),
            guests: 2,
            status: 'Confirmada',
            actor: $reception,
            notes: 'Llegada confirmada para la próxima semana.',
        );

        $reservations['pending'] = $this->createReservation(
            client: $clients['perez'],
            room: $rooms[103],
            arrival: $now->addDays(8),
            departure: $now->addDays(10),
            guests: 1,
            status: 'Pendiente',
            actor: $reception,
            notes: 'Pendiente de confirmación del huésped.',
        );

        $reservations['cancelled'] = $this->createReservation(
            client: $clients['gomez'],
            room: $rooms[301],
            arrival: $now->addDays(12),
            departure: $now->addDays(14),
            guests: 2,
            status: 'Cancelada',
            actor: $reception,
            notes: 'Cancelada por cambio de planes del huésped.',
        );

        foreach ($rooms as $key => $room) {
            if (in_array($key, [101, 102, 103, 201, 202, 301], true)) {
                continue;
            }

            $reservations['history_'.$key] = $this->createReservation(
                client: $clients['santos'],
                room: $room,
                arrival: $now->subDays(90 + ((int) $key % 30)),
                departure: $now->subDays(87 + ((int) $key % 30)),
                guests: 2,
                status: 'Finalizada',
                actor: $reception,
                checkedInAt: $now->subDays(90 + ((int) $key % 30)),
                checkedOutAt: $now->subDays(87 + ((int) $key % 30)),
                notes: 'Reserva histórica de demostración.',
            );
        }

        app(ReceptionService::class)->updateRoomStatus(
            $rooms[201],
            'reservada',
            $reception,
            'Reserva confirmada próxima',
        );

        app(ReceptionService::class)->updateRoomStatus(
            $rooms[203],
            'reservada',
            $reception,
            'Bloqueo temporal por llegada próxima',
        );

        app(ReceptionService::class)->updateRoomStatus(
            $rooms[303],
            'mantenimiento',
            $reception,
            'Mantenimiento preventivo programado',
        );

        $this->seedIncidents($reservations['in_house']);

        return $reservations;
    }

    private function createReservation(
        Client $client,
        Room $room,
        CarbonImmutable $arrival,
        CarbonImmutable $departure,
        int $guests,
        string $status,
        User $actor,
        ?CarbonImmutable $checkedInAt = null,
        ?CarbonImmutable $checkedOutAt = null,
        ?string $notes = null,
    ): Reservation {
        $reservation = Reservation::create([
            'hotel_id' => $this->hotel->id,
            'client_id' => $client->id,
            'room_id' => $room->id,
            'reserved_at' => $arrival,
            'finished_at' => $departure,
            'guests' => $guests,
            'notes' => $notes,
            'checked_in_at' => $checkedInAt,
            'checked_out_at' => $checkedOutAt,
            'checked_in_by' => $checkedInAt === null ? null : $actor->id,
            'checked_out_by' => $checkedOutAt === null ? null : $actor->id,
            'user_id' => $actor->id,
            'status' => $status,
            'active' => true,
        ]);

        $this->audit->record(
            module: 'reception',
            action: 'reservation_created',
            subject: $reservation,
            description: "Reservación #{$reservation->id} creada para {$client->first_name} {$client->last_name}",
            changes: [
                'client_id' => $client->id,
                'room_id' => $room->id,
                'reserved_at' => $arrival->toIso8601String(),
                'status' => $status,
            ],
        );

        return $reservation;
    }

    private function seedIncidents(Reservation $inHouse): void
    {
        $reception = $this->actor('recepcion');
        $service = app(ReceptionService::class);

        $open = $service->createIncident([
            'hotel_id' => $this->hotel->id,
            'reservation_id' => $inHouse->id,
            'room_id' => $inHouse->room_id,
            'type' => 'mantenimiento',
            'severity' => 'alta',
            'title' => 'Aire acondicionado con ruido',
            'description' => 'El huésped reporta ruido en el aire acondicionado durante la noche.',
        ], $reception);

        $service->updateIncident($open, 'en_proceso', $reception);

        $cleaning = $service->createIncident([
            'hotel_id' => $this->hotel->id,
            'room_id' => null,
            'type' => 'limpieza',
            'severity' => 'media',
            'title' => 'Limpieza profunda del lobby',
            'description' => 'Se solicita limpieza profunda después del evento corporativo.',
        ], $reception);

        $service->updateIncident(
            $cleaning,
            'resuelta',
            $reception,
            'El equipo de housekeeping completó la limpieza y repuso amenities.',
        );

        $service->createIncident([
            'hotel_id' => $this->hotel->id,
            'room_id' => null,
            'type' => 'seguridad',
            'severity' => 'baja',
            'title' => 'Revisión de cámara en pasillo',
            'description' => 'Mantenimiento revisará la cámara del pasillo del segundo nivel.',
        ], $reception);

        $service->createIncident([
            'hotel_id' => $this->hotel->id,
            'reservation_id' => $inHouse->id,
            'room_id' => $inHouse->room_id,
            'type' => 'huesped',
            'severity' => 'media',
            'title' => 'Solicitud de cuna adicional',
            'description' => 'El huésped solicita una cuna para la habitación.',
        ], $reception);
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, Reservation>  $reservations
     */
    private function seedFinance(array $clients, array $reservations): void
    {
        $financeUser = $this->actor('finanzas');
        Auth::setUser($financeUser);

        $finance = app(FinanceService::class);

        $partial = $this->createBill(
            number: 'FAC-DEMO-0001',
            client: $clients['demo'],
            reservation: $reservations['in_house'],
            issuedAt: $this->today->subDays(2),
            lines: [
                ['description' => 'Hospedaje 2 noches', 'quantity' => 2, 'unit_price' => 3200],
                ['description' => 'Minibar', 'quantity' => 1, 'unit_price' => 900],
                ['description' => 'Desayuno buffet', 'quantity' => 1, 'unit_price' => 1200],
            ],
            actor: $financeUser,
            notes: 'Factura con cobro parcial para probar el balance pendiente.',
        );

        $finance->registerPayment([
            'bill_id' => $partial->id,
            'method' => 'tarjeta',
            'amount' => 5000,
            'paid_at' => $this->today->subDay()->toDateString(),
            'reference' => 'POS-1001',
            'notes' => 'Abono inicial del huésped.',
            'idempotency_key' => 'demo-pay-0001',
        ], $financeUser);

        $paid = $this->createBill(
            number: 'FAC-DEMO-0002',
            client: $clients['ramirez'],
            reservation: $reservations['finished_garden'],
            issuedAt: $this->today->subDays(27),
            lines: [
                ['description' => 'Hospedaje 4 noches', 'quantity' => 4, 'unit_price' => 1550],
            ],
            actor: $financeUser,
            notes: 'Factura pagada en su totalidad.',
        );

        $finance->registerPayment([
            'bill_id' => $paid->id,
            'method' => 'transferencia',
            'amount' => 6200,
            'paid_at' => $this->today->subDays(26)->toDateString(),
            'reference' => 'TRF-8842',
            'idempotency_key' => 'demo-pay-0002',
        ], $financeUser);

        $family = $this->createBill(
            number: 'FAC-DEMO-0003',
            client: $clients['fernandez'],
            reservation: $reservations['finished_pool'],
            issuedAt: $this->today->subDays(66),
            lines: [
                ['description' => 'Hospedaje 2 noches', 'quantity' => 2, 'unit_price' => 1500],
                ['description' => 'Servicio de spa', 'quantity' => 1, 'unit_price' => 1300],
            ],
            actor: $financeUser,
        );

        $finance->registerPayment([
            'bill_id' => $family->id,
            'method' => 'efectivo',
            'amount' => 2000,
            'paid_at' => $this->today->subDays(65)->toDateString(),
            'idempotency_key' => 'demo-pay-0003a',
        ], $financeUser);

        $finance->registerPayment([
            'bill_id' => $family->id,
            'method' => 'tarjeta',
            'amount' => 2300,
            'paid_at' => $this->today->subDays(64)->toDateString(),
            'reference' => 'POS-2003',
            'idempotency_key' => 'demo-pay-0003b',
        ], $financeUser);

        $this->createBill(
            number: 'FAC-DEMO-0004',
            client: $clients['martinez'],
            reservation: $reservations['confirmed'],
            issuedAt: $this->today->subDays(4),
            lines: [
                ['description' => 'Hospedaje 1 noche', 'quantity' => 1, 'unit_price' => 3100],
            ],
            actor: $financeUser,
            notes: 'Factura pendiente sin cobros.',
        );

        $voidedPaymentBill = $this->createBill(
            number: 'FAC-DEMO-0005',
            client: $clients['perez'],
            reservation: $reservations['pending'],
            issuedAt: $this->today->subDays(20),
            lines: [
                ['description' => 'Hospedaje 1 noche', 'quantity' => 1, 'unit_price' => 1800],
            ],
            actor: $financeUser,
            notes: 'Factura con un cobro anulado para probar la reversa.',
        );

        $voidedPayment = $finance->registerPayment([
            'bill_id' => $voidedPaymentBill->id,
            'method' => 'efectivo',
            'amount' => 800,
            'paid_at' => $this->today->subDays(19)->toDateString(),
            'reference' => 'CAJA-501',
            'idempotency_key' => 'demo-pay-0005a',
        ], $financeUser);

        $finance->voidPayment(
            $voidedPayment,
            $financeUser,
            'El huésped canceló el abono antes del check-in.',
        );

        $voidedBill = $this->createBill(
            number: 'FAC-DEMO-0006',
            client: $clients['gomez'],
            reservation: null,
            issuedAt: $this->today->subDays(15),
            lines: [
                ['description' => 'Reserva de salón para evento', 'quantity' => 1, 'unit_price' => 2500],
            ],
            actor: $financeUser,
            notes: 'Factura anulada para probar el estado Anulada.',
        );

        $finance->voidBill(
            $voidedBill,
            $financeUser,
            'El evento fue cancelado por el cliente.',
        );

        for ($monthsAgo = 0; $monthsAgo < 6; $monthsAgo++) {
            $issued = $this->monthlyDate($monthsAgo, 9);
            $paidAt = $this->monthlyDate($monthsAgo, 12);
            $lineTotal = 3500 + ($monthsAgo * 600);

            $monthly = $this->createBill(
                number: 'FAC-DEMO-M'.str_pad((string) ($monthsAgo + 1), 2, '0', STR_PAD_LEFT),
                client: $clients['nunez'],
                reservation: null,
                issuedAt: $issued,
                lines: [
                    ['description' => 'Hospedaje mensual', 'quantity' => 2, 'unit_price' => $lineTotal],
                ],
                actor: $financeUser,
                notes: 'Factura histórica para las gráficas de reportes.',
            );

            $finance->registerPayment([
                'bill_id' => $monthly->id,
                'method' => $this->paymentMethod($monthsAgo),
                'amount' => 2 * $lineTotal,
                'paid_at' => $paidAt->toDateString(),
                'reference' => 'MEN-'.str_pad((string) ($monthsAgo + 1), 3, '0', STR_PAD_LEFT),
                'idempotency_key' => 'demo-pay-m'.($monthsAgo + 1),
            ], $financeUser);
        }

        $expenses = [
            ['key' => 'demo-exp-1', 'category' => 'suministros', 'description' => 'Compra de suministros de limpieza', 'amount' => 4200, 'day' => 3, 'method' => 'transferencia', 'supplier' => 'Distribuidora Caribe'],
            ['key' => 'demo-exp-2', 'category' => 'mantenimiento', 'description' => 'Mantenimiento de aire acondicionado', 'amount' => 2800, 'day' => 12, 'method' => 'efectivo', 'supplier' => 'Clima Total'],
            ['key' => 'demo-exp-3', 'category' => 'servicios_basicos', 'description' => 'Energía eléctrica', 'amount' => 6500, 'day' => 5, 'method' => 'transferencia', 'supplier' => 'Edesur'],
            ['key' => 'demo-exp-4', 'category' => 'personal', 'description' => 'Nómina quincenal', 'amount' => 15000, 'day' => 15, 'method' => 'transferencia', 'supplier' => 'Nómina interna'],
            ['key' => 'demo-exp-5', 'category' => 'marketing', 'description' => 'Campaña en redes sociales', 'amount' => 3200, 'day' => 8, 'method' => 'tarjeta', 'supplier' => 'Agencia Creativa'],
            ['key' => 'demo-exp-6', 'category' => 'operativo', 'description' => 'Transporte de personal', 'amount' => 1800, 'day' => 6, 'method' => 'efectivo', 'supplier' => 'Transporte Ejecutivo'],
            ['key' => 'demo-exp-7', 'category' => 'suministros', 'description' => 'Compra de lencería', 'amount' => 5600, 'day' => 4, 'method' => 'cheque', 'supplier' => 'Textiles del Este'],
        ];

        foreach ($expenses as $index => $expense) {
            $finance->registerExpense([
                'category' => $expense['category'],
                'description' => $expense['description'],
                'amount' => $expense['amount'],
                'expense_date' => $this->monthlyDate(min($index, 4), $expense['day'])->toDateString(),
                'method' => $expense['method'],
                'supplier' => $expense['supplier'],
                'idempotency_key' => $expense['key'],
            ], $financeUser);
        }

        $voidedExpense = $finance->registerExpense([
            'category' => 'operativo',
            'description' => 'Servicio de jardinería duplicado',
            'amount' => 1200,
            'expense_date' => $this->today->subDays(18)->toDateString(),
            'method' => 'efectivo',
            'supplier' => 'Jardines Verdes',
            'idempotency_key' => 'demo-exp-void',
        ], $financeUser);

        $finance->voidExpense(
            $voidedExpense,
            $financeUser,
            'El gasto se registró dos veces por error.',
        );
    }

    /**
     * @param  list<array{description: string, quantity: int, unit_price: float}>  $lines
     */
    private function createBill(
        string $number,
        ?Client $client,
        ?Reservation $reservation,
        CarbonImmutable $issuedAt,
        array $lines,
        User $actor,
        ?string $notes = null,
    ): Bill {
        $subtotal = round(array_sum(array_map(
            fn (array $line): float => (float) $line['quantity'] * (float) $line['unit_price'],
            $lines,
        )), 2);

        $bill = Bill::create([
            'hotel_id' => $this->hotel->id,
            'client_id' => $client?->id,
            'reservation_id' => $reservation?->id,
            'number' => $number,
            'issued_at' => $issuedAt->toDateString(),
            'subtotal' => $subtotal,
            'tax' => 0,
            'total' => $subtotal,
            'status' => 'Pendiente',
            'notes' => $notes,
            'active' => true,
        ]);

        foreach ($lines as $line) {
            BillDetail::create([
                'bill_id' => $bill->id,
                'description' => $line['description'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'subtotal' => round((float) $line['quantity'] * (float) $line['unit_price'], 2),
            ]);
        }

        $this->audit->record(
            module: 'billing',
            action: 'bill_created',
            subject: $bill,
            description: "Factura {$bill->number} creada",
            changes: [
                'number' => $bill->number,
                'client_id' => $bill->client_id,
                'total' => $subtotal,
                'status' => 'Pendiente',
            ],
        );

        return $bill;
    }

    private function monthlyDate(int $monthsAgo, int $day): CarbonImmutable
    {
        $date = $this->today->startOfMonth()->subMonthsNoOverflow($monthsAgo)->addDays($day - 1);

        return $date->greaterThan($this->today) ? $this->today : $date;
    }

    private function paymentMethod(int $index): string
    {
        $methods = ['efectivo', 'tarjeta', 'transferencia', 'cheque'];

        return $methods[$index % count($methods)];
    }

    private function seedInventory(): void
    {
        $inventoryUser = $this->actor('inventario');
        Auth::setUser($inventoryUser);

        $inventory = app(InventoryService::class);

        $definitions = [
            ['key' => 'toallas', 'name' => 'Toallas de baño', 'sku' => 'DEMO-TOA', 'category' => 'lenceria', 'unit' => 'unidad', 'min_stock' => 20, 'unit_cost' => 350, 'entrada' => 60, 'salida' => 20],
            ['key' => 'sabanas', 'name' => 'Sábanas queen', 'sku' => 'DEMO-SAB', 'category' => 'lenceria', 'unit' => 'unidad', 'min_stock' => 15, 'unit_cost' => 1250, 'entrada' => 20, 'salida' => 8],
            ['key' => 'jabon', 'name' => 'Jabón de baño', 'sku' => 'DEMO-JAB', 'category' => 'amenidades', 'unit' => 'unidad', 'min_stock' => 30, 'unit_cost' => 45, 'entrada' => 20, 'salida' => 20],
            ['key' => 'agua', 'name' => 'Agua embotellada', 'sku' => 'DEMO-AGU', 'category' => 'bebidas', 'unit' => 'botella', 'min_stock' => 24, 'unit_cost' => 25, 'entrada' => 120, 'salida' => 60],
            ['key' => 'detergente', 'name' => 'Detergente líquido', 'sku' => 'DEMO-DET', 'category' => 'limpieza', 'unit' => 'litro', 'min_stock' => 10, 'unit_cost' => 480, 'entrada' => 10, 'salida' => 2],
            ['key' => 'papel', 'name' => 'Papel higiénico', 'sku' => 'DEMO-PAP', 'category' => 'papeleria', 'unit' => 'rollo', 'min_stock' => 40, 'unit_cost' => 35, 'entrada' => 150, 'salida' => 30],
            ['key' => 'bombillos', 'name' => 'Bombillos LED', 'sku' => 'DEMO-BOM', 'category' => 'mantenimiento', 'unit' => 'unidad', 'min_stock' => 10, 'unit_cost' => 210, 'entrada' => 40, 'salida' => 15],
            ['key' => 'cafe', 'name' => 'Café molido', 'sku' => 'DEMO-CAF', 'category' => 'alimentos', 'unit' => 'kilogramo', 'min_stock' => 10, 'unit_cost' => 850, 'entrada' => 40, 'salida' => 10],
        ];

        foreach ($definitions as $index => $definition) {
            $item = InventoryItem::query()
                ->where('hotel_id', $this->hotel->id)
                ->where('sku', $definition['sku'])
                ->first();

            if ($item === null) {
                $item = $inventory->createItem([
                    'name' => $definition['name'],
                    'sku' => $definition['sku'],
                    'category' => $definition['category'],
                    'unit' => $definition['unit'],
                    'min_stock' => $definition['min_stock'],
                    'unit_cost' => $definition['unit_cost'],
                    'active' => true,
                ], $inventoryUser);
            }

            $inventory->registerMovement($item, [
                'type' => InventoryMovement::ENTRADA,
                'quantity' => $definition['entrada'],
                'unit_cost' => $definition['unit_cost'],
                'reason' => 'Compra inicial de demostración',
                'reference' => 'OC-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'occurred_at' => $this->today->subDays(40 - $index)->toDateString(),
                'idempotency_key' => 'demo-inv-'.$definition['key'].'-in',
            ], $inventoryUser);

            $inventory->registerMovement($item, [
                'type' => InventoryMovement::SALIDA,
                'quantity' => $definition['salida'],
                'reason' => 'Consumo de demostración',
                'reference' => 'CON-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'occurred_at' => $this->today->subDays(10 - ($index % 8))->toDateString(),
                'idempotency_key' => 'demo-inv-'.$definition['key'].'-out',
            ], $inventoryUser);

            if ($definition['key'] === 'bombillos') {
                $inventory->registerMovement($item, [
                    'type' => InventoryMovement::AJUSTE,
                    'counted_stock' => 24,
                    'reason' => 'Conteo físico mensual',
                    'reference' => 'AJU-0001',
                    'occurred_at' => $this->today->toDateString(),
                    'idempotency_key' => 'demo-inv-bombillos-adjust',
                ], $inventoryUser);
            }

            if ($definition['key'] === 'cafe') {
                $extra = $inventory->registerMovement($item, [
                    'type' => InventoryMovement::ENTRADA,
                    'quantity' => 5,
                    'unit_cost' => $definition['unit_cost'],
                    'reason' => 'Entrada extra para probar una reversa',
                    'reference' => 'OC-EXTRA',
                    'occurred_at' => $this->today->subDays(3)->toDateString(),
                    'idempotency_key' => 'demo-inv-cafe-extra',
                ], $inventoryUser);

                $inventory->voidMovement(
                    $extra,
                    $inventoryUser,
                    'La entrada extra fue registrada por error.',
                );
            }
        }
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, Reservation>  $reservations
     */
    private function seedServices(array $clients, array $reservations): void
    {
        $servicesUser = $this->actor('servicios');
        Auth::setUser($servicesUser);

        $desk = app(ServiceDeskService::class);

        $catalog = [
            ['name' => 'Desayuno buffet', 'category' => 'restaurante', 'description' => 'Desayuno buffet completo para huéspedes.', 'price' => 650],
            ['name' => 'Cena romántica', 'category' => 'restaurante', 'description' => 'Cena de tres tiempos para dos personas.', 'price' => 2500],
            ['name' => 'Masaje relajante', 'category' => 'spa', 'description' => 'Masaje de 60 minutos con aceites esenciales.', 'price' => 1800],
            ['name' => 'Lavandería express', 'category' => 'lavanderia', 'description' => 'Servicio de lavandería en el día.', 'price' => 450],
            ['name' => 'Tour ciudad', 'category' => 'tour', 'description' => 'Recorrido guiado por la Zona Colonial.', 'price' => 1200],
            ['name' => 'Traslado aeropuerto', 'category' => 'transporte', 'description' => 'Traslado privado desde o hacia el aeropuerto.', 'price' => 1500],
            ['name' => 'Room service', 'category' => 'room_service', 'description' => 'Servicio a la habitación disponible 24 horas.', 'price' => 350],
            ['name' => 'Facial revitalizante', 'category' => 'spa', 'description' => 'Tratamiento facial de 45 minutos.', 'price' => 1600],
            ['name' => 'Cóctel de bienvenida', 'category' => 'bar', 'description' => 'Cóctel de bienvenida para huéspedes.', 'price' => 550],
        ];

        /** @var array<string, Service> $services */
        $services = [];

        foreach ($catalog as $definition) {
            $service = Service::query()
                ->where('hotel_id', $this->hotel->id)
                ->where('name', $definition['name'])
                ->first();

            if ($service === null) {
                $service = $desk->createService([
                    'name' => $definition['name'],
                    'category' => $definition['category'],
                    'description' => $definition['description'],
                    'price' => $definition['price'],
                    'active' => true,
                ], $servicesUser);
            }

            $services[$definition['name']] = $service;
        }

        $desk->createRequest([
            'service_id' => $services['Desayuno buffet']->id,
            'client_id' => $clients['demo']->id,
            'reservation_id' => $reservations['in_house']->id,
            'quantity' => 2,
            'unit_price' => 650,
            'requested_at' => $this->today->toDateString(),
            'notes' => 'Desayuno para la habitación 101.',
            'idempotency_key' => 'demo-srv-request-1',
        ], $servicesUser);

        $inProcess = $desk->createRequest([
            'service_id' => $services['Lavandería express']->id,
            'client_id' => $clients['ramirez']->id,
            'quantity' => 3,
            'unit_price' => 450,
            'requested_at' => $this->today->subDays(1)->toDateString(),
            'notes' => 'Lavandería solicitada por el huésped.',
            'idempotency_key' => 'demo-srv-request-2',
        ], $servicesUser);

        $desk->changeStatus($inProcess, ServiceRequest::EN_PROCESO, $servicesUser);

        $completed = $desk->createRequest([
            'service_id' => $services['Tour ciudad']->id,
            'client_id' => $clients['fernandez']->id,
            'quantity' => 2,
            'unit_price' => 1200,
            'requested_at' => $this->today->subDays(4)->toDateString(),
            'notes' => 'Tour programado para el fin de semana.',
            'idempotency_key' => 'demo-srv-request-3',
        ], $servicesUser);

        $desk->changeStatus($completed, ServiceRequest::COMPLETADO, $servicesUser);

        $billed = $desk->createRequest([
            'service_id' => $services['Cena romántica']->id,
            'client_id' => $clients['martinez']->id,
            'quantity' => 1,
            'unit_price' => 2500,
            'requested_at' => $this->today->subDays(7)->toDateString(),
            'notes' => 'Cena especial durante la estancia.',
            'idempotency_key' => 'demo-srv-request-4',
        ], $servicesUser);

        $desk->changeStatus($billed, ServiceRequest::COMPLETADO, $servicesUser);
        $billed = $desk->billRequest($billed, $servicesUser);

        if ($billed->bill_id !== null) {
            app(FinanceService::class)->registerPayment([
                'bill_id' => $billed->bill_id,
                'method' => 'tarjeta',
                'amount' => (float) $billed->total,
                'paid_at' => $this->today->subDays(2)->toDateString(),
                'reference' => 'POS-SRV-01',
                'idempotency_key' => 'demo-srv-pay-1',
            ], $this->actor('finanzas'));
        }

        $spa = $desk->createRequest([
            'service_id' => $services['Facial revitalizante']->id,
            'client_id' => $clients['santos']->id,
            'quantity' => 1,
            'unit_price' => 1600,
            'requested_at' => $this->today->subDays(3)->toDateString(),
            'notes' => 'Servicio de spa solicitado en recepción.',
            'idempotency_key' => 'demo-srv-request-5',
        ], $servicesUser);

        $desk->changeStatus($spa, ServiceRequest::COMPLETADO, $servicesUser);
        $desk->billRequest($spa, $servicesUser);

        $voided = $desk->createRequest([
            'service_id' => $services['Masaje relajante']->id,
            'client_id' => $clients['perez']->id,
            'quantity' => 1,
            'unit_price' => 1800,
            'requested_at' => $this->today->subDays(5)->toDateString(),
            'notes' => 'Solicitud que finalmente no se realizó.',
            'idempotency_key' => 'demo-srv-request-6',
        ], $servicesUser);

        $desk->voidRequest(
            $voided,
            $servicesUser,
            'El huésped canceló el servicio antes de la cita.',
        );

        // The pending request stays pending on purpose so the workflow can be
        // tested from the UI: en proceso -> completado -> facturado.
    }

    private function seedEmployees(): void
    {
        $hr = $this->actor('rrhh');
        Auth::setUser($hr);

        $employees = app(EmployeeService::class);

        $definitions = [
            ['key' => 'recepcion', 'first_name' => 'Rosa', 'last_name' => 'Delgado', 'cedula' => '00100000001', 'position' => 'Recepcionista', 'department' => 'recepcion', 'status' => 'activo', 'salary' => 28000, 'hire_date' => '2021-03-15', 'phone' => '809-555-2001', 'email' => 'rosa.delgado@hotelsync.test'],
            ['key' => 'finanzas', 'first_name' => 'Pedro', 'last_name' => 'Castillo', 'cedula' => '00100000002', 'position' => 'Contador', 'department' => 'administracion', 'status' => 'activo', 'salary' => 42000, 'hire_date' => '2019-08-01', 'phone' => '809-555-2002', 'email' => 'pedro.castillo@hotelsync.test'],
            ['key' => 'inventario', 'first_name' => 'Yamilet', 'last_name' => 'Ortiz', 'cedula' => '00100000003', 'position' => 'Encargada de almacén', 'department' => 'administracion', 'status' => 'activo', 'salary' => 32000, 'hire_date' => '2022-01-10', 'phone' => '809-555-2003', 'email' => 'yamilet.ortiz@hotelsync.test'],
            ['key' => 'servicios', 'first_name' => 'Daniel', 'last_name' => 'Reyes', 'cedula' => '00100000004', 'position' => 'Chef ejecutivo', 'department' => 'alimentos_bebidas', 'status' => 'activo', 'salary' => 55000, 'hire_date' => '2018-06-20', 'phone' => '809-555-2004', 'email' => 'daniel.reyes@hotelsync.test'],
            ['key' => 'rrhh', 'first_name' => 'Carmen', 'last_name' => 'Lora', 'cedula' => '00100000005', 'position' => 'Gerente de RRHH', 'department' => 'rrhh', 'status' => 'activo', 'salary' => 58000, 'hire_date' => '2017-11-05', 'phone' => '809-555-2005', 'email' => 'carmen.lora@hotelsync.test'],
            ['key' => 'admin', 'first_name' => 'Alejandra', 'last_name' => 'Admin', 'cedula' => '00100000006', 'position' => 'Administradora', 'department' => 'administracion', 'status' => 'activo', 'salary' => 65000, 'hire_date' => '2016-02-15', 'phone' => '809-555-2006', 'email' => 'alejandra.admin@hotelsync.test'],
            ['key' => 'mantenimiento', 'first_name' => 'José', 'last_name' => 'Núñez', 'cedula' => '00100000007', 'position' => 'Técnico de mantenimiento', 'department' => 'mantenimiento', 'status' => 'licencia', 'salary' => 26000, 'hire_date' => '2020-09-12', 'phone' => '809-555-2007', 'email' => 'jose.nunez@hotelsync.test'],
            ['key' => 'housekeeping', 'first_name' => 'Marta', 'last_name' => 'Jiménez', 'cedula' => '00100000008', 'position' => 'Supervisora de housekeeping', 'department' => 'housekeeping', 'status' => 'activo', 'salary' => 30000, 'hire_date' => '2021-07-19', 'phone' => '809-555-2008', 'email' => 'marta.jimenez@hotelsync.test'],
            ['key' => 'seguridad', 'first_name' => 'Rafael', 'last_name' => 'Peña', 'cedula' => '00100000009', 'position' => 'Agente de seguridad', 'department' => 'seguridad', 'status' => 'inactivo', 'salary' => 24000, 'hire_date' => '2019-04-01', 'phone' => '809-555-2009', 'email' => 'rafael.pena@hotelsync.test'],
        ];

        /** @var array<string, Employee> $created */
        $created = [];

        foreach ($definitions as $definition) {
            $employee = Employee::query()
                ->where('hotel_id', $this->hotel->id)
                ->where('cedula', $definition['cedula'])
                ->first();

            if ($employee === null) {
                $employee = $employees->create([
                    'first_name' => $definition['first_name'],
                    'last_name' => $definition['last_name'],
                    'cedula' => $definition['cedula'],
                    'birth_date' => '1990-01-01',
                    'phone' => $definition['phone'],
                    'email' => $definition['email'],
                    'address' => 'Santo Domingo, República Dominicana',
                    'position' => $definition['position'],
                    'department' => $definition['department'],
                    'hire_date' => $definition['hire_date'],
                    'status' => $definition['status'],
                    'salary' => $definition['salary'],
                    'bank_account' => '000-123456-'.substr($definition['cedula'], -1),
                    'emergency_contact_name' => 'Contacto de emergencia',
                    'emergency_contact_phone' => '809-555-2999',
                    'notes' => 'Empleado de demostración.',
                ], $hr, true);
            }

            $created[$definition['key']] = $employee;
        }

        foreach (['admin', 'recepcion', 'finanzas', 'inventario', 'servicios', 'rrhh'] as $key) {
            $employee = $created[$key] ?? null;
            $user = $this->staff[$key] ?? null;

            if (! $employee instanceof Employee || ! $user instanceof User || $employee->user_id !== null) {
                continue;
            }

            $role = match ($key) {
                'admin' => Role::Admin,
                'recepcion' => Role::Reception,
                'finanzas' => Role::Finance,
                'inventario' => Role::Inventory,
                'servicios' => Role::Services,
                default => Role::HumanResources,
            };

            // The owner links the access so the RRHH employee can be linked
            // to its own user without triggering the self-edit guard.
            Auth::setUser($this->owner);

            $employees->linkAccess($employee, $user, $role->value, $this->owner);
        }

        Auth::setUser($hr);
    }

    /**
     * @param  array<string, Reservation>  $reservations
     * @param  array<int, Room>  $rooms
     */
    private function seedOperationsExtras(array $reservations, array $rooms): void
    {
        $reception = $this->actor('recepcion');
        Auth::setUser($reception);

        $events = [
            ['title' => 'Mantenimiento preventivo de piscina', 'type' => 'mantenimiento', 'room_id' => $rooms[303]->id, 'reservation_id' => null, 'offset' => 2, 'duration' => 4, 'description' => 'Limpieza y revisión de equipos de la piscina.'],
            ['title' => 'Evento corporativo Grupo Caribe', 'type' => 'evento', 'room_id' => null, 'reservation_id' => null, 'offset' => 5, 'duration' => 6, 'description' => 'Evento en el salón principal con 40 invitados.'],
            ['title' => 'Bloqueo por remodelación de terraza', 'type' => 'bloqueo', 'room_id' => $rooms[301]->id, 'reservation_id' => null, 'offset' => 10, 'duration' => 48, 'description' => 'Bloqueo temporal para trabajos de remodelación.'],
            ['title' => 'Llegada de huésped VIP', 'type' => 'evento', 'room_id' => $rooms[201]->id, 'reservation_id' => $reservations['confirmed']->id, 'offset' => 3, 'duration' => 2, 'description' => 'Preparar amenidades y late check-out.'],
            ['title' => 'Desayuno con cliente corporativo', 'type' => 'evento', 'room_id' => null, 'reservation_id' => null, 'offset' => 1, 'duration' => 2, 'description' => 'Reunión de seguimiento en el restaurante.'],
        ];

        foreach ($events as $event) {
            $startsAt = $this->today->addDays($event['offset'])->setTime(9, 0);

            Calendar::query()->firstOrCreate(
                [
                    'hotel_id' => $this->hotel->id,
                    'title' => $event['title'],
                ],
                [
                    'room_id' => $event['room_id'],
                    'reservation_id' => $event['reservation_id'],
                    'description' => $event['description'],
                    'starts_at' => $startsAt,
                    'ends_at' => $startsAt->addHours($event['duration']),
                    'type' => $event['type'],
                    'active' => true,
                ],
            );
        }
    }
}
