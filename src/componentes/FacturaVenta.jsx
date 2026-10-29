import { useState } from 'react'
import FacturasCliente from './FacturasCliente.jsx'
import { useFacturas } from '../almacen.js'

// Botón para subir o ver la foto de la factura de una venta (con o sin cliente registrado)
export default function FacturaVenta({ venta, compra, className = 'btn' }) {
  const facturas = useFacturas()
  const [abierto, setAbierto] = useState(false)
  const n = facturas.filter((f) => (compra ? f.compraId === compra.id : f.ventaId === venta.id) && !f.eliminada).length
  const cliente = compra ? { id: '', nombre: 'Proveedor: ' + compra.proveedor } : { id: venta.clienteId || '', nombre: venta.clienteNombre || 'Cliente de mostrador' }
  return (
    <>
      <button className={className} onClick={() => setAbierto(true)}>
        {n > 0 ? 'Factura (' + n + ')' : 'Subir factura'}
      </button>
      {abierto && <FacturasCliente cliente={cliente} ventaId={venta?.id} compra={compra} onCerrar={() => setAbierto(false)} />}
    </>
  )
}

export const useNumeroFacturas = (ventaId) => useFacturas().filter((f) => f.ventaId === ventaId && !f.eliminada).length
