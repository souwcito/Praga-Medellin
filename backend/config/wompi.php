<?php

// Configuración de Wompi. Las llaves (públicas y privadas) viven en el .env
// (WOMPI_*) y NUNCA se suben al repositorio. Nunca mover las llaves privadas
// al frontend.
return [

    'public_key' => env('WOMPI_PUBLIC_KEY'),
    'private_key' => env('WOMPI_PRIVATE_KEY'),
    'events_key' => env('WOMPI_EVENTS_KEY'),
    'integrity_key' => env('WOMPI_INTEGRITY_KEY'),
    'base_url' => env('WOMPI_BASE_URL', 'https://production.wompi.co/v1'),

];