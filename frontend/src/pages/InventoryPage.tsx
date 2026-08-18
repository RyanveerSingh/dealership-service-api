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
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(() => {
    api.parts().then(setParts).catch(() => setError('Could not load inventory'))
  }, [])

  useEffect(load, [load])

  async function receive(part: Part) {
    const amount = Number(qty[part.id] ?? '0')
    if (!amount || amount <= 0) return
    setError(null); setSuccess(null)
    try {
      const updated = await api.receiveStock(part.id, amount)
      setSuccess(`${part.sku}: ${part.stockQuantity} → ${updated.stockQuantity}`)
      setQty({ ...qty, [part.id]: '' })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not receive stock')
    }
  }

  const low = parts.filter((p) => p.belowReorderLevel)

  return (
    <>
      <header>
        <h1>Inventory</h1>
        <p>Stock moves only through repair orders, or through a delivery received here.</p>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {low.length > 0 && (
        <div className="alert conflict">
          <strong>{low.length} part{low.length > 1 ? 's' : ''} at or below reorder level</strong>
          {low.map((p) => `${p.sku} (${p.stockQuantity})`).join(', ')}
        </div>
      )}

      <section className="card">
        <div className="table-wrap">
          <table>
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
                  <td className="mono">{p.sku}</td>
                  <td>{p.name}</td>
                  <td className="num">{money(p.unitPrice)}</td>
                  <td className="num"><b>{p.stockQuantity}</b></td>
                  <td className="num muted">{p.reorderLevel}</td>
                  <td>
                    {p.stockQuantity === 0
                      ? <span className="badge danger">out of stock</span>
                      : p.belowReorderLevel
                        ? <span className="badge warn">reorder</span>
                        : <span className="badge ok">ok</span>}
                  </td>
                  {canReceive && (
                    <td>
                      <div className="row" style={{ minWidth: 160 }}>
                        <input
                          type="number" min={1} placeholder="qty"
                          value={qty[p.id] ?? ''}
                          onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })}
                        />
                        <button className="small secondary" onClick={() => receive(p)}>Receive</button>
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
