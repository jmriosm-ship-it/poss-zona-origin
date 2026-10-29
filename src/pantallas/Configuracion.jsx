import { useEffect, useState } from 'react'
import Icono from '../componentes/Iconos.jsx'
import ConfigPromos from '../componentes/ConfigPromos.jsx'
import ConfigUsuarios from '../componentes/ConfigUsuarios.jsx'
import ConfigRegistro from '../componentes/ConfigRegistro.jsx'
import { useConfig, useProductos, guardarConfig, exportarTodo, importarTodo } from '../almacen.js'
import { claveCategoria, listarCategorias } from '../categorias.js'
import { abrirVisor } from '../visor.js'
import { guardarNombreCaja, useCajaActual } from '../equipo.js'
import { descargar } from '../csv.js'
import { hacerCopia, hayCopias } from '../copias.js'
import { fechaHora } from '../utils.js'

const TABS = [
  ['negocio', 'Negocio'],
  ['puntos', 'Puntos'],
  ['credito', 'Crédito'],
  ['categorias', 'Categorías'],
  ['promos', 'Promociones'],
  ['usuarios', 'Usuarios'],
  ['registro', 'Registro'],
  ['ayuda', 'Ayuda y legal'],
  ['datos', 'Datos y copias'],
]

function Negocio() {
  const config = useConfig()
  const [f, setF] = useState({ ...config })
  const [caja, setCaja] = useState(useCajaActual())
  const [guardado, setGuardado] = useState(false)
  const cambiar = (campo) => (e) => {
    setF({ ...f, [campo]: e.target.value })
    setGuardado(false)
  }

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        guardarNombreCaja(caja)
        guardarConfig({
          negocio: f.negocio.trim() || 'Zona Originals',
          // el nombre de la caja es de este computador, no se comparte
          sonidoLector: f.sonidoLector !== false,
          nit: f.nit.trim(),
          titular: f.titular.trim(),
          identificacion: f.identificacion.trim(),
          correoContacto: f.correoContacto.trim(),
          whatsapp: f.whatsapp.trim(),
          ciudad: f.ciudad.trim(),
          direccion: f.direccion.trim(),
          telefono: f.telefono.trim(),
          mensajeRecibo: f.mensajeRecibo.trim(),
          garantiaTexto: f.garantiaTexto.trim(),
        })
        setGuardado(true)
      }}
    >
      <div className="panel-cabeza">
        <div>
          <h2>Datos del negocio</h2>
          <p className="sub">Salen en el encabezado del recibo</p>
        </div>
      </div>
      <div className="campos">
        <label className="ancho">
          <span>Nombre del negocio</span>
          <input value={f.negocio} onChange={cambiar('negocio')} />
        </label>
        <label>
          <span>NIT / Cédula</span>
          <input value={f.nit} onChange={cambiar('nit')} />
        </label>
        <label>
          <span>Teléfono</span>
          <input value={f.telefono} onChange={cambiar('telefono')} />
        </label>
        <label className="ancho">
          <span>Dirección</span>
          <input value={f.direccion} onChange={cambiar('direccion')} />
        </label>
        <label>
          <span>Nombre de esta caja (solo este computador: Caja 1, Caja 2…)</span>
          <input value={caja} onChange={(e) => { setCaja(e.target.value); setGuardado(false) }} placeholder="Caja 1" />
        </label>
        <label className="ancho casilla">
          <input
            type="checkbox"
            checked={f.sonidoLector !== false}
            onChange={(e) => {
              setF({ ...f, sonidoLector: e.target.checked })
              setGuardado(false)
            }}
          />
          <span>Pitido al leer con la pistola de códigos (solo suena con la pistola, no al escribir)</span>
        </label>
        <label className="ancho">
          <span>Mensaje al pie del recibo</span>
          <input value={f.mensajeRecibo} onChange={cambiar('mensajeRecibo')} />
        </label>
        <label className="ancho">
          <span>Texto de garantía (sale en el recibo de los equipos con garantía)</span>
          <textarea rows="3" value={f.garantiaTexto} onChange={cambiar('garantiaTexto')} />
        </label>
      </div>

      <h3 className="sub-titulo">Datos del titular (para los documentos legales)</h3>
      <div className="campos">
        <label>
          <span>Nombre o razón social del titular</span>
          <input value={f.titular} onChange={cambiar('titular')} placeholder="Quien responde legalmente por el negocio" />
        </label>
        <label>
          <span>NIT o cédula del titular</span>
          <input value={f.identificacion} onChange={cambiar('identificacion')} />
        </label>
        <label>
          <span>Correo de contacto (para reclamos de datos)</span>
          <input type="email" value={f.correoContacto} onChange={cambiar('correoContacto')} />
        </label>
        <label>
          <span>WhatsApp del negocio</span>
          <input value={f.whatsapp} onChange={cambiar('whatsapp')} placeholder="573142757163" />
        </label>
        <label className="ancho">
          <span>Ciudad</span>
          <input value={f.ciudad} onChange={cambiar('ciudad')} />
        </label>
      </div>
      <div className="modal-pie" style={{ alignItems: 'center' }}>
        {guardado && <span style={{ color: 'var(--verde)', fontWeight: 600 }}>Guardado ✓</span>}
        <button className="btn oscuro" type="submit">
          Guardar
        </button>
      </div>
    </form>
  )
}

