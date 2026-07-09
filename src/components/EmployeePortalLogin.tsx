import { useState } from 'react'
import pynkLogo from '../assets/logo.png'

type UserType = 'employee' | 'admin' | 'client' | null
type LoginStep = 'role' | 'credentials'

interface EmployeePortalLoginProps {
  onLogin: (userType: UserType) => void
}

export function EmployeePortalLogin({ onLogin }: EmployeePortalLoginProps) {
  const [step, setStep] = useState<LoginStep>('role')
  const [userType, setUserType] = useState<UserType>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const roleInfo: Record<'employee' | 'admin' | 'client', { icon: string; label: string; desc: string }> = {
    employee: { icon: '👤', label: 'Employee', desc: 'Access payroll, leave, documents' },
    admin: { icon: '👨‍💼', label: 'Admin', desc: 'HR administration & approvals' },
    client: { icon: '🏢', label: 'Client', desc: 'View employee & team data' },
  }

  const handleRoleSelect = (type: UserType) => {
    setUserType(type)
    setStep('credentials')
  }

  const handleLogin = () => {
    if (userType && username && password) {
      localStorage.setItem('portalUserType', userType)
      localStorage.setItem('portalLoginTime', new Date().toISOString())
      localStorage.setItem('portalUsername', username)
      onLogin(userType)
    }
  }

  return (
    <div className="portal-login-container">
      {step === 'role' ? (
        <div className="login-card">
          <div className="login-header">
            <img src={pynkLogo} alt="Pynk" className="login-logo-image" />
            <h1 className="pynk-title">Hire anyone, anywhere, in minutes.</h1>
            <p className="login-subtitle">Select your role to continue</p>
            <p className="pynk-tagline">Expand globally. Skip the entity overhead.</p>
          </div>

          <div className="login-roles">
            {(['employee', 'admin', 'client'] as const).map((role) => (
              <button
                key={role}
                className="role-card"
                onClick={() => handleRoleSelect(role)}
              >
                <div className="role-icon">{roleInfo[role].icon}</div>
                <div className="role-info">
                  <h3 className="role-label">{roleInfo[role].label}</h3>
                  <p className="role-desc">{roleInfo[role].desc}</p>
                </div>
                <div className="role-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="login-card">
          <div className="login-header">
            <button className="back-btn" onClick={() => setStep('role')} title="Back">
              ←
            </button>
            <div className="login-logo">{roleInfo[userType!].icon}</div>
            <h1>{roleInfo[userType!].label}</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
          >
            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={!username || !password}
            >
              Sign In
            </button>
          </form>

          <div className="login-footer">
            <p className="help-text">Demo credentials: any username/password</p>
          </div>
        </div>
      )}
    </div>
  )
}
