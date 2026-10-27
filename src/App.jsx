import { useState } from 'react'
import Icono from './componentes/Iconos.jsx'
import Acceso from './componentes/Acceso.jsx'
import Resumen from './pantallas/Resumen.jsx'
import Caja from './pantallas/Caja.jsx'
import Inventario from './pantallas/Inventario.jsx'
import Ventas from './pantallas/Ventas.jsx'
import Compras from './pantallas/Compras.jsx'
import Deudas from './pantallas/Deudas.jsx'
import Clientes from './pantallas/Clientes.jsx'
import Ganancias from './pantallas/Ganancias.jsx'
import Configuracion from './pantallas/Configuracion.jsx'
import AccesoNube from './componentes/AccesoNube.jsx'
import AceptarLegal from './componentes/AceptarLegal.jsx'
import { VERSION_LEGAL } from './legal.js'
import { abrirVisor } from './visor.js'
import { useClientes, useVentas, useAbonos, useConfig } from './almacen.js'
import { useUsuario, cerrarSesion, puede } from './auth.js'
import { nubeConfigurada, supabase, useSesionNube } from './nube.js'
import { useNube, olvidarEstadoNube } from './useNube.js'
import { saldoCliente } from './utils.js'

const ESTADOS_NUBE = {
  inactivo: 'Sin sincronizar',
  sincronizando: 'Sincronizando…',
  ok: 'Al día ✓',
  sinconexion: 'Sin conexión',
  error: 'Error de nube',
}

const leerSinNube = () => {
  try {
    return localStorage.getItem('zo_sin_nube') === '1'
  } catch {
    return false
  }
}

// Pantalla simple de espera / error mientras se descargan los datos de la nube
function Espera({ titulo, detalle, children }) {
  return (
    <div className="acceso">
      <div className="acceso-caja">
        <img src="./logo.png" alt="Zona Originals" />
        <h2 style={{ marginTop: 18 }}>{titulo}</h2>
        {detalle && <p className="gris">{detalle}</p>}
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>{children}</div>
      </div>
    </div>
  )
}

const MENU = [
  { id: 'caja', texto: 'Caja' },
  { id: 'resumen', texto: 'Resumen' },
  { id: 'inventario', texto: 'Inventario' },
  { id: 'ventas', texto: 'Ventas' },
  { id: 'compras', texto: 'Compras' },
  { id: 'deudas', texto: 'Deudas' },
  { id: 'clientes', texto: 'Clientes' },
  { id: 'ganancias', texto: 'Ganancias' },
]

const PANTALLAS = {
  resumen: Resumen,
  caja: Caja,
  inventario: Inventario,
  ventas: Ventas,
  compras: Compras,
  deudas: Deudas,
  clientes: Clientes,
  ganancias: Ganancias,
  configuracion: Configuracion,
}

const TITULOS = { ...Object.fromEntries(MENU.map((m) => [m.id, m.texto])), configuracion: 'Configuración' }

