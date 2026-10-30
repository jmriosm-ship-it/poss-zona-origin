import { useEffect, useState } from 'react'
import Icono from './componentes/Iconos.jsx'
import Acceso from './componentes/Acceso.jsx'
import MenuModulos from './componentes/MenuModulos.jsx'
import Inicio from './pantallas/Inicio.jsx'
import Resumen from './pantallas/Resumen.jsx'
import Caja from './pantallas/Caja.jsx'
import Inventario from './pantallas/Inventario.jsx'
import Ventas from './pantallas/Ventas.jsx'
import Movimientos from './pantallas/Movimientos.jsx'
import Compras from './pantallas/Compras.jsx'
import Deudas from './pantallas/Deudas.jsx'
import Clientes from './pantallas/Clientes.jsx'
import Ganancias from './pantallas/Ganancias.jsx'
import Trabajadores from './pantallas/Trabajadores.jsx'
import Facturas from './pantallas/Facturas.jsx'
import Configuracion from './pantallas/Configuracion.jsx'
import AccesoNube from './componentes/AccesoNube.jsx'
import AceptarLegal from './componentes/AceptarLegal.jsx'
import { VERSION_LEGAL } from './legal.js'
import { abrirVisor } from './visor.js'
import { useConfig } from './almacen.js'
import { useCajaActual } from './equipo.js'
import { useUsuario, cerrarSesion, nombreRol, puede } from './auth.js'
import { nubeConfigurada, supabase, useSesionNube } from './nube.js'
import { useNube, olvidarEstadoNube } from './useNube.js'
import { iniciarCopiaAutomatica } from './copias.js'
import pkg from '../package.json'

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
  { id: 'inicio', texto: 'Inicio' },
  { id: 'caja', texto: 'Caja' },
  { id: 'resumen', texto: 'Resumen' },
  { id: 'inventario', texto: 'Inventario' },
  { id: 'ventas', texto: 'Ventas' },
  { id: 'movimientos', texto: 'Movimientos' },
  { id: 'compras', texto: 'Compras' },
  { id: 'deudas', texto: 'Deudas' },
  { id: 'clientes', texto: 'Clientes' },
  { id: 'ganancias', texto: 'Ganancias' },
  { id: 'trabajadores', texto: 'Trabajadores' },
  { id: 'facturas', texto: 'Facturas' },
]

const PANTALLAS = {
  inicio: Inicio,
  resumen: Resumen,
  caja: Caja,
  inventario: Inventario,
  ventas: Ventas,
  movimientos: Movimientos,
  compras: Compras,
  deudas: Deudas,
  clientes: Clientes,
  ganancias: Ganancias,
  trabajadores: Trabajadores,
  facturas: Facturas,
  configuracion: Configuracion,
}

const TITULOS = { ...Object.fromEntries(MENU.map((m) => [m.id, m.texto])), configuracion: 'Configuración' }

export default function App() {
  const usuario = useUsuario()
  const config = useConfig()
  const cajaActual = useCajaActual()
  const [pantalla, setPantalla] = useState('inicio')
  useEffect(() => iniciarCopiaAutomatica(), [])
  const [categoriaCaja, setCategoriaCaja] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  // al entrar, el trabajador cae directo en la Caja y el administrador en el Inicio
  useEffect(() => {
    if (usuario) setPantalla(usuario.rol === 'admin' ? 'inicio' : 'caja')
  }, [usuario?.id, usuario?.rol])
  // ir a una pantalla; a la Caja se puede entrar ya filtrada por una categoría
  const irA = (destino, categoria = null) => {
    setPantalla(destino)
    if (destino === 'caja') setCategoriaCaja(categoria)
  }
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
  const actual = puede(usuario, pantalla) ? pantalla : 'inicio'
  const Pantalla = PANTALLAS[actual]
  const tituloActual = actual === 'caja' ? cajaActual : TITULOS[actual]
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className={'app' + (actual === 'inicio' ? '' : ' sin-lateral')}>
      {actual === 'inicio' && (
      <aside className="lateral">
        <div className="lateral-logo" role="button" tabIndex={0} onClick={() => irA('inicio')} onKeyDown={(e) => e.key === 'Enter' && irA('inicio')}>
          <img src="./logo.png" alt={config.negocio} />
          <small>Punto de venta</small>
        </div>

        <div className="lateral-pie">
          <div className="local">
            <small>Local activo</small>
            <strong>{config.negocio} · Principal</strong>
          </div>
          {!admin && (
            <>
              <button className="configuracion" onClick={() => abrirVisor('ayuda')}>
                <Icono nombre="alerta" /> Guía de uso
              </button>
              <button className="configuracion" onClick={() => abrirVisor('legal', 'privacidad')}>
                <Icono nombre="flecha" /> Legal y privacidad
              </button>
            </>
          )}
          {admin && (
            <button className={'configuracion' + (actual === 'configuracion' ? ' activo' : '')} onClick={() => irA('configuracion')}>
              <Icono nombre="ajustes" /> Configuración
            </button>
          )}
          <div className="usuario">
            <span className="avatar">{usuario.nombre.slice(0, 2).toUpperCase()}</span>
            <div>
              {usuario.nombre}
              <small>{nombreRol(usuario.rol)}</small>
            </div>
            <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={cerrarSesion}>
              <Icono nombre="salir" tam={18} />
            </button>
          </div>
        </div>
      </aside>
      )}

      {menuAbierto && (
        <MenuModulos
          usuario={usuario}
          actual={actual}
          nombreCaja={cajaActual}
          irA={irA}
          onCerrar={() => setMenuAbierto(false)}
          onSalir={() => {
            setMenuAbierto(false)
            cerrarSesion()
          }}
        />
      )}

      <div className="principal">
        <header className="barra">
          {actual !== 'inicio' && (
            <button className="hamburguesa" aria-label="Abrir menú" title="Menú" onClick={() => setMenuAbierto(true)}>
              <Icono nombre="menu" tam={22} />
            </button>
          )}
          <span className="migas">
            Administración &nbsp;›&nbsp; <b>{tituloActual}</b>
          </span>
          <div className="barra-der">
            {actual !== 'inicio' && (
              <button className="btn oscuro chico" onClick={() => irA('inicio')}>
                ← Volver al inicio
              </button>
            )}
            {nubeConfigurada && sesionNube && (
              <button className={'nube-estado ' + nube.estado} title={nube.mensaje || 'Sincronizar ahora'} onClick={nube.sincronizarAhora}>
                ☁ {ESTADOS_NUBE[nube.estado]}
              </button>
            )}
            <span className="version-pos" title={"Versión " + pkg.version}>POS {pkg.version.split(".").slice(0, 2).join(".")}</span>
            <span>{hoy}</span>
            <strong>COP $</strong>
          </div>
        </header>

        <main className={'contenido' + (actual === 'caja' ? ' ajustada' : '')}>
          <Pantalla
            irA={irA}
            categoria={categoriaCaja}
            onCategoria={setCategoriaCaja}
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
