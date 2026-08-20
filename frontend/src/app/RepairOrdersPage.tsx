import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, money } from '../api/client'
import type {
  Appointment, LineType, Part, RepairOrder, RepairOrderStatus, Staff,
} from '../api/types'

const TABS: RepairOrderStatus[] = [
  'OPEN', 'AWAITING_PARTS', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'CLOSED', 'VOIDED',
]

function pill(s: RepairOrderStatus) {
  if (s === 'CLOSED') return 'pill pill-ok'
  if (s === 'VOIDED') return 'pill pill-danger'
  if (s === 'AWAITING_PARTS' || s === 'AWAITING_APPROVAL') return 'pill pill-warn'
  return 'pill'
}

export default function RepairOrdersPage() {
  const [tab, setTab] = useState<RepairOrderStatus>('OPEN')
  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [selected, setSelected] = useState<RepairOrder | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [techs, setTechs] = useState<Staff[]>([])
  const [openable, setOpenable] = useState<Appointment[]>([])

  const [lineType, setLineType] = useState<LineType>('PART')
  const [partId, setPartId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('750.00')

  const [error, setError] = useState<ApiError | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? e : new ApiError(0, undefined, 'Could not reach the service'))

  const loadParts = useCallback(() => {
    api.parts().then((p) => {
      setParts(p)
      setPartId((cur) => cur || (p.length ? String(p[0].id) : ''))
    }).catch(() => undefined)
  }, [])

  const loadOrders = useCallback(async (s: RepairOrderStatus) => {
    try { setOrders(await api.repairOrders(s)) } catch { setOrders([]) }
  }, [])

  const loadOpenable = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.appointments('SCHEDULED'), api.appointments('CHECKED_IN'),
      ])
      setOpenable([...a, ...b])
    } catch { setOpenable([]) }
  }, [])

  useEffect(() => {
    loadParts()
    void loadOpenable()
    api.technicians().then(setTechs).catch(() => undefined)
  }, [loadParts, loadOpenable])

  useEffect(() => { void loadOrders(tab) }, [tab, loadOrders])

  async function openOrder(appointmentId: number) {
    setError(null); setOk(null); setBusy(true)
    try {
      const ro = await api.openRepairOrder(appointmentId)
      setSelected(await api.repairOrder(ro.id))
      setTab('OPEN')
      void loadOrders('OPEN')
      void loadOpenable()
      setOk(`Opened repair order #${ro.id}`)
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null); setOk(null); setBusy(true)
    const before = parts.find((p) => String(p.id) === partId)?.stockQuantity
    try {
      const updated = await api.addLine(selected.id, {
        lineType,
        partId: lineType === 'PART' ? Number(partId) : null,
        description:
          description ||
          (lineType === 'PART'
            ? parts.find((p) => String(p.id) === partId)?.name ?? 'Part'
            : 'Labour'),
        quantity: Number(quantity),
        // Ignored by the server on PART lines, which price from inventory.
        unitPrice: lineType === 'LABOR' ? unitPrice : null,
      })
      setSelected(updated)
      setDescription('')
      void loadOrders(tab)
      if (lineType === 'PART') {
        const fresh = await api.parts()
        setParts(fresh)
        const after = fresh.find((p) => String(p.id) === partId)?.stockQuantity
        setOk(before !== undefined && after !== undefined
          ? `Line added. Stock ${before} → ${after}.` : 'Line added.')
      } else setOk('Labour line added.')
    } catch (e) {
      fail(e)
      // Re-read inventory after a rejection, so the unchanged level is visible.
      if (lineType === 'PART') api.parts().then(setParts).catch(() => undefined)
    } finally { setBusy(false) }
  }

  async function removeLine(lineId: number) {
    if (!selected) return
    setError(null); setOk(null)
    try {
      setSelected(await api.removeLine(selected.id, lineId))
      loadParts(); void loadOrders(tab)
      setOk('Line removed, stock returned.')
    } catch (e) { fail(e) }
  }

  async function move(target: RepairOrderStatus) {
    if (!selected) return
    setError(null); setOk(null)
    try {
      setSelected(await api.setRepairOrderStatus(selected.id, target))
      void loadOrders(tab)
      setOk(`Moved to ${target.replace('_', ' ').toLowerCase()}`)
    } catch (e) { fail(e) }
  }

  async function assign(technicianId: number) {
    if (!selected || !technicianId) return
    setError(null); setOk(null)
    try {
      setSelected(await api.assignTechnician(selected.id, technicianId))
      setOk('Technician assigned.')
    } catch (e) { fail(e) }
  }

  const selectedPart = parts.find((p) => String(p.id) === partId)
  const editable = selected && !['CLOSED', 'VOIDED'].includes(selected.status)
  const short = lineType === 'PART' && selectedPart && Number(quantity) > selectedPart.stockQuantity

  return (
    <>
      <header className="mb-8">
        <h1 className="display text-[2rem]">Repair orders</h1>
        <p className="mt-2 text-[0.9rem] text-chalk-dim">
          Adding a part draws it from stock in the same transaction. Short stock rolls both back.
        </p>
      </header>

      {error && (
        <div className={`notice ${error.isConflict ? 'notice-conflict' : 'notice-error'}`}>
          <strong>{error.body?.error ?? 'Request failed'}</strong>
          {error.message}
        </div>
      )}
      {ok && <div className="notice notice-ok">{ok}</div>}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid h-fit gap-6">
          <section className="panel">
            <div className="panel-head">
              <h2 className="font-display text-[1.05rem]">Open an order</h2>
            </div>
            {openable.length === 0 ? (
              <p className="text-[0.85rem] text-chalk-faint">No appointments without an order.</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <tbody>
                    {openable.map((a) => (
                      <tr key={a.id}>
                        <td className="text-chalk">#{a.id}</td>
                        <td>{a.bayName}</td>
                        <td className="font-mono text-[0.74rem]">{a.vehicleVin.slice(-8)}</td>
                        <td className="text-right">
                          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => openOrder(a.id)}>
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="font-display text-[1.05rem]">Orders</h2>
              <span className="label">{orders.length}</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TABS.map((s) => (
                <button key={s} className={`btn btn-sm ${tab === s ? '' : 'btn-ghost'}`} onClick={() => setTab(s)}>
                  {s.replace('_', ' ').toLowerCase()}
                </button>
              ))}
            </div>
            {orders.length === 0 ? (
              <p className="text-[0.85rem] text-chalk-faint">None in this state.</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="text-chalk">#{o.id}</td>
                        <td className="num">{money(o.grandTotal)}</td>
                        <td className="text-right">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => api.repairOrder(o.id).then(setSelected).catch(fail)}
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

        <section className="panel">
          {!selected ? (
            <p className="py-16 text-center text-[0.88rem] text-chalk-faint">
              Select or open a repair order.
            </p>
          ) : (
            <>
              <div className="panel-head">
                <h2 className="font-display text-[1.05rem]">
                  Repair order #{selected.id}{' '}
                  <span className={pill(selected.status)}>{selected.status.replace('_', ' ')}</span>
                </h2>
                <span className="label">appointment #{selected.appointmentId}</span>
              </div>

              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <label className="field mb-0">
                  <span>Technician</span>
                  <select
                    value={selected.technicianId ?? ''}
                    onChange={(e) => assign(Number(e.target.value))}
                    disabled={!editable}
                  >
                    <option value="">— unassigned —</option>
                    {techs.map((t) => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="label mb-1 block">Opened</span>
                  <p className="text-[0.86rem] text-chalk-dim">
                    {new Date(selected.openedAt).toLocaleString()}
                    {selected.closedAt && ` · closed ${new Date(selected.closedAt).toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Type</th><th>Description</th><th className="num">Qty</th>
                      <th className="num">Unit</th><th className="num">Total</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-chalk-faint">No lines yet.</td></tr>
                    )}
                    {selected.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td><span className="pill">{li.lineType}</span></td>
                        <td className="text-chalk">
                          {li.description}
                          {li.partSku && <span className="ml-2 font-mono text-[0.72rem] text-chalk-faint">{li.partSku}</span>}
                        </td>
                        <td className="num">{li.quantity}</td>
                        <td className="num">{money(li.unitPrice)}</td>
                        <td className="num text-chalk">{money(li.lineTotal)}</td>
                        <td className="text-right">
                          {editable && (
                            <button className="btn btn-ghost btn-sm" onClick={() => removeLine(li.id)}>Remove</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--hairline-strong)' }}>
                {[
                  ['Parts', selected.partsTotal],
                  ['Labour', selected.laborTotal],
                  ['Tax', selected.taxTotal],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between py-1 text-[0.86rem] text-chalk-dim">
                    <span>{k}</span><span>{money(v as string)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t pt-3 text-[1.05rem] font-semibold text-chalk"
                     style={{ borderColor: 'var(--hairline)' }}>
                  <span>Total</span><span>{money(selected.grandTotal)}</span>
                </div>
              </div>

              {editable && (
                <form onSubmit={addLine} className="mt-6 border-t pt-5" style={{ borderColor: 'var(--hairline)' }}>
                  <h3 className="mb-3 font-display text-[0.98rem]">Add a line</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field">
                      <span>Type</span>
                      <select value={lineType} onChange={(e) => setLineType(e.target.value as LineType)}>
                        <option value="PART">Part</option>
                        <option value="LABOR">Labour</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Quantity</span>
                      <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                    </label>
                  </div>
                  {lineType === 'PART' ? (
                    <label className="field">
                      <span>Part{selectedPart && ` — ${selectedPart.stockQuantity} in stock`}</span>
                      <select value={partId} onChange={(e) => setPartId(e.target.value)} required>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} ({p.stockQuantity})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="field">
                      <span>Rate</span>
                      <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
                    </label>
                  )}
                  <label className="field">
                    <span>Description (optional)</span>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Defaults to the part name" />
                  </label>
                  {short && (
                    <div className="notice notice-conflict">
                      Only {selectedPart!.stockQuantity} in stock. The server will refuse this with
                      409 and roll the whole operation back — stock will be unchanged.
                    </div>
                  )}
                  <button className="btn" disabled={busy}>Add line</button>
                </form>
              )}

              <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--hairline)' }}>
                <h3 className="mb-1 font-display text-[0.98rem]">Status</h3>
                <p className="mb-3 text-[0.8rem] text-chalk-faint">
                  Only transitions the server allows are offered — this list comes from
                  <span className="font-mono"> allowedNextStatuses</span> on the response.
                </p>
                {selected.allowedNextStatuses.length === 0 ? (
                  <p className="text-[0.85rem] text-chalk-faint">{selected.status} is terminal.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selected.allowedNextStatuses.map((s) => (
                      <button key={s} className="btn btn-ghost btn-sm" onClick={() => move(s)}>
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
