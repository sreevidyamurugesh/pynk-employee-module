import { useState, useRef, useEffect } from 'react'
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
  // Default to 'payroll' but only shown after login
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
  const [portalLoggedIn, setPortalLoggedIn] = useState(() => {
    const saved = localStorage.getItem('portalLoggedIn')
    return saved ? JSON.parse(saved) : false
  })
  const [portalUserType, setPortalUserType] = useState<'employee' | 'admin' | 'client' | null>(() => {
    return localStorage.getItem('portalUserType') as 'employee' | 'admin' | 'client' | null
  })
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const current = flowType === 'run' ? RUN_PERSONAS[persona] : PERSONAS[persona]
  const step = current.steps[index]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen])

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

  const handlePortalLogout = () => {
    localStorage.removeItem('portalUserType')
    localStorage.removeItem('portalLoginTime')
    localStorage.removeItem('portalLoggedIn')
    setPortalLoggedIn(false)
    setPortalUserType(null)
    setProfileMenuOpen(false)
  }

  const getInitials = (name: string) => name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()

  const getPortalUserName = (): string => {
    const names: Record<'employee' | 'admin' | 'client', string> = {
      employee: 'John Doe',
      admin: 'Admin User',
      client: 'Client Corp',
    }
    return portalUserType ? names[portalUserType] : ''
  }

  const headerSubtitle = activeMenu === 'employee' 
    ? 'HR Suite · Employee Portal'
    : flowType === 'run' ? 'HR Suite · Payroll' : 'HR Suite · Payroll Results'

  // If user is not logged in, show only login page
  if (!portalLoggedIn) {
    return (
      <div className="app-shell login-mode">
        <EmployeeMenu 
          onSelectOption={(optionId) => console.log('Selected:', optionId)} 
          onLoginStateChange={(loggedIn) => {
            setPortalLoggedIn(loggedIn)
            if (loggedIn) {
              setActiveMenu('employee')
            }
          }}
          onUserTypeChange={setPortalUserType} 
        />
      </div>
    )
  }

  // User is logged in - show full app interface with all menus
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
            Pynk
            <small>{headerSubtitle}</small>
          </div>
        </div>
        <div className="spacer" />
        <div className="search">Search…</div>
        {activeMenu === 'employee' && portalLoggedIn ? (
          <div className="profile-menu-container" ref={profileMenuRef}>
            <button
              className="profile-avatar"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-label="Profile menu"
              title="Click to open menu"
            >
              <span className="avatar-initials">{getInitials(getPortalUserName())}</span>
            </button>
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <span className="dropdown-user-name">{getPortalUserName()}</span>
                  <span className="dropdown-user-role">{portalUserType ? portalUserType.charAt(0).toUpperCase() + portalUserType.slice(1) : ''}</span>
                </div>
                <button className="dropdown-logout-btn" onClick={handlePortalLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="who">
            <span>{current.who}</span>
            <span className="avatar">{avatar(current.who)}</span>
          </div>
        )}
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

      <>
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
          <EmployeeMenu onSelectOption={(optionId) => console.log('Selected:', optionId)} onLoginStateChange={setPortalLoggedIn} onUserTypeChange={setPortalUserType} />
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
      </>
    </div>
  )
}

export default App
