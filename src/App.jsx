import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { CicloProvider } from './hooks/useCiclo.jsx'
import { OnboardingProvider } from './hooks/useOnboarding.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LandingPageFull from './legacy/LandingPageFull.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import Dashboard from './modules/Dashboard/Dashboard.jsx'
import Ciclos from './modules/Ciclos/Ciclos.jsx'
import Fincas from './modules/Fincas/Fincas.jsx'
import Campo from './modules/Campo/Campo.jsx'
import Cosecha from './modules/Cosecha/Cosecha.jsx'
import Bascula from './modules/Bascula/Bascula.jsx'
import Proceso from './modules/Proceso/Proceso.jsx'
import Ventas from './modules/Ventas/Ventas.jsx'
import Reportes from './modules/Reportes/Reportes.jsx'
import Comparativa from './modules/Comparativa/Comparativa.jsx'

function Gate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-wrap" style={{ minHeight: '100vh' }}>
        <span className="spinner" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/app" replace /> : <LoginPage />} />
        <Route path="/landing-full" element={<LandingPageFull />} />
        <Route
          path="/app"
          element={
            session ? (
              <CicloProvider>
                <OnboardingProvider>
                  <AppLayout />
                </OnboardingProvider>
              </CicloProvider>
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ciclos" element={<Ciclos />} />
          <Route path="fincas" element={<Fincas />} />
          <Route path="campo" element={<Campo />} />
          <Route path="cosecha" element={<Cosecha />} />
          <Route path="bascula" element={<Bascula />} />
          <Route path="proceso" element={<Proceso />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="comparativa" element={<Comparativa />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  )
}
