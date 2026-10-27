// Íconos de líneas; se dibujan con el color del texto que los rodea
const RUTAS = {
  resumen: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  caja: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </>
  ),
  inventario: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  ventas: (
    <>
      <path d="M6 7h12l1 13H5L6 7z" />
      <path d="M9 7a3 3 0 016 0" />
    </>
  ),
  compras: (
    <>
      <path d="M3 6h11v9H3z" />
      <path d="M14 9h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  deudas: (
    <>
      <path d="M4 7a2 2 0 012-2h11v4" />
      <path d="M4 7v10a2 2 0 002 2h14V9H6a2 2 0 01-2-2z" />
      <circle cx="16.5" cy="14" r="1" />
    </>
  ),
  clientes: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.2a3 3 0 010 5.6M18 14.3c1.8.8 3 2.6 3 4.7" />
    </>
  ),
  ganancias: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  campana: (
    <>
      <path d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z" />
      <path d="M10 21h4" />
    </>
  ),
  salir: (
    <>
      <path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </>
  ),
  descargar: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  subir: <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />,
  mas: <path d="M12 5v14M5 12h14" />,
  flecha: <path d="M9 6l6 6-6 6" />,
  flechaArriba: <path d="M7 17L17 7M9 7h8v8" />,
  cambiar: <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  alerta: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
}

export default function Icono({ nombre, tam = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {RUTAS[nombre]}
    </svg>
  )
}
