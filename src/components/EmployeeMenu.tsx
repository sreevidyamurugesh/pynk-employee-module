import { useState, useEffect } from 'react'
import { EmployeePortalLogin } from './EmployeePortalLogin'
import { EmployeePortalFlow } from './EmployeePortalFlow'

type UserType = 'employee' | 'admin' | 'client' | null

interface EmployeeMenuProps {
  onSelectOption: (optionId: string) => void
  selectedOption?: string
  onLoginStateChange?: (isLoggedIn: boolean) => void
  onUserTypeChange?: (userType: UserType | null) => void
}

export function EmployeeMenu({ onSelectOption: _onSelectOption, selectedOption: _selectedOption, onLoginStateChange, onUserTypeChange }: EmployeeMenuProps) {
  const [userType, setUserType] = useState<UserType>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const savedUserType = localStorage.getItem('portalUserType') as UserType
    if (savedUserType) {
      setUserType(savedUserType)
      setIsLoggedIn(true)
      onLoginStateChange?.(true)
      onUserTypeChange?.(savedUserType)
    }
  }, [])

  const handleLogin = (type: UserType) => {
    setUserType(type)
    setIsLoggedIn(true)
    onLoginStateChange?.(true)
    onUserTypeChange?.(type)
  }

  const handleLogout = () => {
    setUserType(null)
    setIsLoggedIn(false)
    localStorage.removeItem('portalUserType')
    localStorage.removeItem('portalLoginTime')
    onLoginStateChange?.(false)
    onUserTypeChange?.(null)
  }

  if (!isLoggedIn || !userType) {
    return <EmployeePortalLogin onLogin={handleLogin} />
  }

  return <EmployeePortalFlow userType={userType} onLogout={handleLogout} />
}
