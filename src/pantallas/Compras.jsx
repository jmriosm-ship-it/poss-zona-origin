import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import FormCompra from '../componentes/FormCompra.jsx'
import FacturaVenta from '../componentes/FacturaVenta.jsx'
import { useCompras, registrarCompra, editarCompra, anularCompra } from '../almacen.js'
import { dinero, fechaLarga, pagadoCompra, saldoCompra } from '../utils.js'

export default function Compras() {
  const compras = useCompras()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState(null)

  const invertido = compras.filter((c) => !c.anulada).reduce((s, c) => s + c.total, 0)
  const porPagar = compras.reduce((s, c) => s + saldoCompra(c), 0)

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Lo que entra a la tienda</p>
          <h1 className="titulo">Compras</h1>
          <p className="subtitulo">
            {compras.length} compras · {dinero(invertido)} invertidos · {dinero(porPagar)} por pagar
          </p>
        </div>
        <div className="cabecera-acciones">
          <button className="btn oscuro" onClick={() => setAbierto(true)}>
            <Icono nombre="mas" tam={18} /> Registrar compra
          </button>
        </div>
      </div>

      <div className="panel">
        {compras.length === 0 ? (
          <div className="vacio">Todavía no hay compras. Cuando llegue mercancía, regístrala aquí.</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Unidades</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Estado</th>
                <th>Factura</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const saldo = saldoCompra(c)
                return (
                  <tr key={c.id} style={c.anulada ? { opacity: 0.5 } : undefined}>
                    <td>{fechaLarga(c.fecha)}</td>
                    <td>
                      <strong>{c.proveedor}</strong>
                      <small className="gris">{c.items.map((i) => `${i.cantidad} ${i.nombre}`).join(', ')}</small>
                    </td>
                    <td>{c.items.reduce((s, i) => s + i.cantidad, 0)}</td>
                    <td>
                      <strong>{dinero(c.total)}</strong>
                    </td>
                    <td>{dinero(pagadoCompra(c))}</td>
                    <td>
                      {c.anulada ? (
                        <span className="badge agotado">Anulada</span>
                      ) : saldo > 0 ? (
                        <span className="badge bajo">Debes {dinero(saldo)}</span>
                      ) : (
                        <span className="badge ok">Pagada</span>
                      )}
                    </td>
                    <td>
                      <FacturaVenta compra={c} className="enlace" />
                      {!c.anulada && (
                        <button className="enlace" style={{ marginLeft: 10 }} onClick={() => setEditando(c)}>
                          Editar
                        </button>
                      )}
                      {!c.anulada && (
                        <button
                          className="enlace peligro"
                          style={{ marginLeft: 10 }}
                          onClick={() =>
                            confirm(
                              '¿Anular esta compra de ' + c.proveedor + '?\n\nSe quita del inventario lo que sumó (' + c.items.reduce((s, i) => s + i.cantidad, 0) + ' unidades) y deja de contar como deuda. Queda en el historial como anulada.' +
                                (c.pagos.length ? '\n\nOjo: tiene pagos registrados; también dejan de contar.' : ''),
                            ) && anularCompra(c.id)
                          }
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <FormCompra
          compra={editando}
          onGuardar={(datos) => {
            editarCompra(editando.id, datos)
            setEditando(null)
          }}
          onCerrar={() => setEditando(null)}
        />
      )}

      {abierto && (
        <FormCompra
          onGuardar={(datos) => {
            registrarCompra(datos)
            setAbierto(false)
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  )
}
