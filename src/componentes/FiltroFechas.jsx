import { PERIODOS, rangoPeriodo } from '../utils.js'

const OPCIONES = [...PERIODOS, ['rango', 'Fechas']]

// Rango de fechas de un período; "rango" usa las dos fechas elegidas (inclusive)
export function rangoDe(periodo, desde, hasta) {
  if (periodo === 'rango') return [new Date(desde + 'T00:00:00'), new Date(new Date(hasta + 'T00:00:00').getTime() + 864e5)]
  return rangoPeriodo(periodo)
}

// Botones Hoy / Este mes / Mes pasado / Todo / Fechas, y las dos fechas cuando se elige "Fechas"
export default function FiltroFechas({ periodo, onPeriodo, desde, hasta, onDesde, onHasta }) {
  return (
    <>
      <div className="segmentos">
        {OPCIONES.map(([k, t]) => (
          <button key={k} className={periodo === k ? 'activo' : ''} onClick={() => onPeriodo(k)}>
            {t}
          </button>
        ))}
      </div>
      {periodo === 'rango' && (
        <div className="rango-fechas" style={{ margin: 0 }}>
          Desde <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && onDesde(e.target.value)} />
          hasta <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && onHasta(e.target.value)} />
        </div>
      )}
    </>
  )
}
