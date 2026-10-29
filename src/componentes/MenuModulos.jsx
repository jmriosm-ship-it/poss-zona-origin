import { useEffect } from 'react'
import Icono from './Iconos.jsx'
import { nombreRol, puede } from '../auth.js'
import { abrirVisor } from '../visor.js'

const MODULOS = [
  ['inicio', 'Inicio', 'inicio'],
  ['caja', 'Caja', 'caja'],
  ['inventario', 'Inventario', 'inventario'],
  ['ventas', 'Ventas', 'ventas'],
  ['movimientos', 'Movimientos', 'movimientos'],
  ['compras', 'Compras', 'compras'],
  ['deudas', 'Deudas', 'deudas'],
  ['clientes', 'Clientes', 'clientes'],
  ['resumen', 'Resumen', 'resumen'],
  ['ganancias', 'Ganancias', 'ganancias'],
  ['trabajadores', 'Trabajadores', 'clientes'],
  ['facturas', 'Facturas', 'ventas'],
  ['configuracion', 'Configuración', 'ajustes'],
]

// Menú de las tres rayitas: todas las opciones, para saltar de un módulo a otro sin pasar por el Inicio
export default function MenuModulos({ usuario, actual, nombreCaja, irA, onCerrar, onSalir }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const admin = usuario.rol === 'admin'
  const ir = (id) => {
    irA(id)
    onCerrar()
  }

  return (
    <div className="drawer-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <nav className="drawer" aria-label="Menú">
        <div className="drawer-cab">
          <img src="./logo.png" alt="" />
          <button className="boton-icono" onClick={onCerrar} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        <div className="drawer-lista">
          {MODULOS.filter(([id]) => puede(usuario, id) && (id !== 'configuracion' || admin)).map(([id, texto, icono]) => (
            <button key={id} className={actual === id ? 'activo' : ''} onClick={() => ir(id)}>
              <Icono nombre={icono} />
              {id === 'caja' ? nombreCaja : texto}
            </button>
          ))}
        </div>

        <div className="drawer-sep" />
        <div className="drawer-lista">
          <button
            onClick={() => {
              onCerrar()
              abrirVisor('ayuda')
            }}
          >
            <Icono nombre="alerta" /> Guía de uso
          </button>
          <button
            onClick={() => {
              onCerrar()
              abrirVisor('legal', 'privacidad')
            }}
          >
            <Icono nombre="flecha" /> Legal y privacidad
          </button>
        </div>

        <div className="drawer-pie">
          <span className="avatar">{usuario.nombre.slice(0, 2).toUpperCase()}</span>
          <div>
            {usuario.nombre}
            <small>{nombreRol(usuario.rol)}</small>
          </div>
          <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onSalir}>
            <Icono nombre="salir" tam={18} />
          </button>
        </div>
      </nav>
    </div>
  )
}
