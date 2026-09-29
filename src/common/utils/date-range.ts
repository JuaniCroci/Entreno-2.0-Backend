import { AppError } from '../errors/AppError.js';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  desde?: Date;
  hasta?: Date;
}

function parseFecha(valor: string, campo: string, hora: string): Date {
  if (!FECHA_RE.test(valor)) {
    throw new AppError(400, `"${campo}" debe tener formato YYYY-MM-DD`);
  }
  const fecha = new Date(`${valor}T${hora}`);
  if (Number.isNaN(fecha.getTime())) {
    throw new AppError(400, `"${campo}" no es una fecha válida`);
  }
  return fecha;
}

export function parseDateRange(desde?: string, hasta?: string): DateRange {
  if (!desde && !hasta) return {};
  const d = desde ? parseFecha(desde, 'desde', '00:00:00.000Z') : undefined;
  const h = hasta ? parseFecha(hasta, 'hasta', '23:59:59.999Z') : undefined;
  if (d && h && d > h) throw new AppError(400, '"desde" no puede ser posterior a "hasta"');
  return { desde: d, hasta: h };
}