function Puntos() {
  const config = useConfig()
  const [f, setF] = useState({ puntosPorMil: String(config.puntosPorMil), valorPunto: String(config.valorPunto) })
  const [guardado, setGuardado] = useState(false)
  const ejemplo = Math.floor((100000 / 1000) * (Number(f.puntosPorMil) || 0))

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        guardarConfig({ puntosPorMil: Math.max(0, Number(f.puntosPorMil) || 0), valorPunto: Math.max(0, Number(f.valorPunto) || 0) })
        setGuardado(true)
      }}
    >
      <div className="panel-cabeza">
        <div>
          <h2>Puntos de fidelidad</h2>
          <p className="sub">Los clientes acumulan puntos al comprar y los usan como descuento en la Caja</p>
        </div>
      </div>
      <div className="campos">
        <label>
          <span>Puntos que gana por cada $1.000</span>
          <input type="number" min="0" step="0.1" value={f.puntosPorMil} onChange={(e) => { setF({ ...f, puntosPorMil: e.target.value }); setGuardado(false) }} />
        </label>
        <label>
          <span>Pesos que vale cada punto al usarlo</span>
          <input type="number" min="0" value={f.valorPunto} onChange={(e) => { setF({ ...f, valorPunto: e.target.value }); setGuardado(false) }} />
        </label>
      </div>
      <p className="gris" style={{ marginTop: 12 }}>
        Con esta regla, una compra de $100.000 da {ejemplo} puntos, que valen ${(ejemplo * (Number(f.valorPunto) || 0)).toLocaleString('es-CO')} de descuento.
      </p>
      <div className="modal-pie" style={{ alignItems: 'center' }}>
        {guardado && <span style={{ color: 'var(--verde)', fontWeight: 600 }}>Guardado ✓</span>}
        <button className="btn oscuro" type="submit">
          Guardar
        </button>
      </div>
    </form>
  )
}

function ConfigCredito() {
  const config = useConfig()
  const [f, setF] = useState({
    creditoTasas: config.creditoTasas,
    creditoPlazos: config.creditoPlazos,
    creditoInicialMin: String(config.creditoInicialMin),
    tasaMaximaMensual: String(config.tasaMaximaMensual ?? ''),
  })
  const [guardado, setGuardado] = useState(false)
  const cambiar = (campo) => (e) => {
    setF({ ...f, [campo]: e.target.value })
    setGuardado(false)
  }

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        guardarConfig({
          creditoTasas: f.creditoTasas.trim() || '2',
          creditoPlazos: f.creditoPlazos.trim() || '12',
          creditoInicialMin: Math.min(100, Math.max(0, Number(f.creditoInicialMin) || 0)),
          tasaMaximaMensual: f.tasaMaximaMensual.trim(),
        })
        setGuardado(true)
      }}
    >
      <div className="panel-cabeza">
        <div>
          <h2>Créditos en cuotas</h2>
          <p className="sub">Las mismas condiciones del simulador de la página. Se usan en la Caja al elegir "Crédito (cuotas)".</p>
        </div>
      </div>
      <div className="campos">
        <label>
          <span>Intereses mensuales que ofreces (%), separados por coma</span>
          <input value={f.creditoTasas} onChange={cambiar('creditoTasas')} placeholder="1, 2" />
        </label>
        <label>
          <span>Plazos en meses, separados por coma</span>
          <input value={f.creditoPlazos} onChange={cambiar('creditoPlazos')} placeholder="6, 12, 18, 24, 36" />
        </label>
        <label>
          <span>Cuota inicial mínima (% del valor de la venta)</span>
          <input type="number" min="0" max="100" value={f.creditoInicialMin} onChange={cambiar('creditoInicialMin')} />
        </label>
        <label>
          <span>Tope de interés mensual permitido (%)</span>
          <input value={f.tasaMaximaMensual} onChange={cambiar('tasaMaximaMensual')} placeholder="Ej: 2.2" />
        </label>
      </div>
      <p className="gris" style={{ marginTop: 12 }}>
        En Colombia el interés de un crédito no puede superar la tasa de usura que certifica la Superintendencia Financiera, y esa tasa cambia cada mes. Anota aquí el tope
        mensual vigente y el sistema no dejará hacer créditos por encima. Verifica el valor con tu contador o en la página de la Superfinanciera.
      </p>
      <div className="modal-pie" style={{ alignItems: 'center' }}>
        {guardado && <span style={{ color: 'var(--verde)', fontWeight: 600 }}>Guardado ✓</span>}
        <button className="btn oscuro" type="submit">
          Guardar
        </button>
      </div>
    </form>
  )
}

