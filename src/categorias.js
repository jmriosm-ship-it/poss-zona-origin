// Categorías de la tienda (las mismas de la página web). Son permanentes: siempre salen en Inicio, Caja e Inventario,
// aunque no tengan productos. Se agregan, ordenan y borran en Configuración → Categorías.
export const CATEGORIAS_BASE = ['iPhone', 'MacBook', 'AppleWatch', 'Monastery', 'Perfumes', 'Chevignon', 'AirPods', 'Accesorios']

// "Perfume" y "Perfumes", o "iPhone" y "IPHONE", cuentan como la misma categoría
export const claveCategoria = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '')

// Las categorías de la lista (en su orden) y, después, cualquier otra que tengan los productos.
// Cada una trae sus productos (items) y cuántos productos y unidades tiene.
export function listarCategorias(productos, lista = CATEGORIAS_BASE) {
  const mapa = new Map(lista.map((n) => [claveCategoria(n), { nombre: n, items: [] }]))
  const extras = new Map()
  for (const p of productos) {
    const clave = claveCategoria(p.categoria) || 'sincategoria'
    if (mapa.has(clave)) mapa.get(clave).items.push(p)
    else {
      if (!extras.has(clave)) extras.set(clave, { nombre: p.categoria?.trim() || 'Sin categoría', items: [] })
      extras.get(clave).items.push(p)
    }
  }
  // las que no están en la lista van ordenadas por nombre y "Sin categoría" al final
  const sobrantes = [...extras.entries()].sort(
    ([a, x], [b, y]) => (a === 'sincategoria') - (b === 'sincategoria') || x.nombre.localeCompare(y.nombre, 'es'),
  )
  return [...mapa.entries(), ...sobrantes].map(([clave, c]) => ({
    clave,
    nombre: c.nombre,
    items: c.items,
    productos: c.items.length,
    unidades: c.items.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stock, 0), 0),
    enLista: mapa.has(clave),
  }))
}
