import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, money } from '../api/client'
import type { Part } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export default function InventoryPage() {
  const { hasRole } = useAuth()
  const canReceive = hasRole('ADMIN', 'SERVICE_ADVISOR')

  const [parts, setParts] = useState<Part[]>([])
  const [qty, setQty] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(() => {
    api.parts().then(setParts).catch(() => setError('Could not load inventory'))
  }, [])
  useEffect(load, [load])

  async function receive(part: Part) {
    const amount = Number(qty[part.id] ?? '0')
    if (!amount || amount <= 0) return
    setError(null); setOk(null)
    try {
      const updated = await api.receiveStock(part.id, amount)
      setOk(`${part.sku}: ${part.stockQuantity} → ${updated.stockQuantity}`)
      setQty({ ...qty, [part.id]: '' })
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not receive stock')
    }
  }

  const low = parts.filter((p) => p.belowReorderLevel)
  const value = parts.reduce((s, p) => s + Number(p.unitPrice) * p.stockQuantity, 0)

  return (
    <>
      <header className="mb-8">
        <h1 className="display text-[2rem]">Inventory</h1>
        <p className="mt-2 text-[0.9rem] text-chalk-dim">
          Stock moves only through a repair order, or through a delivery received here.
        </p>
      </header>

      {error && <div className="notice notice-error">{error}</div>}
      {ok && <div className="notice notice-ok">{ok}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ['Lines held', String(parts.length)],
          ['At or below reorder', String(low.length)],
          ['Stock value', money(value)],
        ].map(([k, v]) => (
          <div key={k} className="panel">
            <div className="label mb-2">{k}</div>
            <div className="font-display text-[1.6rem] text-chalk">{v}</div>
          </div>
        ))}
      </div>

      {low.length > 0 && (
        <div className="notice notice-conflict">
          <strong>{low.length} part{low.length > 1 ? 's' : ''} at or below reorder level</strong>
          {low.map((p) => `${p.sku} (${p.stockQuantity})`).join(' · ')}
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2 className="font-display text-[1.05rem]">Parts</h2>
          {!canReceive && <span className="label">read only for your role</span>}
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>SKU</th><th>Part</th><th className="num">Price</th>
                <th className="num">In stock</th><th className="num">Reorder at</th>
                <th>Status</th>
                {canReceive && <th>Receive delivery</th>}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-[0.76rem] text-chalk">{p.sku}</td>
                  <td>{p.name}</td>
                  <td className="num">{money(p.unitPrice)}</td>
                  <td className="num text-chalk">{p.stockQuantity}</td>
                  <td className="num text-chalk-faint">{p.reorderLevel}</td>
                  <td>
                    {p.stockQuantity === 0 ? (
                      <span className="pill pill-danger">out of stock</span>
                    ) : p.belowReorderLevel ? (
                      <span className="pill pill-warn">reorder</span>
                    ) : (
                      <span className="pill pill-ok">ok</span>
                    )}
                  </td>
                  {canReceive && (
                    <td>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="qty"
                          className="w-20 border bg-ink px-2 py-1 text-[0.82rem] text-chalk"
                          style={{ borderColor: 'var(--hairline-strong)' }}
                          value={qty[p.id] ?? ''}
                          onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })}
                        />
                        <button className="btn btn-ghost btn-sm" onClick={() => receive(p)}>
                          Receive
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
