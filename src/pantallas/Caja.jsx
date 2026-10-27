import { useEffect, useMemo, useRef, useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import Cobro from '../componentes/Cobro.jsx'
import Recibo from '../componentes/Recibo.jsx'
import ElegirImei from '../componentes/ElegirImei.jsx'
import BarraCaja from '../componentes/BarraCaja.jsx'
import CierreCaja from '../componentes/CierreCaja.jsx'
import { pitar, useLector } from '../lector.js'
import { useProductos, useClientes, useVentas, usePromos, useConfig, registrarVenta, registrarCredito, guardarCliente } from '../almacen.js'
import { useUsuario } from '../auth.js'
import { armarCuotas, dinero, mejorPromo, puntosCliente } from '../utils.js'

const limitar = (n, min, max) => Math.min(max, Math.max(min, n))

export default function Caja() {
  const productos = useProductos()
  const clientes = useClientes()
  const ventas = useVentas()
  const promos = usePromos()
  const config = useConfig()
  const usuario = useUsuario()

  const [buscar, setBuscar] = useState('')
  const [carrito, setCarrito] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [descuento, setDescuento] = useState('')
  const [tipoDesc, setTipoDesc] = useState('%')
  const [usarPuntos, setUsarPuntos] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [recibo, setRecibo] = useState(null)
  const [elegir, setElegir] = useState(null) // { producto, variante, resaltar }: ventana para elegir IMEI
  const [aviso, setAviso] = useState(null) // { texto, error }: lo último que leyó la pistola
  const [cierre, setCierre] = useState(false)
  const entrada = useRef(null)
  const temporizadorAviso = useRef(null)

  function avisar(texto, error = false) {
    setAviso({ texto, error })
    clearTimeout(temporizadorAviso.current)
    temporizadorAviso.current = setTimeout(() => setAviso(null), 3500)
  }

  const filas = useMemo(
    () => productos.flatMap((producto) => producto.variantes.map((variante) => ({ producto, variante }))),
    [productos],
  )
  const q = buscar.trim().toLowerCase()
  const resultados = filas
    .filter(
      ({ producto, variante }) =>
        !q ||
        producto.nombre.toLowerCase().includes(q) ||
        producto.categoria.toLowerCase().includes(q) ||
        variante.codigo.toLowerCase().includes(q) ||
        (variante.imeis || []).some((m) => m.toLowerCase().includes(q)),
    )
    .slice(0, 60)

  const cliente = clientes.find((c) => c.id === clienteId) || null
  const puntosDisponibles = cliente ? puntosCliente(cliente.id, ventas) : 0

  // Promociones automáticas, descuento manual y puntos
  const lineas = carrito.map((i) => ({ ...i, promo: mejorPromo(i, promos) }))
  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const descPromo = lineas.reduce((s, l) => s + l.promo.valor, 0)
  const base = subtotal - descPromo
  const d = Number(descuento) || 0
  const descManual = limitar(Math.round(tipoDesc === '%' ? (base * d) / 100 : d), 0, base)
  const maxPuntos = config.valorPunto > 0 ? Math.floor((base - descManual) / config.valorPunto) : 0
  const puntosUsados = limitar(Math.floor(Number(usarPuntos) || 0), 0, Math.min(puntosDisponibles, maxPuntos))
  const descPuntos = puntosUsados * config.valorPunto
  const total = base - descManual - descPuntos
  const descuentoTotal = descPromo + descManual + descPuntos

  // Atajos: F2 busca, F9 cobra
  useEffect(() => {
    function tecla(e) {
      if (e.key === 'F2') {
        e.preventDefault()
        entrada.current?.focus()
      }
      if (e.key === 'F9' && carrito.length && !recibo) {
        e.preventDefault()
        setCobrando(true)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [carrito.length, recibo])

  const imeisEnCarrito = (varianteId) => carrito.find((i) => i.varianteId === varianteId)?.imeis || []
  const disponiblesDe = (variante) => (variante.imeis || []).filter((m) => !imeisEnCarrito(variante.id).includes(m))

  // Línea nueva del carrito para un producto/variante
  const lineaNueva = (producto, variante) => ({
    productoId: producto.id,
    varianteId: variante.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    condicion: producto.condicion || '',
    garantiaDias: producto.garantiaDias || 0,
    detalle: [variante.talla, variante.color].filter(Boolean).join(' '),
    precio: producto.precio,
    costo: producto.costo,
    cantidad: 0,
    max: variante.stock,
    ...(producto.porImei ? { imeis: [] } : {}),
  })

  // Equipos controlados por IMEI: se agregan las unidades elegidas a la línea de esa variante
  function agregarImeis(producto, variante, imeis) {
    const existe = carrito.some((i) => i.varianteId === variante.id)
    const base = existe ? carrito : [...carrito, lineaNueva(producto, variante)]
    setCarrito(
      base.map((i) => {
        if (i.varianteId !== variante.id) return i
        const lista = [...(i.imeis || []), ...imeis.filter((m) => !(i.imeis || []).includes(m))]
        return { ...i, imeis: lista, cantidad: lista.length }
      }),
    )
  }

  function agregar({ producto, variante }, imeiExacto) {
    if (producto.porImei) {
      if (imeiExacto) return agregarImeis(producto, variante, [imeiExacto])
      return setElegir({ producto, variante })
    }
    const enCarrito = carrito.find((i) => i.varianteId === variante.id)
    if ((enCarrito?.cantidad || 0) >= variante.stock) return alert('No hay más unidades en stock de esta variante.')
    if (enCarrito) {
      setCarrito(carrito.map((i) => (i.varianteId === variante.id ? { ...i, cantidad: i.cantidad + 1 } : i)))
    } else {
      setCarrito([...carrito, { ...lineaNueva(producto, variante), cantidad: 1 }])
    }
  }

  function cambiarCantidad(id, delta) {
    const linea = carrito.find((i) => i.varianteId === id)
    // equipos con IMEI: "+" abre la lista para elegir otro; "−" quita el último
    if (linea?.imeis) {
      if (delta > 0) {
        const fila = filas.find((f) => f.variante.id === id)
        if (fila) setElegir({ producto: fila.producto, variante: fila.variante })
        return
      }
      const lista = linea.imeis.slice(0, -1)
      return setCarrito(carrito.flatMap((i) => (i.varianteId !== id ? [i] : lista.length ? [{ ...i, imeis: lista, cantidad: lista.length }] : [])))
    }
    setCarrito(
      carrito.flatMap((i) => {
        if (i.varianteId !== id) return [i]
        const c = i.cantidad + delta
        if (c <= 0) return []
        if (c > i.max) return [i]
        return [{ ...i, cantidad: c }]
      }),
    )
  }

  function quitarImei(id, imei) {
    setCarrito(
      carrito.flatMap((i) => {
        if (i.varianteId !== id) return [i]
        const lista = i.imeis.filter((m) => m !== imei)
        return lista.length ? [{ ...i, imeis: lista, cantidad: lista.length }] : []
      }),
    )
  }

  // Un código leído (con la pistola o escrito): puede ser un IMEI / serial o un código de barras exacto
  function procesarCodigo(texto) {
    const c = texto.trim().toLowerCase()
    if (!c) return false
    const porImei = filas.find((f) => (f.variante.imeis || []).some((m) => m.toLowerCase() === c))
    if (porImei) {
      const imei = porImei.variante.imeis.find((m) => m.toLowerCase() === c)
      if (imeisEnCarrito(porImei.variante.id).includes(imei)) {
        avisar('Ese equipo ya está en la venta', true)
        return false
      }
      agregar(porImei, imei)
      avisar(`${porImei.producto.nombre} ${porImei.variante.talla} · IMEI ${imei.slice(-6)}`)
      return true
    }
    const exacto = filas.find((f) => f.variante.codigo && f.variante.codigo.toLowerCase() === c)
    if (exacto) {
      if (exacto.variante.stock === 0) {
        avisar(`${exacto.producto.nombre}: agotado`, true)
        return false
      }
      agregar(exacto)
      avisar(`${exacto.producto.nombre} ${[exacto.variante.talla, exacto.variante.color].filter(Boolean).join(' ')}`)
      return true
    }
    avisar(`Código no encontrado: ${texto.trim()}`, true)
    return false
  }

  // Enter en la búsqueda: el lector escribe el código aquí cuando el cursor está en este campo
  function alTeclear(e) {
    if (e.key !== 'Enter' || !q) return
    if (procesarCodigo(buscar)) {
      pitar(true)
      return setBuscar('')
    }
    const unica = resultados.length === 1 ? resultados[0] : null
    if (unica && unica.variante.stock > 0) {
      agregar(unica)
      setBuscar('')
    } else pitar(false)
  }

  // La pistola funciona desde cualquier parte de la Caja, aunque el cursor no esté en la búsqueda
  useLector(procesarCodigo, !cobrando && !recibo && !elegir)

  function confirmarVenta(pagos, cambio, clienteVenta, credito) {
    if (clienteVenta?.nuevo) {
      guardarCliente({
        id: clienteVenta.id,
        nombre: clienteVenta.nombre,
        telefono: clienteVenta.telefono,
        cedula: clienteVenta.cedula || '',
        autorizacion: clienteVenta.autorizacion,
      })
    } else if (credito && clienteVenta) {
      // si al hacer el crédito se escribió la cédula de un cliente que no la tenía, se guarda en su ficha
      const existente = clientes.find((c) => c.id === clienteVenta.id)
      if (existente && existente.cedula !== clienteVenta.cedula) guardarCliente({ ...existente, cedula: clienteVenta.cedula })
    }
    const plan = credito ? armarCuotas(credito.financiado, credito.plazo, credito.tasa, credito.primeraFecha) : null
    const venta = registrarVenta({
      items: carrito.map(({ max, ...resto }) => resto),
      subtotal,
      descuento: descuentoTotal,
      descuentoPromo: descPromo,
      total,
      pagos,
      cambio,
      puntosUsados,
      puntosGanados: clienteVenta ? Math.floor((total / 1000) * config.puntosPorMil) : 0,
      ...(clienteVenta ? { clienteId: clienteVenta.id, clienteNombre: clienteVenta.nombre } : {}),
      ...(plan
        ? { credito: { plazo: credito.plazo, tasa: credito.tasa, cuotaValor: plan.cuotaValor, totalCredito: plan.totalCredito, cuotaInicial: credito.cuotaInicial, primeraFecha: credito.primeraFecha } }
        : {}),
      vendedorId: usuario?.id,
      vendedorNombre: usuario?.nombre,
    })
    if (plan) {
      registrarCredito(venta, {
        clienteId: clienteVenta.id,
        clienteNombre: clienteVenta.nombre,
        clienteCedula: clienteVenta.cedula || '',
        clienteTelefono: clienteVenta.telefono || '',
        financiado: credito.financiado,
        cuotaInicial: credito.cuotaInicial,
        plazo: credito.plazo,
        tasa: credito.tasa,
        ...plan,
      })
    }
    setCarrito([])
    setDescuento('')
    setUsarPuntos('')
    setClienteId('')
    setCobrando(false)
    setRecibo(venta)
  }

  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Mostrador</p>
          <h1 className="titulo">Caja</h1>
          <p className="subtitulo">Escanea con la pistola o busca el producto. F2 busca · F9 cobra.</p>
        </div>
        {aviso && <div className={'aviso-lector' + (aviso.error ? ' error' : '')}>{aviso.texto}</div>}
      </div>

      <BarraCaja onCerrar={() => setCierre(true)} />

      <div className="caja">
        <div className="panel">
          <label className="buscar" style={{ marginBottom: 14 }}>
            <Icono nombre="buscar" tam={18} />
            <input
              ref={entrada}
              autoFocus
              placeholder="Escanea el código o busca por nombre"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={alTeclear}
            />
          </label>

          {resultados.length === 0 ? (
            <div className="vacio">
              {productos.length === 0 ? 'No hay productos. Créalos primero en Inventario.' : 'Nada coincide con tu búsqueda.'}
            </div>
          ) : (
            <div className="resultados">
              {resultados.map((f) => (
                <button key={f.variante.id} className="prod-card" disabled={f.variante.stock === 0} onClick={() => agregar(f)}>
                  <strong>{f.producto.nombre}</strong>
                  <span className="gris">{[f.variante.talla, f.variante.color].filter(Boolean).join(' ') || 'Única'}</span>
                  <b>{dinero(f.producto.precio)}</b>
                  <small className={f.variante.stock <= f.variante.minimo ? 'bajo-txt' : 'gris'}>
                    {f.variante.stock === 0 ? 'Agotado' : `Stock: ${f.variante.stock}`}
                    {f.producto.condicion && f.producto.condicion !== 'Nuevo' ? ` · ${f.producto.condicion}` : ''}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel carrito-panel">
          <div className="panel-cabeza">
            <h2>Venta actual</h2>
            {carrito.length > 0 && (
              <button className="enlace peligro" onClick={() => setCarrito([])}>
                Vaciar
              </button>
            )}
          </div>

          <label className="cliente-caja">
            <span>Cliente (opcional)</span>
            <select
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value)
                setUsarPuntos('')
              }}
            >
              <option value="">Venta al público</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          {carrito.length === 0 ? (
            <div className="vacio">Agrega unidades para empezar.</div>
          ) : (
            <div className="carrito">
              {lineas.map((i) => (
                <div className="carrito-fila" key={i.varianteId}>
                  <div>
                    <strong>{i.nombre}</strong>
                    <small className="gris">
                      {i.detalle} · {dinero(i.precio)}
                    </small>
                    {(i.imeis || []).map((m) => (
                      <small className="imei-txt" key={m}>
                        IMEI {m}{' '}
                        <button className="chip-x" onClick={() => quitarImei(i.varianteId, m)} aria-label={`Quitar ${m}`}>
                          ✕
                        </button>
                      </small>
                    ))}
                    {i.garantiaDias > 0 && <small className="garantia-txt">Garantía {i.garantiaDias} días</small>}
                    {i.promo.valor > 0 && (
                      <small className="promo-txt">
                        {i.promo.nombre}: − {dinero(i.promo.valor)}
                      </small>
                    )}
                  </div>
                  <div className="cantidad">
                    <button onClick={() => cambiarCantidad(i.varianteId, -1)}>−</button>
                    <span>{i.cantidad}</span>
                    <button onClick={() => cambiarCantidad(i.varianteId, 1)}>+</button>
                  </div>
                  <strong>{dinero(i.precio * i.cantidad)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="descuento">
            <span>Descuento</span>
            <input type="number" min="0" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="0" />
            <select value={tipoDesc} onChange={(e) => setTipoDesc(e.target.value)}>
              <option value="%">%</option>
              <option value="$">$</option>
            </select>
          </div>

          {cliente && puntosDisponibles > 0 && (
            <div className="descuento">
              <span>Usar puntos ({puntosDisponibles})</span>
              <input type="number" min="0" value={usarPuntos} onChange={(e) => setUsarPuntos(e.target.value)} placeholder="0" />
              <span className="gris">= {dinero(puntosUsados * config.valorPunto)}</span>
            </div>
          )}

          <div className="lineas">
            <div>
              Subtotal <strong>{dinero(subtotal)}</strong>
            </div>
            {descPromo > 0 && (
              <div>
                Promociones <strong>− {dinero(descPromo)}</strong>
              </div>
            )}
            {descManual > 0 && (
              <div>
                Descuento <strong>− {dinero(descManual)}</strong>
              </div>
            )}
            {descPuntos > 0 && (
              <div>
                Puntos <strong>− {dinero(descPuntos)}</strong>
              </div>
            )}
          </div>
          <div className="resultado-neto">
            <div>
              <small>Total</small>
              <strong>{dinero(total)}</strong>
            </div>
          </div>
          <button className="btn oscuro btn-cobrar" disabled={carrito.length === 0} onClick={() => setCobrando(true)}>
            Cobrar (F9)
          </button>
        </div>
      </div>

      {cierre && <CierreCaja onTerminar={() => setCierre(false)} />}
      {elegir && (
        <ElegirImei
          titulo={`${elegir.producto.nombre} ${[elegir.variante.talla, elegir.variante.color].filter(Boolean).join(' ')}`}
          disponibles={disponiblesDe(elegir.variante)}
          onAgregar={(imeis) => {
            agregarImeis(elegir.producto, elegir.variante, imeis)
            setElegir(null)
          }}
          onCerrar={() => setElegir(null)}
        />
      )}
      {cobrando && <Cobro total={total} clienteInicial={cliente} onCancelar={() => setCobrando(false)} onConfirmar={confirmarVenta} />}
      {recibo && (
        <Recibo
          venta={recibo}
          onCerrar={() => {
            setRecibo(null)
            setTimeout(() => entrada.current?.focus(), 0)
          }}
        />
      )}
    </>
  )
}
