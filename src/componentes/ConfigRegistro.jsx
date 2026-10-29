import { useState } from 'react'
import { useAuditoria } from '../almacen.js'
import { fechaHora } from '../utils.js'

// Registro de acciones: quién hizo qué, desde qué caja y cuándo
export default function ConfigRegistro() {
  const todo = useAuditoria()
  const [buscar, setBuscar] = useState('')
  const q = buscar.trim().toLowerCase()
  const lista = todo.filter((a) => !q || [a.usuario, a.accion, a.detalle, a.caja].some((t) => (t || '').toLowerCase().includes(q))).slice(0, 300)

  return (
    <div className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Registro de acciones</h2>
          <p className="sub">Quién entró, anuló ventas, hizo devoluciones, borró cosas o cerró la caja. Se ve en las dos cajas.</p>
        </div>
      </div>
      <div className="filtros">
        <input placeholder="Buscar por usuario o acción" value={buscar} onChange={(e) => setBuscar(e.target.value)} style={{ flex: 1, maxWidth: 360 }} />
      </div>
      {lista.length === 0 ? (
        <div className="vacio chico">Todavía no hay acciones registradas.</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Caja</th>
              <th>Acción</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id}>
                <td>{fechaHora(a.fecha)}</td>
                <td>{a.usuario}</td>
                <td>{a.caja}</td>
                <td>
                  <strong>{a.accion}</strong>
                </td>
                <td>{a.detalle || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
