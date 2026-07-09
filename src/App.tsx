import { useState } from 'react'
import './App.css'
import { PERSONAS, RUN_PERSONAS, type FlowType, type PersonaKey } from './data/personas'
import { PayrollWalkthrough } from './components/PayrollWalkthrough'
import { PayrollOutputWalkthrough } from './components/PayrollOutputWalkthrough'
import { EmployeeMenu } from './components/EmployeeMenu'

const avatar = (name: string) => name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()

type Mode = 'flow' | 'doc'
type MenuType = 'payroll' | 'results' | 'employee'

function App() {
  const defaultPersonaByFlow: Record<FlowType, PersonaKey> = {
    run: 'employee',
    output: 'employee',
  }

  const [flowType, setFlowType] = useState<FlowType>('run')
  const [activeMenu, setActiveMenu] = useState<MenuType>('payroll')
  // remember last-selected persona per flow so each menu keeps its own tabs
  const [personaByFlow, setPersonaByFlow] = useState<Record<FlowType, PersonaKey>>({
    run: defaultPersonaByFlow.run,
    output: defaultPersonaByFlow.output,
  })
  const persona = personaByFlow[flowType]
  const [mode, setMode] = useState<Mode>('flow')
  const [index, setIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const current = flowType === 'run' ? RUN_PERSONAS[persona] : PERSONAS[persona]
  const step = current.steps[index]

  const personaTabs: Record<PersonaKey, { label: string; subtitle: string }> =
    flowType === 'run'
      ? {
          employee: { label: 'Employee', subtitle: 'Self-service payroll' },
          admin: { label: 'Payroll Administrator', subtitle: 'Payroll Control Center' },
          manager: { label: 'Manager', subtitle: 'Payroll approvals' },
        }
      : {
          employee: { label: 'Employee', subtitle: 'My pay results' },
          admin: { label: 'Payroll Administrator', subtitle: 'Run results & reports' },
          manager: { label: 'Manager', subtitle: 'Team cost reporting' },
        }

  const selectFlowType = (type: FlowType, personaKey?: PersonaKey) => {
    setFlowType(type)
    setPersonaByFlow((prev) => ({ ...prev, [type]: personaKey ?? prev[type] ?? defaultPersonaByFlow[type] }))
    setIndex(0)
    setMode('flow')
  }

  const selectPersona = (key: PersonaKey) => {
    // update persona only for the current flow — do not switch flows
    setPersonaByFlow((prev) => ({ ...prev, [flowType]: key }))
    setIndex(0)
    setMode('flow')
  }

  const headerSubtitle = activeMenu === 'employee' 
    ? 'HR Suite · Employee Portal'
    : flowType === 'run' ? 'HR Suite · Payroll' : 'HR Suite · Payroll Results'

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''} ${mode === 'doc' ? 'docmode' : ''}`}>
      <header className="shell">
        <div className="brand">
          <button
            className="header-menu-toggle"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Hide menu' : 'Open menu'}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <span className="menu-icon">☰</span>
          </button>
          <div className="mark">P</div>
          <div>
            People & Pay
            <small>{headerSubtitle}</small>
          </div>
        </div>
        <div className="spacer" />
        <div className="search">Search…</div>
        <div className="who">
          <span>{current.who}</span>
          <span className="avatar">{avatar(current.who)}</span>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Payroll perspective" style={{ display: activeMenu === 'employee' ? 'none' : 'flex' }}>
        {(['employee', 'admin', 'manager'] as PersonaKey[]).map((key) => (
          <button
            key={key}
            className="tab"
            role="tab"
            aria-selected={key === persona}
            onClick={() => selectPersona(key)}
          >
            {personaTabs[key].label}
            <span className="sub">{personaTabs[key].subtitle}</span>
          </button>
        ))}

        <div className="modes">
          <div className="seg" role="group" aria-label="View mode">
            <button aria-pressed={mode === 'flow'} onClick={() => setMode('flow')}>
              Step-by-step
            </button>
            <button aria-pressed={mode === 'doc'} onClick={() => setMode('doc')}>
              Full document
            </button>
          </div>
        </div>
      </nav>

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <div className={`main-grid ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <aside className={`side-menu ${sidebarOpen ? '' : 'closed'}`} aria-label="Payroll navigation">
          <button className="sidebar-close" type="button" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
          <button
            type="button"
            className={`menu-btn ${activeMenu === 'payroll' ? 'active' : ''}`}
            onClick={() => { setActiveMenu('payroll'); selectFlowType('run'); setSidebarOpen(false) }}
          >
            Payroll
          </button>
          <button
            type="button"
            className={`menu-btn ${activeMenu === 'results' ? 'active' : ''}`}
            onClick={() => { setActiveMenu('results'); selectFlowType('output'); setSidebarOpen(false) }}
          >
            Payroll results
          </button>
          <button
            type="button"
            className={`menu-btn ${activeMenu === 'employee' ? 'active' : ''}`}
            onClick={() => { setActiveMenu('employee'); setSidebarOpen(false) }}
          >
            Employee
          </button>
        </aside>

        <main className="wrap" id="root">
        {activeMenu === 'employee' ? (
          <EmployeeMenu onSelectOption={(optionId) => console.log('Selected:', optionId)} />
        ) : flowType === 'run' ? (
          <PayrollWalkthrough
            current={current}
            step={step}
            index={index}
            mode={mode}
            setIndex={setIndex}
            setMode={setMode}
          />
        ) : (
          <PayrollOutputWalkthrough
            current={current}
            step={step}
            index={index}
            mode={mode}
            setIndex={setIndex}
            setMode={setMode}
          />
        )}
      </main>
      </div>
    </div>
  )
}

export default App
