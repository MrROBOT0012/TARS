import { useSearchParams } from 'react-router-dom'
import Secado from './Secado.jsx'
import Embodegado from './Embodegado.jsx'
import Turnos from './Turnos.jsx'
import './proceso.css'

const TABS = [
  { key: 'secado', label: 'Secado' },
  { key: 'embodegado', label: 'Embodegado' },
  { key: 'turnos', label: 'Turnos' }
]

export default function Proceso() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'secado'
  const openNew = searchParams.get('new') === '1'

  function setTab(key) {
    setSearchParams({ tab: key })
  }

  return (
    <div className="fade-in">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={'tab-btn' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'secado' && <Secado autoOpenNew={openNew} />}
      {tab === 'embodegado' && <Embodegado autoOpenNew={openNew} />}
      {tab === 'turnos' && <Turnos autoOpenNew={openNew} />}
    </div>
  )
}
