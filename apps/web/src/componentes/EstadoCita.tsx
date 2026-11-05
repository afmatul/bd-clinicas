import { Check, CircleCheck, Clock, X } from 'lucide-react';
import type { EstadoCita } from '@red-clinica/shared';

/** Pills de estado de cita, como en la leyenda del prototipo. */
export function PillCita({ estado }: { estado: EstadoCita }) {
  switch (estado) {
    case 'PROGRAMADA': return <span className="rc-pill"><span className="rc-pill__dot" />Programada</span>;
    case 'CONFIRMADA': return <span className="rc-pill rc-pill--info"><CircleCheck strokeWidth={1.75} aria-hidden="true" />Confirmada</span>;
    case 'EN_CONSULTA': return <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En consulta</span>;
    case 'ATENDIDA': return <span className="rc-pill rc-pill--success"><Check strokeWidth={1.75} aria-hidden="true" />Atendida</span>;
    case 'NO_ASISTIO': return <span className="rc-pill rc-pill--warning"><Clock strokeWidth={1.75} aria-hidden="true" />No asistió</span>;
    case 'CANCELADA': return <span className="rc-pill rc-pill--danger"><X strokeWidth={1.75} aria-hidden="true" />Cancelada</span>;
  }
}

export const LEYENDA_CITAS: EstadoCita[] = ['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA'];
