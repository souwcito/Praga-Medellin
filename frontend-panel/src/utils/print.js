// Utilidades del comprobante interno de venta (no fiscal, no DIAN).

export const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

// Abre una ventana de impresión con el comprobante formateado para térmica 80mm.
export function imprimirComprobante(data) {
  const fecha = new Date(data.venta.fecha).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const filas = data.items
    .map(
      (i) => `
      <tr>
        <td>${i.nombre}</td>
        <td class="c">${i.cantidad}</td>
        <td class="r">${formato(i.precio_unitario)}</td>
        <td class="r">${formato(i.subtotal)}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Factura ${data.factura.numero_interno}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 72mm; margin: 0 auto; padding: 6mm 2mm; font-family: 'Courier New', monospace; font-size: 11px; color: #111; }
  .center { text-align: center; }
  h1 { font-size: 18px; letter-spacing: 2px; }
  .muted { color: #555; font-size: 10px; }
  .line { border-top: 1px dashed #333; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 3px; }
  td { padding: 2px 0; vertical-align: top; }
  .c { text-align: center; }
  .r { text-align: right; }
  .total { font-size: 15px; font-weight: bold; }
  .note { margin-top: 6px; font-size: 9px; }
</style>
</head>
<body>
  <div class="center">
    <h1>PRAGA MEDELLIN</h1>
    <p class="muted">Factura interna · No fiscal</p>
  </div>
  <div class="line"></div>
  <div class="row"><span>Factura:</span><b>${data.factura.numero_interno}</b></div>
  <div class="row"><span>Fecha:</span><span>${fecha}</span></div>
  <div class="row"><span>Sede:</span><span>${data.sede}</span></div>
  <div class="row"><span>Vendedor:</span><span>${data.vendedor}</span></div>
  <div class="line"></div>
  <table>
    <thead>
      <tr><th>Producto</th><th class="c">Cant</th><th class="r">P.Unit</th><th class="r">Subtotal</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="line"></div>
  <div class="row total"><span>TOTAL</span><span>${formato(data.total)}</span></div>
  <p class="note center">Gracias por su compra. — Praga Medellín</p>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=360,height=600')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
}