import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { getFriendlyErrorMessage } from '../lib/errorHandler'
import tarsLogo from '../assets/logo/tars-logo-dark.svg'
import './LoginPage.css'

const FEATURES = [
  {
    icon: <IconScale />,
    title: 'Báscula y trazabilidad',
    body: 'Registra cada camión y viaje con trazabilidad completa, desde el campo hasta la báscula.',
  },
  {
    icon: <IconGear />,
    title: 'Secado y merma automática',
    body: 'Cálculo automático de secado y merma en cada etapa del proceso.',
  },
  {
    icon: <IconBars />,
    title: 'P&L en tiempo real',
    body: 'Conoce tu costo por quintal y tu margen sin esperar al contador.',
  },
]

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : getFriendlyErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authpage">
      <section className="authpage-brand">
        <img src={tarsLogo} alt="TARS" className="authpage-logo" />
        <h1>El sistema de gestión arrocera para toda tu operación</h1>
        <ul className="authpage-features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="authpage-feature-icon">{f.icon}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="authpage-form-panel">
        <form onSubmit={handleSubmit} className="authpage-form">
          <h2>Iniciar sesión</h2>
          <p className="authpage-form-subtitle">Ingresa tus credenciales para continuar</p>

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </div>
  )
}

const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: '#F5F7F5', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

function IconScale() {
  return (
    <svg {...iconProps}>
      <line x1="12" y1="3" x2="12" y2="19" /><line x1="4" y1="6" x2="20" y2="6" /><path d="M4 6l-2.5 6.5a3.5 3.5 0 0 0 7 0z" /><path d="M20 6l2.5 6.5a3.5 3.5 0 0 1-7 0z" /><line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}
function IconGear() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect key={deg} x="11" y="1.5" width="2" height="3" rx="1" transform={`rotate(${deg} 12 12)`} />
      ))}
    </svg>
  )
}
function IconBars() {
  return (
    <svg {...iconProps}>
      <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="12" width="3" height="8" /><rect x="11" y="7" width="3" height="13" /><rect x="16" y="3" width="3" height="17" />
    </svg>
  )
}
