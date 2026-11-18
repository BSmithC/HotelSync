<?php

it('renders the inertia error page for unknown pages', function () {
    $this->get('/pagina-inexistente')
        ->assertNotFound()
        ->assertInertia(fn ($page) => $page
            ->component('errors/Error')
            ->where('status', 404)
        );
});

it('keeps json error responses for api requests', function () {
    $this->getJson('/api/pagina-inexistente')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});
