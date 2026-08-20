import type {
  ApiErrorBody, Appointment, AppointmentStatus, Bay, Customer,
  LineType, LoginResponse, Part, RepairOrder, RepairOrderStatus, Staff, Vehicle,
} from './types'

const TOKEN_KEY = 'dms.token'
const USER_KEY = 'dms.user'

/**
 * A failed request, carrying the server's own message.
 *
 * The backend returns one JSON error shape everywhere, so the UI can show what
 * actually went wrong - "Bay 1 is already booked between ..." - rather than a
 * generic "something went wrong". Surfacing the real reason is most of what
 * makes the conflict handling visible in the interface.
 */
export class ApiError extends Error {
  readonly status: number
  readonly body?: ApiErrorBody

  constructor(status: number, body?: ApiErrorBody, fallback?: string) {
    super(body?.message || fallback || `Request failed with status ${status}`)
    this.status = status
    this.body = body
  }

  /** True for the conflicts this app raises deliberately. */
  get isConflict() {
    return this.status === 409
  }

  get fieldErrors() {
    return this.body?.fieldErrors ?? []
  }
}

export const auth = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: (): LoginResponse | null => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as LoginResponse) : null
  },
  save(login: LoginResponse) {
    localStorage.setItem(TOKEN_KEY, login.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(login))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

/** Notified when the server rejects our token, so the app can bounce to login. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = auth.token()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401) {
    // Expired or revoked. The filter reloads the user on every request, so a
    // deactivated account lands here immediately rather than at token expiry.
    auth.clear()
    onUnauthorized?.()
    throw new ApiError(401, undefined, 'Session expired - please sign in again')
  }

  if (!res.ok) {
    let parsed: ApiErrorBody | undefined
    try {
      parsed = (await res.json()) as ApiErrorBody
    } catch {
      // Non-JSON error page; fall through to the status-based message.
    }
    throw new ApiError(res.status, parsed)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const get = <T>(p: string) => request<T>('GET', p)
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b)
const patch = <T>(p: string, b?: unknown) => request<T>('PATCH', p, b)
const del = <T>(p: string) => request<T>('DELETE', p)

export interface BookingInput {
  vehicleId: number
  bayId: number
  scheduledStart: string
  scheduledEnd: string
  notes?: string
}

export const api = {
  login: (email: string, password: string) =>
    post<LoginResponse>('/api/auth/login', { email, password }),

  me: () => get<LoginResponse>('/api/auth/me'),

  bays: () => get<Bay[]>('/api/service-bays'),
  parts: () => get<Part[]>('/api/parts'),
  lowStock: () => get<Part[]>('/api/parts/low-stock'),
  receiveStock: (partId: number, quantity: number) =>
    post<Part>(`/api/parts/${partId}/receive?quantity=${quantity}`),
  vehicles: () => get<Vehicle[]>('/api/vehicles'),
  customers: () => get<Customer[]>('/api/customers'),
  technicians: () => get<Staff[]>('/api/technicians'),

  appointments: (status: AppointmentStatus) =>
    get<Appointment[]>(`/api/appointments?status=${status}`),
  appointment: (id: number) => get<Appointment>(`/api/appointments/${id}`),
  book: (input: BookingInput) => post<Appointment>('/api/appointments', input),
  setAppointmentStatus: (id: number, target: AppointmentStatus) =>
    patch<Appointment>(`/api/appointments/${id}/status?target=${target}`),

  /** PUT /schedule - moves an existing booking, re-running the overlap guard. */
  reschedule: (id: number, input: BookingInput) =>
    request<Appointment>('PUT', `/api/appointments/${id}/schedule`, input),

  /** Soft cancel: sets status CANCELLED, which releases the slot. */
  cancelAppointment: (id: number) => del<void>(`/api/appointments/${id}`),

  repairOrders: (status: RepairOrderStatus) =>
    get<RepairOrder[]>(`/api/repair-orders?status=${status}`),
  repairOrder: (id: number) => get<RepairOrder>(`/api/repair-orders/${id}`),
  openRepairOrder: (appointmentId: number) =>
    post<RepairOrder>(`/api/repair-orders?appointmentId=${appointmentId}`),
  addLine: (
    roId: number,
    line: {
      lineType: LineType
      partId?: number | null
      description: string
      quantity: number
      unitPrice?: string | null
    },
  ) => post<RepairOrder>(`/api/repair-orders/${roId}/line-items`, line),
  removeLine: (roId: number, lineId: number) =>
    del<RepairOrder>(`/api/repair-orders/${roId}/line-items/${lineId}`),
  setRepairOrderStatus: (id: number, target: RepairOrderStatus) =>
    patch<RepairOrder>(`/api/repair-orders/${id}/status?target=${target}`),

  assignTechnician: (id: number, technicianId: number) =>
    request<RepairOrder>('PUT', `/api/repair-orders/${id}/technician?technicianId=${technicianId}`),
}

/** Renders the server's DECIMAL strings as currency without going through float. */
export function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  }).format(n)
}

/** "2028-07-26T09:00:00" -> "26 Jul 2028, 09:00" with no timezone shifting. */
export function formatSlot(iso: string): string {
  const [date, time] = iso.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${y}, ${time.slice(0, 5)}`
}
