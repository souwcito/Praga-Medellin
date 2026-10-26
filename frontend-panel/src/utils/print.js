// Utilidades del comprobante interno de venta.

import logoAkron from '../assets/logo-akron-print.png?inline'
import logoPraga from '../assets/logo-praga-print.png?inline'
import logoWoman from '../assets/logo-praga-woman-print.png?inline'

export const formato = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

const LABEL_PAGO = {
  efectivo: 'Efectivo',
  banco: 'Banco',
  addi: 'Addi',
  sistecredito: 'Sistecredito',
  bold: 'Bold',
  wompi: 'Wompi',
}

const escapar = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Abre una ventana de impresión con el comprobante formateado para térmica 80mm.
// Diseño pensado para que se vea grande y con buena presencia incluso cuando la
// venta es de un solo producto (altura mínima + tipografía más grande).
export function imprimirComprobante(data) {
  const fecha = new Date(data.venta.fecha).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const canal = data.venta.tipo === 'virtual' ? 'Redes' : 'Punto físico'

  const filas = data.items
    .map(
      (i) => `
      <tr>
        <td>${escapar(i.nombre)}${i.talla ? ` (${escapar(i.talla)})` : ''}${i.es_relampago ? ' · Relámpago' : ''}${i.nota ? `<br><small>${escapar(i.nota)}</small>` : ''}</td>
        <td class="c">${i.cantidad}</td>
        <td class="r">${formato(i.precio_final ?? i.precio_unitario)}</td>
        <td class="r">${formato(i.subtotal)}</td>
      </tr>`,
    )
    .join('')

  const descuentoTotal = (data.items || []).reduce((s, i) => s + (i.descuento || 0), 0)
  const filasPago = (data.pagos || [])
    .map(
      (p) => `<div class="row"><span>${LABEL_PAGO[p.metodo_pago] || p.metodo_pago}</span><b>${formato(p.monto)}</b></div>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Factura ${data.factura.numero_interno}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; }
  body {
    width: 66mm;            /* deja margen a ambos lados para que no se recorte */
    min-height: 120mm;      /* para que no salga tan corta aunque sea un producto */
    margin: 0 auto;
    padding: 6mm 2mm 8mm;
    font-family: 'Segoe UI', Roboto, Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #111;
  }
  .logos { display: flex; align-items: center; justify-content: center; gap: 2mm; margin-bottom: 3mm; }
  .logos img { width: 10mm; height: auto; display: block; }
  .logos img.main { width: 13mm; }
  .center { text-align: center; }
  h1 { font-size: 27px; letter-spacing: 4px; font-weight: 800; }
  .brand-sub { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #444; margin-top: 1px; }
  .line { border-top: 1.5px dashed #444; margin: 11px 0; }
  .row { display: flex; justify-content: space-between; gap: 10px; margin: 5px 0; }
  .row span:first-child { color: #555; }
  .row b, .row span:last-child { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; table-layout: fixed; }
  th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; color: #444; border-bottom: 1.5px solid #333; padding-bottom: 6px; }
  td { padding: 6px 0; vertical-align: top; overflow-wrap: anywhere; }
  th:first-child, td:first-child { width: 46%; padding-right: 4px; }
  th.c, td.c { width: 12%; text-align: center; }
  th.r, td.r { text-align: right; }
  th:nth-child(3), td:nth-child(3) { width: 21%; }
  th:nth-child(4), td:nth-child(4) { width: 21%; }
  .total { margin-top: 7px; font-size: 22px; font-weight: 800; }
  .total span:first-child { color: #111; font-weight: 800; }
  .thanks { margin-top: 14px; font-size: 13px; font-weight: 600; }
  @media print { @page { margin: 0; } }
</style>
</head>
<body>
  <div class="logos">
    <img src="${logoAkron}" alt="Akron" />
    <img src="${logoPraga}" alt="Praga" class="main" />
    <img src="${logoWoman}" alt="Praga Woman" />
  </div>
  <div class="center">
    <h1>PRAGA</h1>
    <p class="brand-sub">Medellín</p>
  </div>
  <div class="line"></div>
  <div class="row"><span>Factura</span><b>${data.factura.numero_interno}</b></div>
  <div class="row"><span>Fecha</span><span>${fecha}</span></div>
  <div class="row"><span>Sede</span><span>${data.sede}</span></div>
  <div class="row"><span>Vendedor</span><span>${data.vendedor}</span></div>
  <div class="row"><span>Canal</span><span>${canal}</span></div>
  <div class="line"></div>
  <table>
    <thead>
      <tr><th>Producto</th><th class="c">Cant</th><th class="r">P.Unit</th><th class="r">Subtotal</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="line"></div>
  <div class="row total"><span>TOTAL</span><span>${formato(data.total)}</span></div>
  ${descuentoTotal > 0 ? `<div class="row"><span>Descuentos</span><b>-${formato(descuentoTotal)}</b></div>` : ''}
  ${filasPago ? `<div class="line"></div>${filasPago}` : ''}
  <div class="line"></div>
  <p class="thanks center">Gracias por su compra</p>
  <script>
    window.addEventListener('load', function () {
      var imgs = Array.prototype.slice.call(document.images);
      var listas = imgs.map(function (img) {
        return img.complete ? Promise.resolve() : new Promise(function (r) { img.onload = img.onerror = r; });
      });
      Promise.all(listas).then(function () {
        setTimeout(function () { window.print(); }, 200);
      });
    });
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=360,height=640')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
}