export default function App() {
  const usuario = useUsuario()
  const config = useConfig()
  const clientes = useClientes()
  const ventas = useVentas()
  const abonos = useAbonos()
  const [pantalla, setPantalla] = useState('caja')
  const [sinNube, setSinNube] = useState(leerSinNube)
  const [sinDescarga, setSinDescarga] = useState(false)
  const sesionNube = useSesionNube()
  const nube = useNube(sesionNube)

  // Primero la cuenta del negocio en la nube (si está configurada) y luego el PIN de cada persona
  if (nubeConfigurada) {
    if (sesionNube === undefined) return <Espera titulo="Abriendo…" />
    if (sesionNube === null && !sinNube) {
      return (
        <AccesoNube
          onSinNube={() => {
            try {
              localStorage.setItem('zo_sin_nube', '1')
            } catch {
              /* ignorar */
            }
            setSinNube(true)
          }}
        />
      )
    }
    // computador nuevo: se esperan los datos de la nube antes de pedir el PIN (así aparecen los usuarios ya creados)
    if (sesionNube && !nube.ultima && !sinDescarga) {
      const fallo = nube.estado === 'error' || nube.estado === 'sinconexion'
      return (
        <Espera
          titulo={fallo ? 'No se pudieron descargar los datos' : 'Descargando tus datos…'}
          detalle={fallo ? nube.mensaje || 'Revisa la conexión a internet.' : 'Solo pasa la primera vez en este computador.'}
        >
          {fallo && (
            <>
              <button className="btn oscuro" onClick={nube.sincronizarAhora}>
                Reintentar
              </button>
              <button className="btn" onClick={() => setSinDescarga(true)}>
                Continuar sin sincronizar
              </button>
            </>
          )}
        </Espera>
      )
    }
  }

  if (!usuario) return <Acceso />

  // términos y política de datos: hay que aceptarlos (y de nuevo si cambian de versión)
  if (config.legalAceptado?.version !== VERSION_LEGAL) return <AceptarLegal usuario={usuario} />

  const admin = usuario.rol === 'admin'
  const menu = MENU.filter((m) => puede(usuario, m.id))
  const actual = puede(usuario, pantalla) ? pantalla : 'caja'
  const Pantalla = PANTALLAS[actual]
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  const deudores = clientes.filter((c) => saldoCliente(c.id, ventas, abonos) > 0).length

  return (
    <div className="app">
      <aside className="lateral">
        <div className="lateral-logo">
          <img src="./logo.png" alt={config.negocio} />
          <small>Punto de venta</small>
        </div>

        <nav className="menu">
          {menu.map((m) => (
            <button key={m.id} className={actual === m.id ? 'activo' : ''} onClick={() => setPantalla(m.id)}>
              <Icono nombre={m.id} />
              {m.texto}
              {m.id === 'deudas' && deudores > 0 && <span className="contador">{deudores}</span>}
            </button>
          ))}
        </nav>

        <div className="lateral-pie">
          <div className="local">
            <small>Local activo</small>
            <strong>{config.negocio} · Principal</strong>
          </div>
          <button className="configuracion" onClick={() => abrirVisor('ayuda')}>
            <Icono nombre="alerta" /> Guía de uso
          </button>
          <button className="configuracion" onClick={() => abrirVisor('legal', 'privacidad')}>
            <Icono nombre="flecha" /> Legal y privacidad
          </button>
          {admin && (
            <button className={'configuracion' + (actual === 'configuracion' ? ' activo' : '')} onClick={() => setPantalla('configuracion')}>
              <Icono nombre="ajustes" /> Configuración
            </button>
          )}
          <div className="usuario">
            <span className="avatar">{usuario.nombre.slice(0, 2).toUpperCase()}</span>
            <div>
              {usuario.nombre}
              <small>{admin ? 'Administrador' : 'Vendedor'}</small>
            </div>
            <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={cerrarSesion}>
              <Icono nombre="salir" tam={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="principal">
        <header className="barra">
          <span className="migas">
            Administración &nbsp;›&nbsp; <b>{TITULOS[actual]}</b>
          </span>
          <div className="barra-der">
            {nubeConfigurada && sesionNube && (
              <button className={'nube-estado ' + nube.estado} title={nube.mensaje || 'Sincronizar ahora'} onClick={nube.sincronizarAhora}>
                ☁ {ESTADOS_NUBE[nube.estado]}
              </button>
            )}
            <span>{hoy}</span>
            <strong>COP $</strong>
          </div>
        </header>

        <main className="contenido">
          <Pantalla
            irA={setPantalla}
            nube={{
              configurada: nubeConfigurada,
              correo: sesionNube?.user?.email,
              estado: nube.estado,
              ultima: nube.ultima,
              mensaje: nube.mensaje,
              onSincronizar: nube.sincronizarAhora,
              onSalir: async () => {
                await supabase.auth.signOut()
                olvidarEstadoNube()
                cerrarSesion()
              },
              onIniciar: () => {
                try {
                  localStorage.removeItem('zo_sin_nube')
                } catch {
                  /* ignorar */
                }
                setSinNube(false)
              },
            }}
          />
        </main>
      </div>
    </div>
  )
}
