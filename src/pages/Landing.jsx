import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import tarsLogo from '../assets/logo/tars-logo-dark.svg'
import './Landing.css'

const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'caracteristicas', label: 'Características' },
  { id: 'hoja-de-ruta', label: 'Hoja de ruta' },
]

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.unobserve(node)
        }
      },
      { threshold: 0.12 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])
  return [ref, visible]
}

function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  const y = el.getBoundingClientRect().top + window.scrollY - 64
  window.scrollTo({ top: y, behavior: 'smooth' })
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)

  const [problemRef, problemVisible] = useReveal()
  const [solutionRef, solutionVisible] = useReveal()
  const [roadmapRef, roadmapVisible] = useReveal()
  const [ctaRef, ctaVisible] = useReveal()

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function go(id) {
    return (e) => {
      e.preventDefault()
      scrollToId(id)
      setMenuOpen(false)
    }
  }

  function openToast() {
    setToastOpen(true)
    setMenuOpen(false)
  }

  return (
    <div className="landing">
      <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
        <a href="#inicio" onClick={go('inicio')} className="landing-logo-link">
          <img src={tarsLogo} alt="TARS" className="landing-logo" style={{width: '300px', height: 'auto', minWidth: '300px', display: 'block'}} />
        </a>
        <button
          type="button"
          className="landing-burger"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
        <div className="landing-nav-actions">
          <button type="button" className="btn btn-outline-light" onClick={openToast}>
            Solicitar acceso
          </button>
          <Link to="/login" className="btn btn-primary-pill">Iniciar sesión</Link>
        </div>
      </nav>

      {menuOpen && (
        <div className="landing-mobile-menu">
          {NAV_LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)}>{l.label}</a>
          ))}
          <div className="landing-mobile-menu-actions">
            <button type="button" className="btn btn-outline-light" onClick={openToast}>
              Solicitar acceso
            </button>
            <Link to="/login" className="btn btn-primary-pill" onClick={() => setMenuOpen(false)}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}

      <section id="inicio" className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-content">
          <h1>Del campo al reporte, en tiempo real</h1>
          <p>
            TARS es el sistema de gestión arrocera que conecta cada etapa de tu operación
            — desde la báscula hasta la venta
          </p>
          <div className="landing-hero-cta">
            <button type="button" className="btn btn-primary-pill btn-lg" onClick={openToast}>
              Solicitar acceso →
            </button>
            <button type="button" className="btn btn-outline-light btn-lg" onClick={go('caracteristicas')}>
              Ver cómo funciona
            </button>
          </div>
          <p className="landing-trust">
            Desarrollado para productores de arroz en Nicaragua y Centroamérica
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--light">
        <div ref={problemRef} className={`reveal${problemVisible ? ' visible' : ''}`}>
          <span className="landing-label">EL PROBLEMA</span>
          <h2 className="landing-h2 landing-h2--dark">
            Los productores manejan operaciones complejas con métodos del siglo pasado
          </h2>
          <div className="landing-grid landing-grid-2">
            <ProblemCard
              title="Control en papel"
              body="Gastos y cosechas anotados a mano. Un cuaderno perdido es información perdida"
              icon={<IconDocument />}
            />
            <ProblemCard
              title="Excel sin control"
              body="Archivos duplicados, versiones distintas, fórmulas rotas"
              icon={<IconGrid />}
            />
            <ProblemCard
              title="Información dividida"
              body="Datos en el celular de uno, en el cuaderno de otro. Nunca hay una sola versión"
              icon={<IconLayers />}
            />
            <ProblemCard
              title="Sin visión del negocio"
              body="El productor no sabe cuánto ganó hasta semanas después de la cosecha"
              icon={<IconEyeOff />}
            />
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="landing-section landing-section--white">
        <div ref={solutionRef} className={`reveal${solutionVisible ? ' visible' : ''}`}>
          <span className="landing-label">LA SOLUCIÓN</span>
          <h2 className="landing-h2 landing-h2--dark">
            Una plataforma completa para toda la operación
          </h2>

          <div className="landing-dashboard-embed">
            <iframe
              src="/demo/tars-demo.html"
              title="TARS Demo"
              loading="lazy"
            />
          </div>

          <div className="landing-grid landing-grid-3">
            <ProblemCard
              title="Báscula y viajes"
              body="Registra cada camión, flete y origen de la granza con trazabilidad completa"
              icon={<IconScale />}
              plain
            />
            <ProblemCard
              title="Proceso completo"
              body="Secado, embodegado y trillado organizados por viaje con cálculo automático de merma"
              icon={<IconGear />}
              plain
            />
            <ProblemCard
              title="P&L en tiempo real"
              body="Conoce tu costo por quintal, margen y rentabilidad sin esperar al contador"
              icon={<IconBars />}
              plain
            />
          </div>
        </div>
      </section>

      <section id="hoja-de-ruta" className="landing-section landing-section--dark">
        <div ref={roadmapRef} className={`reveal${roadmapVisible ? ' visible' : ''}`}>
          <span className="landing-label landing-label--light">HOJA DE RUTA</span>
          <h2 className="landing-h2 landing-h2--light">Tres etapas. Cada una con valor propio</h2>
          <div className="landing-grid landing-grid-3">
            <RoadmapCard badge="Disponible ahora" badgeClass="badge-green" title="Etapa 1: Control Operativo" body="Campo, báscula, proceso, ventas, P&L" />
            <RoadmapCard badge="En desarrollo" badgeClass="badge-amber" title="Etapa 2: Cloud + IA" body="Multi-usuario, nube, asistente inteligente" />
            <RoadmapCard badge="Próximamente" badgeClass="badge-gray" title="Etapa 3: Contabilidad" body="Fiscal, nómina, inventario completo" />
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div ref={ctaRef} className={`reveal${ctaVisible ? ' visible' : ''}`}>
          <h2>¿Listo para modernizar tu operación?</h2>
          <p>Únete a los primeros productores que gestionan su arroz con datos reales</p>
          <button type="button" className="btn btn-cta" onClick={openToast}>Solicitar acceso →</button>
          <p className="landing-cta-note">Próximamente disponible</p>
        </div>
      </section>

      <footer className="landing-footer">
        <img src={tarsLogo} alt="TARS" className="landing-logo landing-logo--footer" />
        <nav className="landing-footer-nav">
          {NAV_LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)}>{l.label}</a>
          ))}
          <Link to="/login">Iniciar sesión</Link>
        </nav>
        <span className="landing-footer-copy">© 2026 TARS · Sistema Arrocero</span>
        <span className="landing-footer-credit">Desarrollado por Zelaya&amp;Co</span>
      </footer>

      {toastOpen && (
        <div className="landing-toast-overlay" onClick={() => setToastOpen(false)}>
          <div className="landing-toast-card" onClick={(e) => e.stopPropagation()}>
            <div className="landing-toast-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <circle cx="12" cy="16" r="0.5" fill="#1A6B42" />
              </svg>
            </div>
            <div className="landing-toast-body">
              <p className="landing-toast-title">Próximamente disponible</p>
              <p className="landing-toast-text">Estamos onboarding los primeros productores.</p>
            </div>
            <button type="button" className="landing-toast-close" onClick={() => setToastOpen(false)} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProblemCard({ title, body, icon, plain }) {
  return (
    <div className={plain ? 'feature-card' : 'problem-card'}>
      <div className="icon-wrap">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function RoadmapCard({ badge, badgeClass, title, body }) {
  return (
    <div className="roadmap-card">
      <span className={`badge ${badgeClass}`}>{badge}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

function IconDocument() {
  return (
    <svg {...iconProps} stroke="#F5F7F5">
      <rect x="5" y="3" width="14" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg {...iconProps} stroke="#F5F7F5">
      <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="4" x2="9" y2="20" /><line x1="15" y1="4" x2="15" y2="20" />
    </svg>
  )
}
function IconLayers() {
  return (
    <svg {...iconProps} stroke="#F5F7F5">
      <rect x="3" y="3" width="12" height="12" rx="2" /><rect x="9" y="9" width="12" height="12" rx="2" />
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg {...iconProps} stroke="#F5F7F5">
      <circle cx="12" cy="12" r="3.2" /><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><line x1="4" y1="20" x2="20" y2="4" />
    </svg>
  )
}
function IconScale() {
  return (
    <svg {...iconProps} stroke="#1A6B42">
      <line x1="12" y1="3" x2="12" y2="19" /><line x1="4" y1="6" x2="20" y2="6" /><path d="M4 6l-2.5 6.5a3.5 3.5 0 0 0 7 0z" /><path d="M20 6l2.5 6.5a3.5 3.5 0 0 1-7 0z" /><line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}
function IconGear() {
  return (
    <svg {...iconProps} stroke="#1A6B42">
      <circle cx="12" cy="12" r="3" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect key={deg} x="11" y="1.5" width="2" height="3" rx="1" transform={`rotate(${deg} 12 12)`} />
      ))}
    </svg>
  )
}
function IconBars() {
  return (
    <svg {...iconProps} stroke="#1A6B42">
      <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="12" width="3" height="8" /><rect x="11" y="7" width="3" height="13" /><rect x="16" y="3" width="3" height="17" />
    </svg>
  )
}