// Categorías permanentes de la tienda: se crean, se ordenan y se borran aquí
function ConfigCategorias() {
  const config = useConfig()
  const productos = useProductos()
  const lista = config.categorias
  const [nueva, setNueva] = useState('')
  const grupos = listarCategorias(productos, lista)
  const cuantos = (nombre) => grupos.find((g) => g.clave === claveCategoria(nombre))?.productos || 0
  const faltan = grupos.filter((g) => !g.enLista)
  const guardar = (nuevaLista) => guardarConfig({ categorias: nuevaLista })

  function agregar(nombre) {
    const n = nombre.trim()
    if (!n) return
    if (lista.some((c) => claveCategoria(c) === claveCategoria(n))) return alert('Esa categoría ya existe.')
    guardar([...lista, n])
    setNueva('')
  }

  function mover(i, d) {
    const j = i + d
    if (j < 0 || j >= lista.length) return
    const copia = [...lista]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    guardar(copia)
  }

  function borrar(i) {
    if (cuantos(lista[i]) > 0) return alert('Esta categoría tiene productos. Muévelos a otra categoría antes de borrarla.')
    if (confirm(`¿Borrar la categoría "${lista[i]}"?`)) guardar(lista.filter((_, k) => k !== i))
  }

  return (
    <div className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Categorías</h2>
          <p className="sub">Salen siempre en Inicio, Caja e Inventario, en este orden, aunque estén vacías.</p>
        </div>
      </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          agregar(nueva)
        }}
      >
        <input placeholder="Nueva categoría (ej: Tablets)" value={nueva} onChange={(e) => setNueva(e.target.value)} style={{ minWidth: 240 }} />
        <button className="btn oscuro chico" type="submit">
          Agregar categoría
        </button>
      </form>

      <table className="tabla" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Orden</th>
            <th>Categoría</th>
            <th>Productos</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lista.map((c, i) => (
            <tr key={c}>
              <td>{i + 1}</td>
              <td>
                <strong>{c}</strong>
              </td>
              <td>{cuantos(c)}</td>
              <td className="acciones">
                <button className="enlace" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                  ↑ Subir
                </button>
                <button className="enlace" style={{ marginLeft: 10 }} disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar">
                  ↓ Bajar
                </button>
                <button className="enlace peligro" onClick={() => borrar(i)}>
                  Borrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {faltan.length > 0 && (
        <div className="aviso-legal" style={{ marginTop: 14 }}>
          Hay productos en categorías que no están en la lista:{' '}
          {faltan.map((g) => (
            <button key={g.clave} className="enlace" style={{ marginRight: 12 }} onClick={() => agregar(g.nombre)}>
              + Agregar "{g.nombre}" ({g.productos})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Guía de uso y documentos legales
function AyudaLegal() {
  const config = useConfig()
  const aceptado = config.legalAceptado
  const botones = [
    ['Guía de uso', 'Cómo se usa cada parte del sistema', 'ayuda', undefined],
    ['Política de datos personales', 'Privacidad y tratamiento de datos', 'legal', 'privacidad'],
    ['Términos y condiciones', 'Reglas de uso del sistema', 'legal', 'terminos'],
    ['Garantía, cambios y devoluciones', 'Para mostrar a los clientes', 'legal', 'garantia'],
    ['Condiciones del crédito', 'Reglas para vender a crédito', 'legal', 'credito'],
    ['Autorización de clientes', 'Texto para firmar o enviar por WhatsApp', 'legal', 'clientes'],
  ]
  return (
    <div className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Ayuda y legal</h2>
          <p className="sub">
            {aceptado ? `Términos aceptados por ${aceptado.por} el ${new Date(aceptado.fecha).toLocaleDateString('es-CO', { dateStyle: 'medium' })}.` : 'Los términos todavía no se han aceptado.'}
          </p>
        </div>
      </div>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {botones.map(([titulo, sub, tipo, doc]) => (
          <button key={titulo} className="tile" style={{ minHeight: 110 }} onClick={() => abrirVisor(tipo, doc)}>
            <strong style={{ fontSize: 18 }}>{titulo}</strong>
            <span>{sub}</span>
            <i aria-hidden="true">→</i>
          </button>
        ))}
      </div>
    </div>
  )
}

// Copias automáticas guardadas en el disco del computador (solo aplicación de escritorio)
function CopiasAutomaticas() {
  const [info, setInfo] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const cargar = () => window.zoCopias.listar().then(setInfo)
  useEffect(() => {
    if (hayCopias()) cargar()
  }, [])

  if (!hayCopias()) {
    return (
      <p className="gris">
        La copia automática funciona en la aplicación de escritorio (el instalador). Aquí en el navegador solo puedes descargar una copia a mano.
      </p>
    )
  }

  async function ahora() {
    const r = await hacerCopia(true)
    setMensaje(r?.ok ? 'Copia guardada.' : 'No se pudo guardar: ' + (r?.error || 'error'))
    cargar()
  }

  async function restaurar(nombre) {
    if (!confirm('Esto REEMPLAZA todo lo que hay ahora en este computador por la copia del ' + nombre.slice(6, 16) + '. ¿Continuar?')) return
    try {
      importarTodo(JSON.parse(await window.zoCopias.leer(nombre)))
      alert('Copia restaurada.')
    } catch {
      alert('No se pudo leer esa copia.')
    }
  }

  return (
    <>
      <p className="gris" style={{ marginBottom: 10 }}>
        <strong>Copia automática activa:</strong> se guarda sola cada 10 minutos (si hubo cambios) en <code>{info?.carpeta || 'Documentos\\Zona Originals\\Copias'}</code>. Queda una por día de los últimos 30 días.
      </p>
      <div className="cabecera-acciones">
        <button className="btn oscuro" onClick={ahora}>
          Hacer copia ahora
        </button>
        <button className="btn" onClick={() => window.zoCopias.abrirCarpeta()}>
          Abrir carpeta
        </button>
      </div>
      {mensaje && <p className="gris">{mensaje}</p>}
      {info?.copias?.length > 0 && (
        <table className="tabla" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Día</th>
              <th>Guardada</th>
              <th>Tamaño</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {info.copias.slice(0, 10).map((c) => (
              <tr key={c.nombre}>
                <td>{c.nombre.slice(6, 16)}</td>
                <td>{fechaHora(c.fecha)}</td>
                <td>{Math.max(1, Math.round(c.tamano / 1024))} KB</td>
                <td className="acciones">
                  <button className="enlace" onClick={() => restaurar(c.nombre)}>
                    Restaurar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function Datos() {
  function exportar() {
    descargar(`zona-originals-copia-${new Date().toLocaleDateString('en-CA')}.json`, JSON.stringify(exportarTodo()), 'application/json')
  }

  function importar(e) {
    const archivo = e.target.files[0]
    e.target.value = ''
    if (!archivo) return
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const copia = JSON.parse(String(lector.result))
        if (!confirm('Esto REEMPLAZA todo lo que hay ahora en este computador por lo de la copia. ¿Continuar?')) return
        importarTodo(copia)
        alert('Copia restaurada.')
      } catch {
        alert('El archivo no es una copia válida de Zona Originals.')
      }
    }
    lector.readAsText(archivo)
  }

  return (
    <>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-cabeza">
          <div>
            <h2>Copia automática</h2>
            <p className="sub">Para que no se pierda nada si falla el computador</p>
          </div>
        </div>
        <CopiasAutomaticas />
      </div>

      <div className="panel">
        <div className="panel-cabeza">
          <div>
            <h2>Copia de seguridad</h2>
            <p className="sub">Aunque uses la nube, una copia extra en una USB o en tu correo nunca sobra.</p>
          </div>
        </div>
        <div className="cabecera-acciones">
          <button className="btn oscuro" onClick={exportar}>
            <Icono nombre="descargar" tam={18} /> Descargar copia
          </button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <Icono nombre="subir" tam={18} /> Restaurar copia
            <input type="file" accept="application/json,.json" onChange={importar} hidden />
          </label>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-cabeza">
          <div>
            <h2>Próximamente</h2>
            <p className="sub">Estas funciones necesitan servicios externos y se contratan aparte</p>
          </div>
        </div>
        <div className="lineas">
          <div>
            Facturación electrónica DIAN <strong>Requiere un proveedor tecnológico autorizado</strong>
          </div>
          <div>
            Sincronizar con la tienda web <strong>Se conecta aparte, sobre la nube</strong>
          </div>
        </div>
      </div>
    </>
  )
}

const ESTADOS = {
  inactivo: 'Sin sincronizar',
  sincronizando: 'Sincronizando…',
  ok: 'Al día ✓',
  sinconexion: 'Sin conexión (se sube cuando vuelva internet)',
  error: 'Hubo un error',
}

function Nube({ nube }) {
  const caja = useCajaActual()
  return (
    <div className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Cuenta en la nube</h2>
          <p className="sub">Los datos se guardan solos en internet y se comparten entre los computadores de la tienda</p>
        </div>
      </div>
      <p className="gris" style={{ marginBottom: 10 }}>
        Este computador es la <strong>{caja}</strong>. En cada computador inicia sesión con la <strong>misma cuenta</strong> y ponle un nombre distinto a su caja (Negocio → "Nombre de esta caja").
      </p>
      {nube.correo ? (
        <>
          <div className="lineas">
            <div>
              Cuenta <strong>{nube.correo}</strong>
            </div>
            <div>
              Estado <strong>{ESTADOS[nube.estado]}</strong>
            </div>
            {nube.ultima && (
              <div>
                Última sincronización <strong>{new Date(nube.ultima).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</strong>
              </div>
            )}
          </div>
          {nube.estado === 'error' && nube.mensaje && <p className="error">{nube.mensaje}</p>}
          <p className="gris" style={{ margin: '12px 0' }}>
            Funciona sin internet: lo que vendas se sube apenas vuelva la conexión.
          </p>
          <div className="cabecera-acciones">
            <button className="btn oscuro" onClick={nube.onSincronizar}>
              Sincronizar ahora
            </button>
            <button className="btn" onClick={() => confirm('¿Cerrar la sesión de la nube? Los datos de este computador se quedan; solo se deja de sincronizar.') && nube.onSalir()}>
              Cerrar sesión de la nube
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="gris">Este computador está funcionando sin nube: los datos viven solo aquí.</p>
          <button className="btn oscuro" style={{ marginTop: 12 }} onClick={nube.onIniciar}>
            Iniciar sesión en la nube
          </button>
        </>
      )}
    </div>
  )
}

export default function Configuracion({ nube }) {
  const [tab, setTab] = useState('negocio')
  const tabs = nube?.configurada ? TABS.flatMap((t) => (t[0] === 'datos' ? [['nube', 'Nube'], t] : [t])) : TABS
  return (
    <>
      <div className="cabecera">
        <div>
          <p className="kicker">Ajusta el sistema</p>
          <h1 className="titulo">Configuración</h1>
          <p className="subtitulo">Datos del negocio, puntos, promociones, usuarios y copias de seguridad.</p>
        </div>
      </div>
      <div className="segmentos" style={{ marginBottom: 16 }}>
        {tabs.map(([k, t]) => (
          <button key={k} className={tab === k ? 'activo' : ''} onClick={() => setTab(k)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'negocio' && <Negocio />}
      {tab === 'puntos' && <Puntos />}
      {tab === 'credito' && <ConfigCredito />}
      {tab === 'categorias' && <ConfigCategorias />}
      {tab === 'ayuda' && <AyudaLegal />}
      {tab === 'promos' && <ConfigPromos />}
      {tab === 'usuarios' && <ConfigUsuarios />}
      {tab === 'registro' && <ConfigRegistro />}
      {tab === 'nube' && <Nube nube={nube} />}
      {tab === 'datos' && <Datos />}
    </>
  )
}
