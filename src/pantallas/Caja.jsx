import { useEffect, useMemo, useRef, useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import Cobro from '../componentes/Cobro.jsx'
import Recibo from '../componentes/Recibo.jsx'
import ElegirImei from '../componentes/ElegirImei.jsx'
import BarraCaja from '../componentes/BarraCaja.jsx'
import CierreCaja from '../componentes/CierreCaja.jsx'
import CajaTurno from '../componentes/CajaTurno.jsx'
import AbrirCajaModal from '../componentes/AbrirCajaModal.jsx'
import SacarCupo from '../componentes/SacarCupo.jsx'
import PagarSueldo from '../componentes/PagarSueldo.jsx'
import HistorialCierres from '../componentes/HistorialCierres.jsx'
import BuscadorProductos from '../componentes/BuscadorProductos.jsx'
import { activarSonido, pitar, useLector } from '../lector.js'
import { listarCategorias } from '../categorias.js'
import { useProductos, useClientes, useVentas, usePromos, useConfig, useTurnos, registrarVenta, registrarCredito, guardarCliente, registrarAccion } from '../almacen.js'
import { useUsuario, descuentoMaximo, verificarPinAdmin } from '../auth.js'
import { armarCuotas, cajaDe, dinero, etiquetaNumero, fechaHora, mejorPromo, puntosCliente, siguienteNumero } from '../utils.js'
import { useCajaActual } from '../equipo.js'

const limitar = (n, min, max) => Math.min(max, Math.max(min, n))
const esCampo = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')

export default function Caja() {
  const productos = useProductos()
  const clientes = useClientes()
  const ventas = useVentas()
  const promos = usePromos()
  const config = useConfig()
  const usuario = useUsuario()
  const miCaja = useCajaActual()
  const turnos = useTurnos()
  const [noAbrir, setNoAbrir] = useState(false)
  const cajaCerrada = !turnos.some((t) => !t.fechaCierre && cajaDe(t) === miCaja)

  const [buscar, setBuscar] = useState('')
  const [sug, setSug] = useState(-1) // sugerencia resaltada con las flechas
  const [carrito, setCarrito] = useState([])
  const [seleccion, setSeleccion] = useState(null) // varianteId de la fila marcada
  const [clienteId, setClienteId] = useState('')
  const [descuento, setDescuento] = useState('')
  const [tipoDesc, setTipoDesc] = useState('%')
  const [usarPuntos, setUsarPuntos] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [recibo, setRecibo] = useState(null)
  const [elegir, setElegir] = useState(null) // { producto, variante }: ventana para elegir IMEI
  const [catalogo, setCatalogo] = useState(false)
  const [aviso, setAviso] = useState(null) // { texto, error }: lo último que leyó la pistola
  const [cierre, setCierre] = useState(false)
  const [cupoAbierto, setCupoAbierto] = useState(false)
  const [sueldoAbierto, setSueldoAbierto] = useState(false)
  const [descOk, setDescOk] = useState(0) // descuento autorizado con el PIN del administrador
  const [vista, setVista] = useState('vender') // 'vender' o 'caja' (la caja del día completa)
  const entrada = useRef(null)
  const temporizadorAviso = useRef(null)
  const tiempos = useRef([]) // momentos en que se escribió cada carácter en el buscador: así se sabe si fue la pistola o una persona

  // el pitido solo suena con la pistola, y se puede apagar en Configuración
  useEffect(() => {
    activarSonido(config.sonidoLector !== false)
  }, [config.sonidoLector])

  // la pistola escribe el código entero en una ráfaga; una persona teclea mucho más lento
  function vinoDeLaPistola() {
    const t = tiempos.current
    if (t.length < 4) return false
    return (t[t.length - 1] - t[0]) / (t.length - 1) < 50
  }

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
  const categorias = listarCategorias(productos, config.categorias).filter((c) => c.productos > 0)
  // sugerencias mientras se escribe
  const sugerencias = q
    ? filas
        .filter(
          ({ producto, variante }) =>
            producto.nombre.toLowerCase().includes(q) ||
            producto.categoria.toLowerCase().includes(q) ||
            variante.codigo.toLowerCase().includes(q) ||
            (variante.imeis || []).some((m) => m.toLowerCase().includes(q)),
        )
        .slice(0, 8)
    : []

  const cliente = clientes.find((c) => c.id === clienteId) || null
  const puntosDisponibles = cliente ? puntosCliente(cliente.id, ventas) : 0
  const etiquetaTicket = etiquetaNumero(siguienteNumero(ventas, miCaja), miCaja)

  // Promociones automáticas, descuento manual y puntos
  const lineas = carrito.map((i) => ({ ...i, promo: mejorPromo(i, promos) }))
  const articulos = carrito.reduce((s, i) => s + i.cantidad, 0)
  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const descPromo = lineas.reduce((s, l) => s + l.promo.valor, 0)
  const base = subtotal - descPromo
  const d = Number(descuento) || 0
  const descManual = limitar(Math.round(tipoDesc === '%' ? (base * d) / 100 : d), 0, base)
  const limiteDesc = Math.round((base * descuentoMaximo(usuario)) / 100)
  const exigePin = descManual > limiteDesc && descManual > descOk
  async function autorizarDescuento() {
    const pin = prompt('Este descuento pasa el límite de ' + descuentoMaximo(usuario) + '%. Pide al administrador que escriba su PIN:')
    if (!pin) return
    if (await verificarPinAdmin(pin)) {
      setDescOk(descManual)
      setCobrando(false)
      registrarAccion('Descuento autorizado con PIN de administrador', '$' + descManual + ' en un ticket de $' + base)
    } else alert('PIN incorrecto.')
  }
  const maxPuntos = config.valorPunto > 0 ? Math.floor((base - descManual) / config.valorPunto) : 0
  const puntosUsados = limitar(Math.floor(Number(usarPuntos) || 0), 0, Math.min(puntosDisponibles, maxPuntos))
  const descPuntos = puntosUsados * config.valorPunto
  const total = base - descManual - descPuntos
  const descuentoTotal = descPromo + descManual + descPuntos

  // Atajos: F2 busca, F3 catálogo, F9 cobra, Supr quita el artículo marcado, Esc limpia la búsqueda
  useEffect(() => {
    function tecla(e) {
      if (vista !== 'vender') return
      if (e.key === 'F2') {
        e.preventDefault()
        entrada.current?.focus()
      }
      // Ctrl + (más): un trabajador saca algo contra su cupo
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') && !cobrando && !recibo) {
        e.preventDefault()
        setCupoAbierto(true)
      }
      // Ctrl M: pagar sueldo (solo el administrador)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm' && usuario?.rol === 'admin' && !cobrando && !recibo) {
        e.preventDefault()
        setSueldoAbierto(true)
      }
      if (e.key === 'F3' && !cobrando && !recibo) {
        e.preventDefault()
        setCatalogo(true)
      }
      if (e.key === 'F9' && carrito.length && !recibo) {
        e.preventDefault()
        setCobrando(true)
      }
      if (e.key === 'Delete' && !esCampo(e.target) && seleccion && !cobrando && !recibo && !catalogo && !elegir) {
        e.preventDefault()
        quitarLinea(seleccion)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const imeisEnCarrito = (varianteId) => carrito.find((i) => i.varianteId === varianteId)?.imeis || []
  const disponiblesDe = (variante) => (variante.imeis || []).filter((m) => !imeisEnCarrito(variante.id).includes(m))

  // Línea nueva del carrito para un producto/variante
  const lineaNueva = (producto, variante) => ({
    productoId: producto.id,
    varianteId: variante.id,
    codigo: variante.codigo || '',
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
    setSeleccion(variante.id)
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
    setSeleccion(variante.id)
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

  function quitarLinea(id) {
    setCarrito((c) => c.filter((i) => i.varianteId !== id))
    setSeleccion(null)
  }

  function cancelarVenta() {
    if (carrito.length === 0) return
    if (!confirm('¿Cancelar esta venta? Se vacía la lista.')) return
    setCarrito([])
    setDescuento('')
    setUsarPuntos('')
    setClienteId('')
    setSeleccion(null)
    entrada.current?.focus()
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

  // Teclas en la búsqueda: flechas para elegir una sugerencia, Enter para agregar, Esc para limpiar
  function alTeclear(e) {
    if (e.key === 'ArrowDown' && sugerencias.length) {
      e.preventDefault()
      return setSug((s) => Math.min(sugerencias.length - 1, s + 1))
    }
    if (e.key === 'ArrowUp' && sugerencias.length) {
      e.preventDefault()
      return setSug((s) => Math.max(-1, s - 1))
    }
    if (e.key === 'Escape') {
      setBuscar('')
      return setSug(-1)
    }
    if (e.key !== 'Enter' || !q) return
    const pistola = vinoDeLaPistola()
    tiempos.current = []
    // una sugerencia marcada con las flechas
    if (sug >= 0 && sugerencias[sug]) {
      const f = sugerencias[sug]
      if (f.variante.stock === 0) return pistola && pitar(false)
      agregar(f)
      setBuscar('')
      return setSug(-1)
    }
    // un código leído por la pistola o escrito completo
    if (procesarCodigo(buscar)) {
      if (pistola) pitar(true)
      setBuscar('')
      return setSug(-1)
    }
    // si solo hay una coincidencia, se agrega
    const unica = sugerencias.length === 1 ? sugerencias[0] : null
    if (unica && unica.variante.stock > 0) {
      agregar(unica)
      setBuscar('')
    } else if (pistola) pitar(false)
  }

  // La pistola funciona desde cualquier parte de la Caja, aunque el cursor no esté en la búsqueda
  useLector(procesarCodigo, !cobrando && !recibo && !elegir && !catalogo && !cupoAbierto && !sueldoAbierto && vista === 'vender')

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
    setSeleccion(null)
    setCobrando(false)
    setRecibo(venta)
  }

  return (
    <div className="caja-pantalla">
      {cajaCerrada && !noAbrir && vista === 'vender' && !recibo && <AbrirCajaModal onCerrar={() => setNoAbrir(true)} />}
      {aviso && <div className={'aviso-lector' + (aviso.error ? ' error' : '')}>{aviso.texto}</div>}

      <div className="caja-top">
        <div className="segmentos">
          <button className={vista === 'vender' ? 'activo' : ''} onClick={() => setVista('vender')}>
            Vender
          </button>
          <button className={vista === 'caja' ? 'activo' : ''} onClick={() => setVista('caja')}>
            Caja del día
          </button>
        </div>
        {vista === 'vender' && <BarraCaja onCerrar={() => setCierre(true)} />}
      </div>

      {vista === 'caja' && (
        <div className="caja-scroll">
          <CajaTurno />
          {usuario?.rol === 'admin' && <HistorialCierres />}
        </div>
      )}

      {vista === 'vender' && (
        <div className="ticket-pos">
          <div className="ticket-busca">
            <div className="ticket-num">Ticket {etiquetaTicket}</div>
            <div className="busca-caja">
              <label className="buscar">
                <Icono nombre="buscar" tam={18} />
                <input
                  ref={entrada}
                  autoFocus
                  placeholder="Código de barras, IMEI o nombre del producto (F2)"
                  value={buscar}
                  onChange={(e) => {
                    tiempos.current = e.target.value ? [...tiempos.current.slice(-40), performance.now()] : []
                    setBuscar(e.target.value)
                    setSug(-1)
                  }}
                  onKeyDown={alTeclear}
                />
              </label>
              {sugerencias.length > 0 && (
                <div className="sugerencias">
                  {sugerencias.map((f, n) => (
                    <button
                      key={f.variante.id}
                      className={'sug-item' + (n === sug ? ' activo' : '')}
                      disabled={f.variante.stock === 0}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        agregar(f)
                        setBuscar('')
                        setSug(-1)
                        entrada.current?.focus()
                      }}
                    >
                      <span>
                        <strong>{f.producto.nombre}</strong>{' '}
                        <small className="gris">{[f.variante.talla, f.variante.color].filter(Boolean).join(' ')}</small>
                      </span>
                      <span>
                        <b>{dinero(f.producto.precio)}</b>{' '}
                        <small className={f.variante.stock <= f.variante.minimo ? 'bajo-txt' : 'gris'}>
                          {f.variante.stock === 0 ? 'Agotado' : `Stock ${f.variante.stock}`}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn" onClick={() => setCatalogo(true)}>
              Catálogo (F3)
            </button>
            <button className="btn" onClick={() => setCupoAbierto(true)}>
              Cupo (Ctrl +)
            </button>
            {usuario?.rol === 'admin' && (
              <button className="btn" onClick={() => setSueldoAbierto(true)}>
                Pagar sueldo (Ctrl M)
              </button>
            )}
            <label className="cliente-caja en-linea">
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value)
                  setUsarPuntos('')
                }}
                aria-label="Cliente"
              >
                <option value="">Cliente: venta al público</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ticket-tabla">
            <table className="tabla-venta">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 130 }}>Código</th>
                  <th>Descripción del producto</th>
                  <th style={{ width: 120 }}>Precio</th>
                  <th style={{ width: 130 }}>Cantidad</th>
                  <th style={{ width: 110 }}>Desc.</th>
                  <th style={{ width: 130 }}>Importe</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {lineas.map((i, n) => (
                  <tr key={i.varianteId} className={seleccion === i.varianteId ? 'sel' : ''} onClick={() => setSeleccion(i.varianteId)}>
                    <td>{n + 1}</td>
                    <td className="gris">{i.codigo || '—'}</td>
                    <td>
                      <strong>{i.nombre}</strong>
                      {i.detalle && <small className="gris"> {i.detalle}</small>}
                      {(i.imeis || []).map((m) => (
                        <small className="imei-txt" key={m}>
                          IMEI {m}{' '}
                          <button className="chip-x" onClick={(e) => { e.stopPropagation(); quitarImei(i.varianteId, m) }} aria-label={`Quitar ${m}`}>
                            ✕
                          </button>
                        </small>
                      ))}
                      {i.garantiaDias > 0 && <small className="garantia-txt">Garantía {i.garantiaDias} días</small>}
                      {i.promo.valor > 0 && <small className="promo-txt">{i.promo.nombre}</small>}
                    </td>
                    <td>{dinero(i.precio)}</td>
                    <td>
                      <div className="cantidad">
                        <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(i.varianteId, -1) }}>−</button>
                        <span>{i.cantidad}</span>
                        <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(i.varianteId, 1) }}>+</button>
                      </div>
                    </td>
                    <td>{i.promo.valor > 0 ? <span className="promo-txt">− {dinero(i.promo.valor)}</span> : '—'}</td>
                    <td>
                      <strong>{dinero(i.precio * i.cantidad - i.promo.valor)}</strong>
                    </td>
                    <td>
                      <button className="boton-icono" onClick={(e) => { e.stopPropagation(); quitarLinea(i.varianteId) }} aria-label="Quitar artículo">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {carrito.length === 0 && (
              <div className="vacio">
                {productos.length === 0
                  ? 'No hay productos. Créalos primero en Inventario.'
                  : 'Escanea un código, escribe el nombre o abre el catálogo para agregar el primer producto.'}
              </div>
            )}
          </div>

          <div className="ticket-pie">
            <div className="pie-izq">
              <div className="descuento">
                <span>Descuento</span>
                <input type="number" min="0" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="0" />
                <select value={tipoDesc} onChange={(e) => setTipoDesc(e.target.value)}>
                  <option value="%">%</option>
                  <option value="$">$</option>
                </select>
              </div>
              {exigePin && (
                <div className="aviso-legal" style={{ margin: '6px 0' }}>
                  Descuento sobre el límite ({descuentoMaximo(usuario)}%).{' '}
                  <button className="enlace" onClick={autorizarDescuento}>
                    Autorizar con PIN del administrador
                  </button>
                </div>
              )}
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
              <small className="gris">F3 catálogo · F9 cobrar · Supr quita el artículo marcado</small>
              <div className="acciones-venta">
                <button className="btn" disabled={!seleccion} onClick={() => seleccion && quitarLinea(seleccion)}>
                  Quitar artículo (Supr)
                </button>
                <button className="btn" disabled={carrito.length === 0} onClick={cancelarVenta}>
                  Cancelar venta
                </button>
              </div>
            </div>

            <div className="pie-der">
              <div className="total-gigante">
                <small>
                  {articulos} {articulos === 1 ? 'artículo' : 'artículos'} · TOTAL
                </small>
                <strong>{dinero(total)}</strong>
              </div>
              <button className="btn oscuro btn-cobrar" disabled={carrito.length === 0} onClick={() => setCobrando(true)}>
                Cobrar (F9)
              </button>
            </div>
          </div>
        </div>
      )}

      {cierre && <CierreCaja onTerminar={() => setCierre(false)} />}
      {catalogo && <BuscadorProductos filas={filas} categorias={categorias} onElegir={agregar} onCerrar={() => setCatalogo(false)} />}
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
      {cupoAbierto && <SacarCupo onCerrar={() => setCupoAbierto(false)} />}
      {sueldoAbierto && <PagarSueldo onCerrar={() => setSueldoAbierto(false)} />}
      {cobrando && !exigePin && <Cobro total={total} ticket={etiquetaTicket} articulos={articulos} clienteInicial={cliente} onCancelar={() => setCobrando(false)} onConfirmar={confirmarVenta} />}
      {recibo && (
        <Recibo
          venta={recibo}
          onCerrar={() => {
            setRecibo(null)
            setTimeout(() => entrada.current?.focus(), 0)
          }}
        />
      )}
    </div>
  )
}
