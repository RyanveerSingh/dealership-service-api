import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, money } from '../api/client'
import type { Appointment, LineType, Part, RepairOrder, RepairOrderStatus } from '../api/types'

const RO_TABS: RepairOrderStatus[] = ['OPEN', 'AWAITING_PARTS', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'CLOSED', 'VOIDED']

function statusClass(s: RepairOrderStatus) {
  if (s === 'CLOSED') return 'badge ok'
  if (s === 'VOIDED') return 'badge danger'
  if (s === 'AWAITING_PARTS' || s === 'AWAITING_APPROVAL') return 'badge warn'
  return 'badge'
}

export default function RepairOrdersPage() {
  const [tab, setTab] = useState<RepairOrderStatus>('OPEN')
  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [selected, setSelected] = useState<RepairOrder | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [openable, setOpenable] = useState<Appointment[]>([])

  const [lineType, setLineType] = useState<LineType>('PART')
  const [partId, setPartId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('750.00')

  const [error, setError] = useState<ApiError | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshParts = useCallback(() => {
    api.parts().then((p) => {
      setParts(p)
      if (!partId && p.length) setPartId(String(p[0].id))
    }).catch(() => undefined)
  }, [partId])

  const loadOrders = useCallback(async (status: RepairOrderStatus) => {
    try { setOrders(await api.repairOrders(status)) } catch { setOrders([]) }
  }, [])

  const loadOpenable = useCallback(async () => {
    try {
      const [scheduled, checkedIn] = await Promise.all([
        api.appointments('SCHEDULED'),
        api.appointments('CHECKED_IN'),
      ])
      setOpenable([...scheduled, ...checkedIn])
    } catch { setOpenable([]) }
  }, [])

  useEffect(() => { refreshParts(); void loadOpenable() }, [])
  useEffect(() => { void loadOrders(tab) }, [tab, loadOrders])

  function handle(err: unknown) {
    setError(err instanceof ApiError ? err : new ApiError(0, undefined, 'Could not reach the server'))
  }

  async function openOrder(appointmentId: number) {
    setError(null); setSuccess(null); setBusy(true)
    try {
      const ro = await api.openRepairOrder(appointmentId)
      setSelected(ro)
      setTab('OPEN')
      void loadOrders('OPEN')
      void loadOpenable()
      setSuccess(`Opened repair order #${ro.id}`)
    } catch (err) { handle(err) } finally { setBusy(false) }
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null); setSuccess(null); setBusy(true)

    const before = parts.find((p) => String(p.id) === partId)?.stockQuantity

    try {
      const updated = await api.addLine(selected.id, {
        lineType,
        partId: lineType === 'PART' ? Number(partId) : null,
        description: description || (lineType === 'PART'
          ? parts.find((p) => String(p.id) === partId)?.name ?? 'Part'
          : 'Labour'),
        quantity: Number(quantity),
        // Ignored by the server for PART lines, which price from inventory.
        unitPrice: lineType === 'LABOR' ? unitPrice : null,
      })
      setSelected(updated)
      setDescription('')
      void loadOrders(tab)
      if (lineType === 'PART') {
        const fresh = await api.parts()
        setParts(fresh)
        const after = fresh.find((p) => String(p.id) === partId)?.stockQuantity
        setSuccess(before !== undefined && after !== undefined
          ? `Line added. Stock ${before} → ${after}.`
          : 'Line added.')
      } else {
        setSuccess('Labour line added.')
      }
    } catch (err) {
      handle(err)
      // Prove the rollback: on an insufficient-stock 409 the level is unchanged.
      if (lineType === 'PART') api.parts().then(setParts).catch(() => undefined)
    } finally { setBusy(false) }
  }

  async function removeLine(lineId: number) {
    if (!selected) return
    setError(null); setSuccess(null)
    try {
      setSelected(await api.removeLine(selected.id, lineId))
      refreshParts()
      void loadOrders(tab)
    } catch (err) { handle(err) }
  }

  async function move(target: RepairOrderStatus) {
    if (!selected) return
    setError(null); setSuccess(null)
    try {
      const updated = await api.setRepairOrderStatus(selected.id, target)
      setSelected(updated)
      void loadOrders(tab)
      setSuccess(`Moved to ${target.replace('_', ' ').toLowerCase()}`)
    } catch (err) { handle(err) }
  }

  const selectedPart = parts.find((p) => String(p.id) === partId)
  const editable = selected && !['CLOSED', 'VOIDED'].includes(selected.status)

  return (
    <>
      <header>
        <h1>Repair Orders</h1>
        <p>Adding a part draws it from stock in the same transaction. If stock is short, nothing is written.</p>
      </header>

      {error && (
        <div className={`alert ${error.isConflict ? 'conflict' : 'error'}`}>
          <strong>{error.body?.error ?? 'Request failed'}</strong>
          {error.message}
        </div>
      )}
      {success && <div className="alert success">{success}</div>}

      <div className="grid two">
        <div>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <h2>Open a new order</h2>
            <p className="hint">One repair order per appointment — the database enforces it.</p>
            {openable.length === 0 ? (
              <div className="empty">No appointments without an order.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <tbody>
                    {openable.map((a) => (
                      <tr key={a.id}>
                        <td>#{a.id} {a.bayName}</td>
                        <td className="mono">{a.vehicleVin.slice(-8)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="small secondary" disabled={busy} onClick={() => openOrder(a.id)}>
                            Open RO
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Orders</h2>
            <div className="chips" style={{ marginBottom: '.75rem' }}>
              {RO_TABS.map((s) => (
                <button key={s} className={`small ${tab === s ? '' : 'secondary'}`} onClick={() => setTab(s)}>
                  {s.replace('_', ' ').toLowerCase()}
                </button>
              ))}
            </div>
            {orders.length === 0 ? (
              <div className="empty">None in this state.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td className="num">{money(o.grandTotal)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="small secondary"
                            onClick={() => api.repairOrder(o.id).then(setSelected).catch(handle)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="card">
          {!selected ? (
            <div className="empty">Select or open a repair order.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem' }}>
                <h2 style={{ margin: 0 }}>Repair order #{selected.id}</h2>
                <span className={statusClass(selected.status)}>{selected.status.replace('_', ' ')}</span>
              </div>
              <p className="hint">Appointment #{selected.appointmentId}</p>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th><th>Description</th><th className="num">Qty</th>
                      <th className="num">Unit</th><th className="num">Total</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.length === 0 && (
                      <tr><td colSpan={6} className="empty">No lines yet.</td></tr>
                    )}
                    {selected.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td><span className="badge">{li.lineType}</span></td>
                        <td>{li.description}{li.partSku && <span className="muted mono"> {li.partSku}</span>}</td>
                        <td className="num">{li.quantity}</td>
                        <td className="num">{money(li.unitPrice)}</td>
                        <td className="num">{money(li.lineTotal)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {editable && (
                            <button className="small secondary" onClick={() => removeLine(li.id)}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="totals">
                <div><span>Parts</span><span>{money(selected.partsTotal)}</span></div>
                <div><span>Labour</span><span>{money(selected.laborTotal)}</span></div>
                <div><span>Tax (18%)</span><span>{money(selected.taxTotal)}</span></div>
                <div className="grand"><span>Total</span><span>{money(selected.grandTotal)}</span></div>
              </div>

              {editable && (
                <form onSubmit={addLine} style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '.9rem' }}>
                  <h3>Add a line</h3>
                  <div className="row">
                    <label>
                      <span>Type</span>
                      <select value={lineType} onChange={(e) => setLineType(e.target.value as LineType)}>
                        <option value="PART">Part</option>
                        <option value="LABOR">Labour</option>
                      </select>
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                    </label>
                  </div>

                  {lineType === 'PART' ? (
                    <label>
                      <span>Part {selectedPart && `— ${selectedPart.stockQuantity} in stock`}</span>
                      <select value={partId} onChange={(e) => setPartId(e.target.value)} required>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} ({p.stockQuantity} in stock)
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      <span>Rate per hour</span>
                      <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
                    </label>
                  )}

                  <label>
                    <span>Description (optional)</span>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Defaults to the part name" />
                  </label>

                  {lineType === 'PART' && selectedPart && Number(quantity) > selectedPart.stockQuantity && (
                    <div className="alert conflict">
                      Only {selectedPart.stockQuantity} in stock. The server will reject this
                      with 409 and roll the whole operation back — stock will be unchanged.
                    </div>
                  )}

                  <button type="submit" disabled={busy}>Add line</button>
                </form>
              )}

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '.9rem' }}>
                <h3>Status</h3>
                <p className="hint">
                  Only the transitions the server allows are offered — this list comes from
                  <span className="mono"> allowedNextStatuses</span> on the response.
                </p>
                {selected.allowedNextStatuses.length === 0 ? (
                  <p className="muted">{selected.status} is terminal.</p>
                ) : (
                  <div className="chips">
                    {selected.allowedNextStatuses.map((s) => (
                      <button key={s} className="small secondary" onClick={() => move(s)}>
                        {s.replace('_', ' ').toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
