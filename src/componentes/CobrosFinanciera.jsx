import { useState } from 'react'
import { useVentas, useFinanciera, registrarCobroFinanciera } from '../almacen.js'
import { cobradoFinanciera, dinero, etiquetaVenta, fechaHora, valorFinanciera } from '../utils.js'

// Ventas que la financiera le debe al local: se anotan sus pagos y recién ahí entran a caja y a ganancias
export default function CobrosFinanciera() {
  const ventas = useVentas()
  const cobros = useFinanciera()
  const [pagando, setPagando] = useState(null)
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')

  const filas = ventas
    .filter((v) => v.estado !== 'anulada' && valorFinanciera(v) > 0)
    .map((v) => {
      const esperado = valorFinanciera(v)
      const cobrado = cobradoFinanciera(v, cobros)
      return { v, esperado, cobrado, saldo: esperado - cobrado }
    })
  const pendientes = filas.filter((f) => f.saldo > 0)
  const totalPendiente = pendientes.reduce((s, f) => s + f.saldo, 0)
  const ultimos = cobros.slice(0, 10)

  function pagar(e) {
    e.preventDefault()
    const n = Math.min(Number(valor) || 0, pagando.saldo)
    if (!(n > 0)) return
    registrarCobroFinanciera(pagando.v, n, nota.trim(), 'pago')
    setPagando(null)
    setValor('')
    setNota('')
  }

  function cerrarConDiferencia(f) {
    if (!confirm('La financiera pagó ' + dinero(f.cobrado) + ' de ' + dinero(f.esperado) + '. ¿Dar la cuenta por cerrada y anotar ' + dinero(f.saldo) + ' como diferencia (comisión o descuento)?')) return
    registrarCobroFinanciera(f.v, f.saldo, 'Diferencia al cerrar', 'ajuste')
  }

  return (
    <>
      <p className="gris" style={{ marginBottom: 10 }}>
        Ventas a crédito que cobra la financiera. Esa plata <strong>no cuenta en caja ni en ganancias</strong> hasta que la financiera te paga y lo anotas aquí.
      </p>
      {pendientes.length === 0 ? (
        <div className="vacio">Ninguna financiera te debe plata. Cuando vendas con el medio "Financiera" aparecerá aquí.</div>
      ) : (
        <>
          <p>
            <strong>Por cobrar a financieras: {dinero(totalPendiente)}</strong>
          </p>
          <table className="tabla">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Financiera</th>
                <th>Esperado</th>
                <th>Recibido</th>
                <th>Falta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pendientes.map((f) => (
                <tr key={f.v.id}>
                  <td>
                    <strong>{etiquetaVenta(f.v)}</strong>
                    <small className="gris">{fechaHora(f.v.fecha)}{f.v.clienteNombre ? ' · ' + f.v.clienteNombre : ''}</small>
                  </td>
                  <td>{f.v.financieraNombre || '—'}</td>
                  <td>{dinero(f.esperado)}</td>
                  <td>{dinero(f.cobrado)}</td>
                  <td>
                    <strong style={{ color: 'var(--rojo)' }}>{dinero(f.saldo)}</strong>
                  </td>
                  <td className="acciones">
                    <button
                      className="btn chico oscuro"
                      onClick={() => {
                        setPagando(f)
                        setValor(String(f.saldo))
                      }}
                    >
                      Registrar pago
                    </button>
                    {f.cobrado > 0 && (
                      <button className="enlace" style={{ marginLeft: 10 }} onClick={() => cerrarConDiferencia(f)}>
                        Cerrar con diferencia
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {ultimos.length > 0 && (
        <>
          <h3 style={{ margin: '18px 0 6px' }}>Últimos pagos de financieras</h3>
          <table className="tabla">
            <tbody>
              {ultimos.map((c) => (
                <tr key={c.id}>
                  <td>{fechaHora(c.fecha)}</td>
                  <td>
                    {c.financiera || 'Financiera'} · venta {c.ventaEtiqueta}
                    {c.tipo === 'ajuste' && <small className="gris">Diferencia con la que se cerró la cuenta</small>}
                  </td>
                  <td>{dinero(c.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {pagando && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setPagando(null)}>
          <form className="modal modal-chico" onSubmit={pagar}>
            <div className="panel-cabeza">
              <div>
                <h2>Pago de la financiera</h2>
                <p className="sub">
                  Venta {etiquetaVenta(pagando.v)} · falta {dinero(pagando.saldo)}
                </p>
              </div>
            </div>
            <label className="cupo-sacar">
              <span>¿Cuánto te pagó?</span>
              <div>
                <b>$</b>
                <input type="number" min="0" max={pagando.saldo} autoFocus value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            </label>
            <input className="cupo-concepto" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional): número de transferencia, fecha…" />
            <div className="modal-pie">
              <button type="button" className="btn" onClick={() => setPagando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn oscuro" disabled={!(Number(valor) > 0)}>
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
