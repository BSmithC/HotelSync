<?php

use App\Models\Calendar;
use App\Models\User;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
});

it('builds the month grid with the weeks that contain the selected month', function () {
    $this->actingAs($this->user)
        ->get('/calendars?month=2026-12')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Calendar/Index')
            ->where('view', 'calendario')
            ->where('calendar.month', '2026-12')
            ->where('calendar.grid_start', '2026-11-30')
            ->where('calendar.grid_end', '2027-01-03')
            ->where('calendar.previous', '2026-11')
            ->where('calendar.next', '2027-01')
            ->where('calendar.timezone', 'America/Santo_Domingo'));
});

it('returns only the events that overlap the visible grid', function () {
    Calendar::create([
        'title' => 'Dentro del mes',
        'type' => 'evento',
        'starts_at' => '2026-12-15 10:00:00',
    ]);

    Calendar::create([
        'title' => 'Evento del mes anterior',
        'type' => 'evento',
        'starts_at' => '2026-11-10 10:00:00',
    ]);

    Calendar::create([
        'title' => 'Evento del mes siguiente',
        'type' => 'evento',
        'starts_at' => '2027-01-20 10:00:00',
    ]);

    $this->actingAs($this->user)
        ->get('/calendars?month=2026-12')
        ->assertInertia(fn ($page) => $page
            ->has('monthEvents', 1)
            ->where('monthEvents.0.title', 'Dentro del mes'));
});

it('includes events that start before the grid but overlap it', function () {
    Calendar::create([
        'title' => 'Bloqueo largo',
        'type' => 'bloqueo',
        'starts_at' => '2026-11-25 08:00:00',
        'ends_at' => '2026-12-02 18:00:00',
    ]);

    $this->actingAs($this->user)
        ->get('/calendars?month=2026-12')
        ->assertInertia(fn ($page) => $page
            ->has('monthEvents', 1)
            ->where('monthEvents.0.starts_on', '2026-11-25')
            ->where('monthEvents.0.ends_on', '2026-12-02'));
});

it('resolves event dates in the hotel timezone', function () {
    Calendar::create([
        'title' => 'Evento nocturno',
        'type' => 'evento',
        'starts_at' => '2026-12-15 02:00:00',
        'ends_at' => '2026-12-15 05:00:00',
    ]);

    $this->actingAs($this->user)
        ->get('/calendars?month=2026-12')
        ->assertInertia(fn ($page) => $page
            ->where('monthEvents.0.starts_on', '2026-12-14')
            ->where('monthEvents.0.ends_on', '2026-12-15')
            ->where('monthEvents.0.start_time', '22:00')
            ->where('monthEvents.0.end_time', '01:00'));
});

it('falls back to the current hotel month when the month is invalid', function () {
    $expected = CarbonImmutable::now($this->hotel->timezone)->format('Y-m');

    $this->actingAs($this->user)
        ->get('/calendars?month=2026-13')
        ->assertInertia(fn ($page) => $page->where('calendar.month', $expected));

    $this->actingAs($this->user)
        ->get('/calendars?month=nope')
        ->assertInertia(fn ($page) => $page->where('calendar.month', $expected));
});

it('switches to the list view when requested', function () {
    $this->actingAs($this->user)
        ->get('/calendars?view=lista')
        ->assertInertia(fn ($page) => $page
            ->where('view', 'lista')
            ->has('events.data'));
});
