import { nuevoId, normalizarSerial, serialValido } from './utils.js'

// Importar y exportar el inventario en CSV (Excel lo abre y lo guarda sin problema)
export const COLUMNAS = ['nombre', 'categoria', 'marca', 'condicion', 'garantia_dias', 'costo', 'precio', 'capacidad', 'color', 'codigo', 'stock', 'minimo', 'imeis']

const celda = (x) => {
  const t = String(x ?? '')
  return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t
}

// Una fila por cada variante (capacidad/color) de cada producto. Los IMEI van separados por "|".
export function productosACSV(productos) {
  const filas = [COLUMNAS.join(';')]
  for (const p of productos) {
    for (const v of p.variantes) {
      filas.push(
        [p.nombre, p.categoria, p.marca, p.condicion || 'Nuevo', p.garantiaDias || 0, p.costo, p.precio, v.talla, v.color, v.codigo, v.stock, v.minimo, (v.imeis || []).join('|')]
          .map(celda)
          .join(';'),
      )
    }
  }
  return '﻿' + filas.join('\r\n')
}

export const PLANTILLA_CSV =
  '﻿' +
  COLUMNAS.join(';') +
  '\r\n' +
  ['iPhone 15 Pro Max', 'iPhone', 'Apple', 'Nuevo', 365, 4200000, 5200000, '256GB', 'Titanio natural', '', '', 1, '356938035643809|353879234252633'].join(';') +
  '\r\n' +
  ['Perfume Ejemplo', 'Perfume', '', 'Nuevo', 0, 90000, 160000, '100ml', '', '7701234000011', 6, 2, ''].join(';')

function filasCSV(texto, sep) {
  const filas = []
  let fila = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) {
      fila.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo)
      campo = ''
      if (fila.some((x) => x.trim() !== '')) filas.push(fila)
      fila = []
    } else campo += c
  }
  fila.push(campo)
  if (fila.some((x) => x.trim() !== '')) filas.push(fila)
  return filas
}

const normalizar = (t) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

// nombres alternativos que también se entienden en el encabezado
const ALIAS = { talla: 'capacidad', garantia: 'garantia_dias', imei: 'imeis', serial: 'imeis' }

// Mezcla las filas del CSV con el inventario actual. No borra nada: crea lo nuevo y actualiza lo que ya existe.
export function csvAProductos(texto, existentes) {
  const limpio = texto.replace(/^﻿/, '')
  const primera = limpio.split(/\r?\n/)[0] || ''
  const sep = primera.includes(';') ? ';' : ','
  const filas = filasCSV(limpio, sep)
  if (filas.length < 2) throw new Error('El archivo no tiene filas de datos.')

  const cab = filas[0].map((c) => ALIAS[normalizar(c)] || normalizar(c))
  const col = (nombre) => cab.indexOf(nombre)
  if (col('nombre') < 0) throw new Error('Falta la columna "nombre". Descarga la plantilla para ver el formato.')

  const lista = existentes.map((p) => ({ ...p, variantes: p.variantes.map((v) => ({ ...v, imeis: [...(v.imeis || [])] })) }))
  const usados = new Set(lista.flatMap((p) => p.variantes.flatMap((v) => v.imeis)))
  const resumen = { productosNuevos: 0, productosActualizados: 0, variantesNuevas: 0, variantesActualizadas: 0, imeisNuevos: 0, imeisRechazados: 0, omitidas: 0 }
  const tocados = new Set()
  const get = (fila, nombre) => (col(nombre) >= 0 ? (fila[col(nombre)] ?? '').trim() : '')
  const num = (t) => Number(String(t).replace(/[^\d.-]/g, '')) || 0

  for (const fila of filas.slice(1)) {
    const nombre = get(fila, 'nombre')
    if (!nombre) {
      resumen.omitidas++
      continue
    }
    let producto = lista.find((p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase())
    if (!producto) {
      producto = { id: nuevoId(), nombre, categoria: '', marca: '', condicion: 'Nuevo', garantiaDias: 0, porImei: false, costo: 0, precio: 0, variantes: [] }
      lista.unshift(producto)
      resumen.productosNuevos++
      tocados.add(producto.id)
    } else if (!tocados.has(producto.id)) {
      tocados.add(producto.id)
      resumen.productosActualizados++
    }
    if (get(fila, 'categoria')) producto.categoria = get(fila, 'categoria')
    if (get(fila, 'marca')) producto.marca = get(fila, 'marca')
    if (get(fila, 'condicion')) producto.condicion = get(fila, 'condicion')
    if (get(fila, 'garantia_dias')) producto.garantiaDias = Math.max(0, Math.round(num(get(fila, 'garantia_dias'))))
    if (get(fila, 'costo')) producto.costo = num(get(fila, 'costo'))
    if (get(fila, 'precio')) producto.precio = num(get(fila, 'precio'))

    const capacidad = get(fila, 'capacidad')
    const color = get(fila, 'color')
    const codigo = get(fila, 'codigo')
    const imeisFila = get(fila, 'imeis')
      .split(/[|,\s]+/)
      .map(normalizarSerial)
      .filter(Boolean)
    const hayVariante = capacidad || color || codigo || get(fila, 'stock') !== '' || imeisFila.length
    if (!hayVariante) continue

    let variante = codigo
      ? producto.variantes.find((v) => v.codigo === codigo)
      : producto.variantes.find((v) => v.talla.toLowerCase() === capacidad.toLowerCase() && v.color.toLowerCase() === color.toLowerCase())
    if (!variante) {
      variante = { id: nuevoId(), talla: capacidad, color, codigo, stock: 0, minimo: 1, imeis: [] }
      producto.variantes.push(variante)
      resumen.variantesNuevas++
    } else resumen.variantesActualizadas++
    if (capacidad) variante.talla = capacidad
    if (color) variante.color = color
    if (codigo) variante.codigo = codigo
    if (get(fila, 'minimo') !== '') variante.minimo = Math.max(0, Math.round(num(get(fila, 'minimo'))))

    if (imeisFila.length) {
      producto.porImei = true
      for (const m of imeisFila) {
        if (!serialValido(m) || usados.has(m)) {
          resumen.imeisRechazados++
          continue
        }
        usados.add(m)
        variante.imeis.push(m)
        resumen.imeisNuevos++
      }
    }
    // con IMEI el stock es la cantidad de equipos; sin IMEI se toma la columna stock
    if (producto.porImei) variante.stock = variante.imeis.length
    else if (get(fila, 'stock') !== '') variante.stock = Math.max(0, Math.round(num(get(fila, 'stock'))))
  }
  return { productos: lista, resumen }
}

export function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  enlace.download = nombre
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
}
