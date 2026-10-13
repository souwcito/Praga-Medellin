<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirmación de pedido</title>
  </head>
  <body style="margin:0;background:#f3f2f0;font-family:'Manrope',Arial,sans-serif;color:#101010;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#101010;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:2px;">PRAGA MEDELLÍN</p>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 4px;font-size:18px;font-weight:700;">¡Gracias por tu compra {{ $cliente->nombre ?? '' }}!</p>
        <p style="margin:0 0 16px;color:#666;font-size:14px;">
          Recibimos tu pedido <strong>{{ $pedido->numero }}</strong> y la compra fue <strong>aprobada</strong>.
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #e2e0de;color:#666;">Producto</th>
              <th style="text-align:center;padding:8px;border-bottom:1px solid #e2e0de;color:#666;">Cant.</th>
              <th style="text-align:right;padding:8px;border-bottom:1px solid #e2e0de;color:#666;">Total</th>
            </tr>
          </thead>
          <tbody>
            @foreach (($pedido->items ?? []) as $item)
              <tr>
                <td style="padding:8px;border-bottom:1px solid #f3f2f0;">
                  {{ $item['nombre'] ?? '' }}@if (!empty($item['talla'])) <span style="color:#666;">· Talla {{ $item['talla'] }}</span>@endif
                </td>
                <td style="text-align:center;padding:8px;border-bottom:1px solid #f3f2f0;">{{ $item['cantidad'] ?? 1 }}</td>
                <td style="text-align:right;padding:8px;border-bottom:1px solid #f3f2f0;font-weight:600;">
                  $ {{ number_format(($item['subtotal'] ?? 0), 0, ',', '.') }}
                </td>
              </tr>
            @endforeach
          </tbody>
        </table>

        <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#666;font-size:14px;">Total pagado</span>
          <span style="font-size:22px;font-weight:700;">$ {{ number_format($pedido->total, 0, ',', '.') }}</span>
        </div>

        <p style="margin:20px 0 0;color:#666;font-size:14px;line-height:1.5;">
          Estamos alistando tu pedido. Puedes retirarlo en la sede o recibirlo donde indicaste.
          Cualquier novedad te escribimos al correo o por WhatsApp.
        </p>
      </div>
      <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
        Praga Medellín · 4 sedes en Medellín · Pago seguro con Wompi
      </p>
    </div>
  </body>
</html>