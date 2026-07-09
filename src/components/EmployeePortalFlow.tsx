import { useState } from 'react'

type UserType = 'employee' | 'admin' | 'client'
type Module = 'dashboard' | 'time-entry' | 'leave' | 'my-pay' | 'documents' | 'profile' | 'notifications'

interface EmployeePortalFlowProps {
  userType: UserType
  onLogout: () => void
}

interface ModuleStep {
  title: string
  tag: string
  content: string
}

const moduleSteps: Record<Module, ModuleStep[]> = {
  dashboard: [
    {
      title: 'Welcome to Dashboard',
      tag: 'Overview',
      content: 'Your personalized dashboard showing quick actions and important updates',
    },
    {
      title: 'Quick Actions',
      tag: 'Actions',
      content: 'Submit timesheet, apply leave, view payslip - all from one place',
    },
  ],
  'time-entry': [
    { title: 'My Timesheet', tag: 'View', content: 'View and manage your time entries' },
    { title: 'Weekly View', tag: 'Hours', content: 'See your hours in weekly format' },
    { title: 'Daily View', tag: 'Details', content: 'View daily time entry details' },
    { title: 'Submit Timesheet', tag: 'Action', content: 'Submit your timesheet for approval' },
    { title: 'Approval Status', tag: 'Status', content: 'Track approval status' },
  ],
  leave: [
    { title: 'Apply Leave', tag: 'Request', content: 'Submit a new leave request' },
    { title: 'Leave Balance', tag: 'Available', content: 'Check your remaining leave balance' },
    { title: 'Leave Calendar', tag: 'Schedule', content: 'View leave calendar' },
    { title: 'Leave History', tag: 'History', content: 'View past leave requests' },
  ],
  'my-pay': [
    { title: 'Payslips', tag: 'Download', content: 'Download and view your payslips' },
    { title: 'Salary Breakdown', tag: 'Details', content: 'Detailed salary breakdown' },
    { title: 'Tax Documents', tag: 'Forms', content: 'View tax forms and documents' },
    { title: 'Payment History', tag: 'Record', content: 'Payment history and details' },
  ],
  documents: [
    { title: 'Employment Contract', tag: 'Document', content: 'View your employment contract' },
    { title: 'Visa Documents', tag: 'Travel', content: 'Access visa-related documents' },
    { title: 'Tax Forms', tag: 'Taxes', content: 'Download tax forms' },
    { title: 'Company Policies', tag: 'Policies', content: 'Review company policies' },
  ],
  profile: [
    { title: 'Personal Information', tag: 'Edit', content: 'Update your personal details' },
    { title: 'Contact Details', tag: 'Contact', content: 'Manage your contact information' },
    { title: 'Bank Details', tag: 'Banking', content: 'Update banking information' },
    { title: 'Emergency Contact', tag: 'Safety', content: 'Add emergency contacts' },
  ],
  notifications: [
    { title: 'All Notifications', tag: 'Feed', content: 'View all your notifications' },
    { title: 'Payroll Updates', tag: 'Salary', content: 'Payroll-related notifications' },
    { title: 'Leave Updates', tag: 'Time Off', content: 'Leave request updates' },
    { title: 'Document Alerts', tag: 'Files', content: 'New document notifications' },
  ],
}

export function EmployeePortalFlow(_props: EmployeePortalFlowProps) {
  const [currentModule, setCurrentModule] = useState<Module>('dashboard')
  const [stepIndex, setStepIndex] = useState(0)



  const modules: { id: Module; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'time-entry', label: 'Time Entry', icon: '⏱️' },
    { id: 'leave', label: 'Leave', icon: '📅' },
    { id: 'my-pay', label: 'My Pay', icon: '💰' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ]

  const steps = moduleSteps[currentModule]
  const currentStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const handleModuleClick = (moduleId: Module) => {
    setCurrentModule(moduleId)
    setStepIndex(0)
  }



  return (
    <>
      <div className="portal-header">
        <div className="portal-header-content">
          <h2>{currentModule === 'dashboard' ? 'Dashboard' : modules.find(m => m.id === currentModule)?.label}</h2>
        </div>
      </div>

      <div className="portal-layout">
        <aside className="portal-sidebar" aria-label="Modules">
          <h3>Modules</h3>
          <div className="module-list">
            {modules.map((module) => (
              <button
                key={module.id}
                className={`module-btn ${currentModule === module.id ? 'active' : ''}`}
                onClick={() => handleModuleClick(module.id)}
              >
                <span className="module-icon">{module.icon}</span>
                <span className="module-label">{module.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="portal-content">
          <div className={`layout ${currentModule === 'dashboard' ? 'dashboard-layout' : ''}`}>
            {currentModule !== 'dashboard' && (
              <aside className="rail" aria-label="Steps">
                <h2>{modules.find(m => m.id === currentModule)?.label} · {steps.length} steps</h2>
                <ol>
                  {steps.map((stepItem, idx) => (
                    <li key={idx}>
                      <button
                        className={`rstep ${idx < stepIndex ? 'is-done' : idx === stepIndex ? 'is-current' : ''}`}
                        onClick={() => setStepIndex(idx)}
                      >
                        <span className="rnum">{idx < stepIndex ? '✓' : idx + 1}</span>
                        <span className="rlabel">
                          {stepItem.title}
                          <span className="rmini">{stepItem.tag}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </aside>
            )}

            <div className="stage">
              <div className="screen">
                <div className="screen-head">
                  <h1>{currentStep.title}</h1>
                  <span className="tag">{currentStep.tag}</span>
                </div>
                <div className="screen-body">
                  <p className="screen-intro">{currentStep.content}</p>
                  <div style={{ marginTop: '24px', padding: '20px', background: 'var(--info-soft)', borderRadius: '8px' }}>
                    <p>This is step {stepIndex + 1} of {steps.length}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '8px' }}>Data is stored locally in your browser</p>
                  </div>
                </div>
              </div>

              <div className="foot">
                <button
                  className="btn"
                  onClick={() => setStepIndex(Math.max(stepIndex - 1, 0))}
                  disabled={stepIndex === 0}
                >
                  ← Back
                </button>
                <div className="progress">
                  <div className="pmeta">
                    <span>Step {stepIndex + 1} of {steps.length}</span>
                    <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}% complete</span>
                  </div>
                  <div className="pbar">
                    <div className="fill" style={{ width: `${Math.round(((stepIndex + 1) / steps.length) * 100)}%` }} />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setStepIndex(Math.min(stepIndex + 1, steps.length - 1))}
                  disabled={isLast}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
