import { useState } from 'react'
import { TicketCierre } from './CierreCaja.jsx'
import { useTurnos } from '../almacen.js'
import { cajaDe, dinero, fechaHora } from '../utils.js'

// Cierres de caja anteriores: se pueden ver y volver a imprimir
export default function HistorialCierres() {
  const cerrados = useTurnos().filter((t) => t.fechaCierre).slice(0, 15)
  const [ver, setVer] = useState(null)

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-cabeza">
        <div>
          <h2>Cierres anteriores</h2>
          <p className="sub">Los cierres más recientes. Puedes verlos y volver a imprimirlos.</p>
        </div>
      </div>

      {cerrados.length === 0 ? (
        <div className="vacio chico">Todavía no hay cierres de caja.</div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Cierre</th>
              <th>Caja</th>
              <th>Empezó</th>
              <th>Terminó</th>
              <th>Ventas</th>
              <th>Vendido</th>
              <th>Esperado</th>
              <th>Diferencia</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cerrados.map((t) => {
              const dif = t.contado - t.esperado
              return (
                <tr key={t.id}>
                  <td>
                    {fechaHora(t.fechaCierre)}
                    <small className="gris">Abierta {fechaHora(t.fechaApertura)}</small>
                  </td>
                  <td>{cajaDe(t)}</td>
                  <td>
                    {dinero(t.inicial)}
                    {t.abrioPor && <small className="gris">{t.abrioPor}</small>}
                  </td>
                  <td>
                    {dinero(t.contado)}
                    {t.cerroPor && <small className="gris">{t.cerroPor}</small>}
                  </td>
                  <td>{t.resumen ? t.resumen.nVentas : '—'}</td>
                  <td>{t.resumen ? dinero(t.resumen.vendido) : '—'}</td>
                  <td>{dinero(t.esperado)}</td>
                  <td>
                    <span className={'badge ' + (dif === 0 ? 'ok' : dif > 0 ? 'bajo' : 'agotado')}>
                      {dif === 0 ? 'Cuadra' : dif > 0 ? `Sobran ${dinero(dif)}` : `Faltan ${dinero(-dif)}`}
                    </span>
                  </td>
                  <td className="acciones">
                    {t.resumen && (
                      <button className="enlace" onClick={() => setVer(t)}>
                        Ver / imprimir
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {ver && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setVer(null)}>
          <div className="modal modal-chico">
            <TicketCierre turno={ver} resumen={ver.resumen} contado={ver.contado} esperado={ver.esperado} />
            <div className="modal-pie sin-imprimir">
              <button className="btn" onClick={() => setVer(null)}>
                Cerrar
              </button>
              <button className="btn oscuro" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
