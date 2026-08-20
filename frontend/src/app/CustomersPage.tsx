import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Customer, Vehicle } from '../api/types'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.customers(), api.vehicles()])
      .then(([c, v]) => { setCustomers(c); setVehicles(v) })
      .catch(() => setError('Could not load customers'))
  }, [])

  return (
    <>
      <header className="mb-8">
        <h1 className="display text-[2rem]">Customers</h1>
        <p className="mt-2 text-[0.9rem] text-chalk-dim">
          Every customer on file, with their vehicles. Book any of them straight into a bay.
        </p>
      </header>

      {error && <div className="notice notice-error">{error}</div>}

      <div className="grid gap-5">
        {customers.map((c) => {
          const owned = vehicles.filter((v) => v.customerId === c.id)
          return (
            <section key={c.id} className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="font-display text-[1.05rem] text-chalk">{c.fullName}</h2>
                  <p className="mt-1 text-[0.82rem] text-chalk-faint">
                    {c.email} · {c.phone}
                  </p>
                </div>
                <span className="label">
                  {owned.length} vehicle{owned.length === 1 ? '' : 's'}
                </span>
              </div>

              {owned.length === 0 ? (
                <p className="text-[0.85rem] text-chalk-faint">No vehicles on file.</p>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>VIN</th><th>Vehicle</th><th className="num">Year</th>
                        <th className="num">Mileage</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {owned.map((v) => (
                        <tr key={v.id}>
                          <td className="font-mono text-[0.74rem]">{v.vin}</td>
                          <td className="text-chalk">{v.make} {v.model}</td>
                          <td className="num">{v.modelYear}</td>
                          <td className="num">{v.mileage.toLocaleString()}</td>
                          <td className="text-right">
                            {/* Carries the vehicle through as a query parameter, so
                                the booking form opens with it already selected. */}
                            <Link className="btn btn-ghost btn-sm no-underline" to={`/app/bookings?vehicleId=${v.id}`}>
                              Book service
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}
