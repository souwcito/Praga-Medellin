<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

// Integración con la pasarela de pagos Wompi (sandbox/producción según .env).
// Las llaves viven en variables de entorno; ninguna llega al frontend salvo la
// pública (necesaria para el widget).
class WompiService
{
    public function publicKey(): string
    {
        return (string) config('wompi.public_key');
    }

    public function baseUrl(): string
    {
        return (string) config('wompi.base_url');
    }

    // Firma de integridad que Wompi espera en el widget (checkout):
    // sha256(reference . amount_cents . currency . integrity_key), en ese orden.
    public function firmaIntegridad(int $amountCents, string $currency, string $reference): string
    {
        return hash('sha256', $reference . $amountCents . $currency . config('wompi.integrity_key'));
    }

    // Consulta una transacción con la llave privada (lado servidor).
    public function transaccion(string $transactionId): array
    {
        $response = Http::withToken((string) config('wompi.private_key'))
            ->acceptJson()
            ->get($this->baseUrl() . '/transactions/' . $transactionId);

        return $response->json();
    }

    // Valida que una transacción esté aprobada según la API de Wompi.
    public function transaccionAprobada(?string $transactionId): ?array
    {
        if (!$transactionId) {
            return null;
        }

        $data = $this->transaccion($transactionId);
        $tx = $data['data']['transaction'] ?? $data['data'] ?? null;

        if (!$tx || (($tx['status'] ?? '') !== 'APPROVED')) {
            return null;
        }

        return [
            'id' => $tx['id'] ?? $transactionId,
            'status' => $tx['status'],
            'reference' => $tx['reference'] ?? null,
            'metodo_pago' => $tx['payment_method']['type'] ?? 'tarjeta',
            'franquicia' => $tx['payment_method']['extra']['brand'] ?? null,
            'amount_in_cents' => (int) ($tx['amount_in_cents'] ?? 0),
            'currency' => $tx['currency'] ?? 'COP',
        ];
    }

    // Verifica el hash de los webhooks de Wompi:
    // sha256(payload_crudo . events_key) debe coincidir con la cabecera X-Event-Hash.
    public function webhookValido(string $payload, ?string $hash): bool
    {
        if (!$hash) {
            return false;
        }
        $esperado = hash('sha256', $payload . config('wompi.events_key'));
        return hash_equals($esperado, $hash);
    }
}