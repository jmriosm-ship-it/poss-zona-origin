import { useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import { useClientes, useVentas, useAbonos, useCompras, useCreditos, guardarCliente, registrarAbono, abonarCompra, pagarCredito } from '../almacen.js'
import CreditoDetalle, { recordatorioCredito } from '../componentes/CreditoDetalle.jsx'
import { dinero, fechaLarga, nuevoId, resumenCredito, saldoCliente, saldoCompra } from '../utils.js'
import { constanciaAutorizacion } from '../legal.js'
import { abrirVisor } from '../visor.js'

// Ventana para registrar un abono (de un cliente o a un proveedor)
function Abono({ titulo, saldo, sugerido, onConfirmar, onCerrar }) {
  const [valor, setValor] = useState(String(sugerido ?? saldo))
  const [medio, setMedio] = useState('Efectivo')
  const [error, setError] = useState('')

  function guardar(e) {
    e.preventDefault()
    const n = Number(valor)
    if (!(n > 0)) return setError('Escribe un valor mayor a 0.')
    if (n > saldo) return setError(`No puede ser mayor al saldo (${dinero(saldo)}).`)
    onConfirmar(n, medio)
  }

  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal modal-chico" onSubmit={guardar}>
        <div className="panel-cabeza">
          <div>
            <h2>{titulo}</h2>
            <p className="sub">Saldo actual: {dinero(saldo)}</p>
          </div>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="inline-form">
          <input type="number" min="0" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
          <select value={medio} onChange={(e) => setMedio(e.target.value)}>
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-pie">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn oscuro">
            Registrar
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Deudas() {
  const clientes = useClientes()
  const ventas = useVentas()
  const abonos = useAbonos()
  const compras = useCompras()
  const creditos = useCreditos()
  const [verCredito, setVerCredito] = useState(null)
  const [tab, setTab] = useState('cobrar')
  const [abonando, setAbonando] = useState(null)
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', autoriza: false })

  const deudores = clientes
    .map((c) => ({ ...c, saldo: saldoCliente(c.id, ventas, abonos) }))
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
  const totalFiado = deudores.reduce((s, c) => s + c.saldo, 0)

  // Créditos en cuotas con saldo pendiente
  const activos = creditos
    .filter((c) => c.estado === 'activo')
    .map((c) => ({ ...c, r: resumenCredito(c) }))
    .filter((c) => c.r.saldo > 0)
    .sort((a, b) => b.r.mora - a.r.mora || b.r.saldo - a.r.saldo)
  const totalCreditos = activos.reduce((s, c) => s + c.r.saldo, 0)
  const totalMora = activos.reduce((s, c) => s + c.r.mora, 0)
  const totalCobrar = totalFiado + totalCreditos

  const porPagar = compras.filter((c) => saldoCompra(c) > 0)
  const totalPagar = porPagar.reduce((s, c) => s + saldoCompra(c), 0)

  // Días desde la venta fiada más antigua del cliente
  function dias(clienteId) {
    const fechas = ventas
      .filter((v) => v.estado !== 'anulada' && v.clienteId === clienteId && v.pagos.some((p) => p.medio === 'Fiado'))
      .map((v) => v.fecha)
      .sort()
    return fechas.length ? Math.floor((Date.now() - new Date(fechas[0]).getTime()) / 86400000) : 0
  }

  function recordar(c) {
    const tel = (c.telefono || '').replace(/\D/g, '')
    if (!tel) return alert('Este cliente no tiene teléfono guardado.')
    const numero = tel.length === 10 ? '57' + tel : tel
    const texto = `Hola ${c.nombre}, te recordamos que tienes un saldo pendiente de ${dinero(c.saldo)} en Zona Originals. ¡Gracias!`
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  function crearCliente(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    if (!form.autoriza) return alert('Marca que el cliente autorizó el tratamiento de sus datos.')
    guardarCliente({ id: nuevoId(), nombre: form.nombre.trim(), telefono: form.telefono.trim(), autorizacion: constanciaAutorizacion() })
    setForm({ nombre: '', telefono: '', autoriza: false })
    setNuevo(false)
  }

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Quién te debe y a quién le debes</p>
          <h1 className="titulo">Deudas</h1>
          <p className="subtitulo">
            Por cobrar {dinero(totalCobrar)}{totalMora > 0 ? ` (en mora ${dinero(totalMora)})` : ''} · Por pagar {dinero(totalPagar)}
          </p>
        </div>
        <div className="cabecera-acciones">
          <button className="btn" onClick={() => setNuevo(true)}>
            <Icono nombre="mas" tam={18} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="filtros">
          <div className="segmentos">
            <button className={tab === 'cobrar' ? 'activo' : ''} onClick={() => setTab('cobrar')}>
              Por cobrar ({deudores.length})
            </button>
            <button className={tab === 'creditos' ? 'activo' : ''} onClick={() => setTab('creditos')}>
              Créditos ({activos.length})
            </button>
            <button className={tab === 'pagar' ? 'activo' : ''} onClick={() => setTab('pagar')}>
              Por pagar ({porPagar.length})
            </button>
          </div>
        </div>

        {tab === 'cobrar' &&
          (deudores.length === 0 ? (
            <div className="vacio">Nadie te debe nada. Los fiados aparecen aquí cuando vendas con el medio "Fiado".</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Antigüedad</th>
                  <th>Debe</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deudores.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nombre}</strong>
                    </td>
                    <td>{c.telefono || '—'}</td>
                    <td>
                      <span className={'badge ' + (dias(c.id) > 30 ? 'agotado' : dias(c.id) > 15 ? 'bajo' : 'ok')}>{dias(c.id)} días</span>
                    </td>
                    <td>
                      <strong>{dinero(c.saldo)}</strong>
                    </td>
                    <td className="acciones">
                      <button className="enlace" onClick={() => recordar(c)}>
                        WhatsApp
                      </button>
                      <button
                        className="enlace"
                        style={{ marginLeft: 12 }}
                        onClick={() => setAbonando({ tipo: 'cliente', id: c.id, titulo: `Abono de ${c.nombre}`, saldo: c.saldo })}
                      >
                        Abonar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === 'creditos' &&
          (activos.length === 0 ? (
            <div className="vacio">No hay créditos activos. Se crean al cobrar en la Caja con el medio "Crédito (cuotas)".</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Venta</th>
                  <th>Próxima cuota</th>
                  <th>Estado</th>
                  <th>Saldo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {activos.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.clienteNombre}</strong>
                      <small className="gris">{c.descripcion}</small>
                    </td>
                    <td>{c.ventaEtiqueta || '#' + String(c.ventaNumero).padStart(5, '0')}</td>
                    <td>
                      {c.r.proxima ? (
                        <>
                          {dinero(c.r.proxima.pendiente)}
                          <small className="gris">{fechaLarga(c.r.proxima.vence + 'T12:00:00')}</small>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={'badge ' + (c.r.mora > 0 ? 'agotado' : 'ok')}>{c.r.mora > 0 ? `Mora ${c.r.diasMora} d` : 'Al día'}</span>
                    </td>
                    <td>
                      <strong>{dinero(c.r.saldo)}</strong>
                    </td>
                    <td className="acciones">
                      {recordatorioCredito(c) && (
                        <a className="enlace" href={recordatorioCredito(c)} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      )}
                      <button className="enlace" style={{ marginLeft: 12 }} onClick={() => setVerCredito(c.id)}>
                        Ver / pagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === 'pagar' &&
          (porPagar.length === 0 ? (
            <div className="vacio">No le debes nada a ningún proveedor.</div>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Compra</th>
                  <th>Total</th>
                  <th>Debes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {porPagar.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.proveedor}</strong>
                    </td>
                    <td>{fechaLarga(c.fecha)}</td>
                    <td>{dinero(c.total)}</td>
                    <td>
                      <strong>{dinero(saldoCompra(c))}</strong>
                    </td>
                    <td className="acciones">
                      <button
                        className="enlace"
                        onClick={() => setAbonando({ tipo: 'compra', id: c.id, titulo: `Pago a ${c.proveedor}`, saldo: saldoCompra(c) })}
                      >
                        Abonar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      {verCredito && (
        <CreditoDetalle
          creditoId={verCredito}
          onCerrar={() => setVerCredito(null)}
          onPagar={(c, r) =>
            setAbonando({
              tipo: 'credito',
              id: c.id,
              titulo: `Pago de ${c.clienteNombre}`,
              saldo: r.saldo,
              sugerido: Math.min(r.saldo, r.mora > 0 ? r.mora : r.proxima?.pendiente || r.saldo),
            })
          }
        />
      )}

      {abonando && (
        <Abono
          titulo={abonando.titulo}
          saldo={abonando.saldo}
          sugerido={abonando.sugerido}
          onCerrar={() => setAbonando(null)}
          onConfirmar={(valor, medio) => {
            if (abonando.tipo === 'cliente') registrarAbono({ clienteId: abonando.id, valor, medio })
            else if (abonando.tipo === 'credito') pagarCredito(abonando.id, valor, medio)
            else abonarCompra(abonando.id, valor, medio)
            setAbonando(null)
          }}
        />
      )}

      {nuevo && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setNuevo(false)}>
          <form className="modal modal-chico" onSubmit={crearCliente}>
            <div className="panel-cabeza">
              <h2>Nuevo cliente</h2>
              <button type="button" className="boton-icono" onClick={() => setNuevo(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className="campos">
              <label className="ancho">
                <span>Nombre</span>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus />
              </label>
              <label className="ancho">
                <span>Teléfono (WhatsApp)</span>
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </label>
            </div>
            <label className="casilla-acepto" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={form.autoriza} onChange={(e) => setForm({ ...form, autoriza: e.target.checked })} />
              <span>
                El cliente fue informado y <strong>autorizó</strong> el tratamiento de sus datos.{' '}
                <button type="button" className="enlace" onClick={() => abrirVisor('legal', 'clientes')}>
                  Ver texto
                </button>
              </span>
            </label>
            <div className="modal-pie">
              <button type="button" className="btn" onClick={() => setNuevo(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn oscuro">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
