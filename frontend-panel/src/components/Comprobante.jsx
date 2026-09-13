// Comprobante/factura INTERNA de venta (no fiscal, no DIAN).
// Se muestra en pantalla tras confirmar la venta; la impresión se hace con
// imprimirComprobante() (src/utils/print.js) en ventana para térmica 80mm.

import { formato } from '../utils/print'

export function Comprobante({ data }) {
  const fecha = new Date(data.venta.fecha).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="rounded-xl bg-white">
      <div className="border-b border-dashed border-line pb-4 text-center">
        <p className="font-display text-2xl font-semibold tracking-wide text-ink">PRAGA</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-ink-2">
          Medellín · Factura interna
        </p>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">Factura</dt>
          <dd className="font-semibold text-ink">{data.factura.numero_interno}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">Fecha</dt>
          <dd className="text-right text-ink">{fecha}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">Sede</dt>
          <dd className="text-right font-medium text-ink">{data.sede}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-2">Vendedor</dt>
          <dd className="font-medium text-ink">{data.vendedor}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="mb-1.5 flex text-[11px] font-semibold uppercase tracking-wide text-ink-2/70">
          <span className="flex-1">Producto</span>
          <span className="w-12 text-center">Cant</span>
          <span className="w-24 text-right">Subtotal</span>
        </div>
        <ul className="space-y-2 border-t border-line pt-3">
          {data.items.map((item) => (
            <li key={item.producto_id} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-ink">{item.nombre}</span>
              <span className="w-12 shrink-0 text-center text-ink-2">
                {item.cantidad} × {formato(item.precio_unitario)}
              </span>
              <span className="w-24 shrink-0 text-right font-semibold text-ink">
                {formato(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-4">
        <span className="text-sm font-medium text-ink-2">Total</span>
        <span className="text-2xl font-bold text-ink">{formato(data.total)}</span>
      </div>

      <p className="mt-4 text-center text-[11px] text-ink-2/70">
        Factura interna — no constituye facturación ante la DIAN.
      </p>
    </div>
  )
}