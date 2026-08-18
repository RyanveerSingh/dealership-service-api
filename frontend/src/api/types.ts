/**
 * Mirrors the Java DTOs in com.dms.service.web.dto.
 *
 * Keeping these in step with the backend is the point of using TypeScript here:
 * rename a field in AppointmentResponse.java and every call site that reads it
 * fails to compile, instead of quietly rendering "undefined" in the browser.
 */

export type Role = 'ADMIN' | 'SERVICE_ADVISOR' | 'TECHNICIAN' | 'CUSTOMER'

export type AppointmentStatus =
  | 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type RepairOrderStatus =
  | 'OPEN' | 'AWAITING_PARTS' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'CLOSED' | 'VOIDED'

export type LineType = 'PART' | 'LABOR'

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  email: string
  fullName: string
  role: Role
}

export interface Appointment {
  id: number
  vehicleId: number
  vehicleVin: string
  bayId: number
  bayName: string
  advisorId: number
  advisorName: string
  scheduledStart: string
  scheduledEnd: string
  status: AppointmentStatus
  notes: string | null
}

export interface LineItem {
  id: number
  lineType: LineType
  partId: number | null
  partSku: string | null
  description: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

export interface RepairOrder {
  id: number
  appointmentId: number
  technicianId: number | null
  technicianName: string | null
  status: RepairOrderStatus
  openedAt: string
  closedAt: string | null
  partsTotal: string
  laborTotal: string
  taxTotal: string
  grandTotal: string
  /** The server publishes the legal next states so the UI can disable the rest. */
  allowedNextStatuses: RepairOrderStatus[]
  lineItems: LineItem[]
}

export interface Bay {
  id: number
  name: string
  active: boolean
}

export interface Part {
  id: number
  sku: string
  name: string
  unitPrice: string
  stockQuantity: number
  reorderLevel: number
  belowReorderLevel: boolean
}

export interface Vehicle {
  id: number
  vin: string
  make: string
  model: string
  modelYear: number
  mileage: number
  customerId: number
  customerName: string
}

export interface Customer {
  id: number
  fullName: string
  email: string
  phone: string
}

/** The single error shape every endpoint uses, including the security filters. */
export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: { field: string; message: string }[]
}
