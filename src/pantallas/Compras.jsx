import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import FormCompra from '../componentes/FormCompra.jsx'
import FacturaVenta from '../componentes/FacturaVenta.jsx'
import { useCompras, registrarCompra } from '../almacen.js'
import { dinero, fechaLarga, pagadoCompra, saldoCompra } from '../utils.js'

export default function Compras() {
  const compras = useCompras()
  const [abierto, setAbierto] = useState(false)

  const invertido = compras.reduce((s, c) => s + c.total, 0)
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
                  <tr key={c.id}>
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
                      {saldo > 0 ? <span className="badge bajo">Debes {dinero(saldo)}</span> : <span className="badge ok">Pagada</span>}
                    </td>
                    <td>
                      <FacturaVenta compra={c} className="enlace" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

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
