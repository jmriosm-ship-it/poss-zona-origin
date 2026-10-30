import { useCreditos, useClientes, useConfig, marcarRecordatorio } from '../almacen.js'
import { cuotasPorAvisar } from '../recordatorios.js'
import { dinero, fechaLarga } from '../utils.js'

// Cuotas que vencen hoy, mañana o están vencidas: un clic abre WhatsApp con el mensaje listo
export default function AvisosCuotas() {
  const creditos = useCreditos()
  const clientes = useClientes()
  const config = useConfig()
  const filas = cuotasPorAvisar(creditos, clientes, config)

  if (filas.length === 0) return null

  function enviar(f) {
    window.open(f.enlace, '_blank')
    marcarRecordatorio(f.credito.id, f.clave)
  }

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-cabeza">
        <div>
          <h2>Avisos de cuotas por WhatsApp ({filas.length})</h2>
          <p className="sub">Toca "Enviar": se abre WhatsApp con el mensaje escrito. Solo falta darle enviar.</p>
        </div>
      </div>
      <table className="tabla">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Cuota</th>
            <th>Vence</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.credito.id + f.clave}>
              <td>
                <strong>{f.cliente}</strong>
                <small className="gris">{f.numero ? '+' + f.numero : 'Sin número de WhatsApp'}</small>
              </td>
              <td>
                {f.cuota.n} de {f.credito.plazo} · {dinero(f.cuota.pendiente)}
              </td>
              <td>
                {f.tipo === 'mora' ? <span className="badge agotado">Vencida · {fechaLarga(f.cuota.vence)}</span> : f.dias === 0 ? <span className="badge bajo">Hoy</span> : <span className="badge ok">Mañana</span>}
              </td>
              <td className="acciones">
                {f.numero ? (
                  <button className="btn chico oscuro" onClick={() => enviar(f)}>
                    Enviar WhatsApp
                  </button>
                ) : (
                  <span className="gris">Agrega su WhatsApp en Clientes</span>
                )}
                {f.numero && (
                  <button className="enlace" style={{ marginLeft: 10 }} onClick={() => marcarRecordatorio(f.credito.id, f.clave)}>
                    Ya avisé
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
