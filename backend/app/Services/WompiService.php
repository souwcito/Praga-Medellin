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

        $data = $response->json();

        // Respaldo: el endpoint individual de Wompi a veces responde 500
        // ("Error desconocido") aunque la transacción exista. En ese caso la
        // buscamos en el listado por rango de fechas (derivado del propio ID).
        if (!$response->successful() || !is_array($data) || empty($data['data'])) {
            $data = $this->transaccionPorLista($transactionId) ?? $data;
        }

        return $data;
    }

    // Busca una transacción por ID usando el listado (/transactions), que sí es
    // confiable. El ID tiene la forma <prefijo>-<timestamp_unix>-<aleatorio>.
    private function transaccionPorLista(string $transactionId): ?array
    {
        $partes = explode('-', $transactionId);
        $ts = (isset($partes[1]) && is_numeric($partes[1])) ? (int) $partes[1] : time();

        $response = Http::withToken((string) config('wompi.private_key'))
            ->acceptJson()
            ->get($this->baseUrl() . '/transactions', [
                'from_date' => gmdate('Y-m-d\TH:i:s.000\Z', $ts - 2 * 86400),
                'until_date' => gmdate('Y-m-d\TH:i:s.000\Z', $ts + 2 * 86400),
                'page' => 1,
                'page_size' => 100,
            ]);

        foreach ((array) ($response->json('data') ?? []) as $tx) {
            if (($tx['id'] ?? null) === $transactionId) {
                return ['data' => ['transaction' => $tx]];
            }
        }

        return null;
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

    // Verifica la firma de los webhooks de Wompi.
    // Wompi calcula: sha256( concat(valores de signature.properties) . timestamp . events_key )
    // y la envía en el header `X-Event-Checksum` (también en `signature.checksum`).
    public function webhookValido(array $data, ?string $checksum): bool
    {
        if (!$checksum) {
            return false;
        }

        $properties = $data['signature']['properties'] ?? [];

        $cadena = '';
        foreach ($properties as $prop) {
            $valor = data_get($data['data'] ?? [], $prop);
            if ($valor !== null && !is_array($valor) && !is_object($valor)) {
                $cadena .= (string) $valor;
            }
        }
        $cadena .= (string) ($data['timestamp'] ?? '');
        $cadena .= (string) config('wompi.events_key');

        $esperado = hash('sha256', $cadena);

        return hash_equals(strtolower($esperado), strtolower($checksum));
    }
}