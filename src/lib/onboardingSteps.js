export const ONBOARDING_STEPS = [
  {
    key: 'finca',
    icon: '🌾',
    title: 'Crea tu primera finca',
    description: 'Registra el nombre y tamaño de tu campo en manzanas',
    cta: 'Crear finca →',
    path: '/fincas',
    accent: '#1A6B42',
    target: 'Fincas'
  },
  {
    key: 'ciclo',
    icon: '🔄',
    title: 'Crea un ciclo de producción',
    description: 'Define el período: Primera (ene-may) o Segunda (jun-oct)',
    cta: 'Crear ciclo →',
    path: '/ciclos',
    accent: '#0E7A6B',
    target: 'Ciclos'
  },
  {
    key: 'campo',
    icon: '🧑‍🌾',
    title: 'Registra los gastos de campo',
    description: 'Anota los gastos de insumos, mano de obra, maquinaria y más',
    cta: 'Registrar gasto →',
    path: '/campo?new=1',
    accent: '#16A34A',
    target: 'Gastos'
  },
  {
    key: 'cosecha',
    icon: '🌱',
    title: 'Registra la cosecha',
    description: 'Cuántos quintales se cosecharon y la humedad al corte',
    cta: 'Registrar cosecha →',
    path: '/cosecha?new=1',
    accent: '#CA8A04',
    target: 'Cosecha'
  },
  {
    key: 'bascula',
    icon: '⚖️',
    title: 'Registra el ticket de báscula',
    description: 'Cuando llegue el camión al beneficio, registra el pesaje y el flete',
    cta: 'Registrar ticket →',
    path: '/bascula?new=1',
    accent: '#1B5FA3',
    target: 'Báscula'
  },
  {
    key: 'secado',
    icon: '☀️',
    title: 'Registra el secado del viaje',
    description: '¿Se secó en patio o secadora? Registra humedad y calcula la merma',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=secado&new=1',
    accent: '#C47B1A',
    target: 'Secado'
  },
  {
    key: 'embodegado',
    icon: '📦',
    title: 'Registra el embodegado',
    description: 'Cuántos QQ y sacos entraron a bodega después del secado',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=embodegado&new=1',
    accent: '#7C3AED',
    target: 'Bodega'
  },
  {
    key: 'turno',
    icon: '🏭',
    title: 'Registra el turno de trillo',
    description: 'Agrupa los viajes del turno y registra los derivados producidos',
    cta: 'Ir a Proceso →',
    path: '/proceso?tab=turnos&new=1',
    accent: '#0F766E',
    target: 'Trillo'
  },
  {
    key: 'venta',
    icon: '💰',
    title: 'Registra la primera venta',
    description: 'A qué precio y a quién se vendió el arroz entero y los derivados',
    cta: 'Registrar venta →',
    path: '/ventas?new=1',
    accent: '#DC2626',
    target: 'Venta'
  }
]
