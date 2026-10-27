import { useState } from 'react'

// Elegir qué equipos (IMEI / serial) se venden de una variante
export default function ElegirImei({ titulo, disponibles, resaltar, onAgregar, onCerrar }) {
  const [marcados, setMarcados] = useState(resaltar && disponibles.includes(resaltar) ? [resaltar] : [])
  const [filtro, setFiltro] = useState('')

  const lista = disponibles.filter((m) => m.includes(filtro.trim().toUpperCase()))
  const alternar = (m) => setMarcados((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal modal-chico">
        <div className="panel-cabeza">
          <div>
            <h2>Elige el equipo</h2>
            <p className="sub">{titulo}</p>
          </div>
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {disponibles.length === 0 ? (
          <div className="vacio">No quedan equipos disponibles de esta variante.</div>
        ) : (
          <>
            <input
              className="campo-simple"
              placeholder="Buscar IMEI / serial"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              autoFocus
            />
            <div className="imei-lista">
              {lista.map((m) => (
                <label key={m} className={marcados.includes(m) ? 'marcado' : ''}>
                  <input type="checkbox" checked={marcados.includes(m)} onChange={() => alternar(m)} />
                  <span style={{ fontFamily: 'Courier New, monospace' }}>{m}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="modal-pie">
          <button className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn oscuro" disabled={marcados.length === 0} onClick={() => onAgregar(marcados)}>
            Agregar {marcados.length > 0 && `(${marcados.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
