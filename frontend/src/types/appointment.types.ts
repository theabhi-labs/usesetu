export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  _id: string;
  service: string;
  customer: string;
  appointmentDate: string; // 'YYYY-MM-DD'
  slotStart: string;       // 'HH:mm'
  slotEnd: string;
  status: AppointmentStatus;
  remarks?: string;
}

// GET /appointments/slots response .data
export interface SlotsResponse {
  date: string;
  slots: { start: string; end: string; capacity: number; booked: number; available: number }[];
}
