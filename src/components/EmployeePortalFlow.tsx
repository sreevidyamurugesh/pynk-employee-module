import { useEffect, useMemo, useState } from 'react'

type UserType = 'employee' | 'admin' | 'client'
type Module = 'dashboard' | 'time-entry' | 'leave' | 'my-pay' | 'documents' | 'profile' | 'notifications'

type TimeEntryStatus = 'submitted' | 'draft' | 'returned' | 'none'

interface EmployeePortalFlowProps {
  userType: UserType
  onLogout: () => void
}

interface ModuleStep {
  title: string
  tag: string
  content: string
}

interface TimeEntryDay {
  key: string
  label: string
  dateLabel: string
  status: TimeEntryStatus
  hours: number
  regularHours: number
  overtimeHours: number
  startTime: string
  endTime: string
  breakDuration: string
  workLocation: string
  notes: string
}

interface TimeEntryRangeData {
  fromDateISO: string
  toDateISO: string
  days: TimeEntryDay[]
  lastSaved: string
}

interface TimeEntryStore {
  activeRangeKey: string
  ranges: Record<string, TimeEntryRangeData>
}

interface TimeEntryEditForm {
  startTime: string
  endTime: string
  breakMinutes: number
  workLocation: string
  notes: string
}

const TIME_ENTRY_STORE_KEY = 'portalTimeEntryRangeStoreV2'
const DEFAULT_FROM_DATE = '2025-07-14'
const DEFAULT_TO_DATE = '2025-07-20'
const MAX_RANGE_DAYS = 31

const timeEntryTabs = ['My Timesheet', 'Calendar', 'Time History', 'Approvals', 'Settings'] as const

const statusLabel: Record<TimeEntryStatus, string> = {
  submitted: 'Submitted',
  draft: 'Draft',
  returned: 'Returned',
  none: '-',
}

const toIso = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const formatDateShort = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })

const formatDateLong = (iso: string) => {
  const date = fromIso(iso)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getRangeLabel = (fromDateISO: string, toDateISO: string) => {
  const start = fromIso(fromDateISO)
  const end = fromIso(toDateISO)
  return `${formatDateShort(start)} - ${formatDateShort(end)} ${end.getFullYear()}`
}

const makeRangeKey = (fromDateISO: string, toDateISO: string) => `${fromDateISO}_${toDateISO}`

const isWeekdayIso = (iso: string) => {
  const day = fromIso(iso).getDay()
  return day >= 1 && day <= 5
}

const formatHours = (value: number) => value.toFixed(1)

const parseTime12To24 = (value: string) => {
  if (value === '--') return ''
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  const hours = Number(match[1]) % 12
  const minutes = Number(match[2])
  const period = match[3].toUpperCase()
  const finalHours = period === 'PM' ? hours + 12 : hours
  return `${String(finalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const formatTime24To12 = (value: string) => {
  if (!value) return '--'
  const [hStr, mStr] = value.split(':')
  const hours = Number(hStr)
  const minutes = Number(mStr)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '--'
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}

const parseBreakDurationToMinutes = (value: string) => {
  if (value === '--') return 0
  const match = value.match(/^(\d{2}):(\d{2})\s*hr$/i)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

const formatBreakMinutes = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const mins = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} hr`
}

const minutesFromTime = (value: string) => {
  const [hStr, mStr] = value.split(':')
  const hours = Number(hStr)
  const mins = Number(mStr)
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null
  return hours * 60 + mins
}

const dayLabelFromIso = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
  })

const dateLabelFromIso = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })

function buildRangeData(fromDateISO: string, toDateISO: string, templateDays?: TimeEntryDay[]): TimeEntryRangeData {
  const fromDate = fromIso(fromDateISO)
  const toDate = fromIso(toDateISO)

  const days: TimeEntryDay[] = []
  let current = new Date(fromDate)
  let index = 0

  while (current <= toDate && index < MAX_RANGE_DAYS) {
    const iso = toIso(current)
    const template = templateDays?.[index]
    const weekday = isWeekdayIso(iso)

    const baseHours = template?.hours ?? (weekday ? 8 : 0)
    const baseRegular = template?.regularHours ?? Math.min(8, baseHours)
    const baseOvertime = template?.overtimeHours ?? Math.max(0, baseHours - 8)

    days.push({
      key: iso,
      label: dayLabelFromIso(iso),
      dateLabel: dateLabelFromIso(iso),
      status: weekday ? (baseHours > 0 ? 'draft' : 'none') : 'none',
      hours: baseHours,
      regularHours: baseRegular,
      overtimeHours: baseOvertime,
      startTime: template?.startTime ?? (weekday ? '09:00 AM' : '--'),
      endTime: template?.endTime ?? (weekday ? '06:00 PM' : '--'),
      breakDuration: template?.breakDuration ?? (weekday ? '01:00 hr' : '--'),
      workLocation: template?.workLocation ?? (weekday ? 'Office' : 'Off'),
      notes: template?.notes ?? (weekday ? '' : 'Weekend.'),
    })

    current = addDays(current, 1)
    index += 1
  }

  return {
    fromDateISO,
    toDateISO,
    days,
    lastSaved: 'Today, 10:30 AM',
  }
}

function getDefaultStore(): TimeEntryStore {
  const range = buildRangeData(DEFAULT_FROM_DATE, DEFAULT_TO_DATE)
  range.days = range.days.map((day, idx) => {
    if (!isWeekdayIso(day.key)) {
      return day
    }

    const seeded: Array<Partial<TimeEntryDay>> = [
      { status: 'draft', hours: 8, regularHours: 8, overtimeHours: 0, notes: 'Worked on dashboard and time entry modules.' },
      { status: 'draft', hours: 8, regularHours: 8, overtimeHours: 0, notes: 'Sprint planning and task breakdown.' },
      { status: 'submitted', hours: 8, regularHours: 8, overtimeHours: 0, notes: 'Development and code review.' },
      { status: 'draft', hours: 7.5, regularHours: 7.5, overtimeHours: 0, endTime: '05:30 PM', notes: 'Fixes and documentation.' },
      { status: 'draft', hours: 7, regularHours: 7, overtimeHours: 0, endTime: '05:00 PM', notes: 'Demo prep and backlog grooming.' },
    ]

    return { ...day, ...seeded[idx] }
  })

  const key = makeRangeKey(DEFAULT_FROM_DATE, DEFAULT_TO_DATE)
  return {
    activeRangeKey: key,
    ranges: { [key]: range },
  }
}

function loadTimeEntryStore(): TimeEntryStore {
  try {
    const raw = localStorage.getItem(TIME_ENTRY_STORE_KEY)
    if (!raw) {
      return getDefaultStore()
    }

    const parsed = JSON.parse(raw) as TimeEntryStore
    if (!parsed.ranges || !parsed.activeRangeKey) {
      return getDefaultStore()
    }

    const active = parsed.ranges[parsed.activeRangeKey]
    if (!active || !active.days || active.days.length === 0) {
      return getDefaultStore()
    }

    return parsed
  } catch {
    return getDefaultStore()
  }
}

const getEditFormFromDay = (day: TimeEntryDay): TimeEntryEditForm => ({
  startTime: parseTime12To24(day.startTime),
  endTime: parseTime12To24(day.endTime),
  breakMinutes: parseBreakDurationToMinutes(day.breakDuration),
  workLocation: day.workLocation === 'Off' ? 'Office' : day.workLocation,
  notes: day.notes,
})

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

  const [activeTimeEntryTab, setActiveTimeEntryTab] = useState<(typeof timeEntryTabs)[number]>('My Timesheet')
  const [timeEntryStore, setTimeEntryStore] = useState<TimeEntryStore>(() => loadTimeEntryStore())
  const activeRange = timeEntryStore.ranges[timeEntryStore.activeRangeKey]

  const [fromDateInput, setFromDateInput] = useState(activeRange.fromDateISO)
  const [toDateInput, setToDateInput] = useState(activeRange.toDateISO)
  const [selectedDayKey, setSelectedDayKey] = useState<string>(activeRange.days[0]?.key ?? '')
  const [dateRangeError, setDateRangeError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [confirmAction, setConfirmAction] = useState<'clock' | 'copy' | null>(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<TimeEntryEditForm>({
    startTime: '',
    endTime: '',
    breakMinutes: 60,
    workLocation: 'Office',
    notes: '',
  })
  const [editError, setEditError] = useState('')

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

  useEffect(() => {
    localStorage.setItem(TIME_ENTRY_STORE_KEY, JSON.stringify(timeEntryStore))
  }, [timeEntryStore])

  useEffect(() => {
    setFromDateInput(activeRange.fromDateISO)
    setToDateInput(activeRange.toDateISO)
    if (!activeRange.days.some((day) => day.key === selectedDayKey)) {
      setSelectedDayKey(activeRange.days[0]?.key ?? '')
    }
  }, [activeRange.fromDateISO, activeRange.toDateISO, activeRange.days, selectedDayKey])

  const selectedDay = activeRange.days.find((day) => day.key === selectedDayKey) ?? activeRange.days[0]
  const selectedDayIndex = Math.max(0, activeRange.days.findIndex((day) => day.key === selectedDay.key))
  const dateProgressPct = activeRange.days.length > 0
    ? Math.round(((selectedDayIndex + 1) / activeRange.days.length) * 100)
    : 0

  const totals = useMemo(() => {
    return activeRange.days.reduce(
      (acc, day) => {
        acc.totalHours += day.hours
        acc.regularHours += day.regularHours
        acc.overtimeHours += day.overtimeHours
        return acc
      },
      { totalHours: 0, regularHours: 0, overtimeHours: 0 },
    )
  }, [activeRange.days])

  const leaveHours = 0
  const completionPct = Math.min(100, Math.round((totals.totalHours / 40) * 100))
  const rangeStatus: 'Draft' | 'Submitted' | 'Returned' =
    activeRange.days.some((day) => day.status === 'returned')
      ? 'Returned'
      : activeRange.days.some((day) => day.status === 'draft')
        ? 'Draft'
        : 'Submitted'

  const confirmContent = useMemo(() => {
    if (!confirmAction || !selectedDay) return null

    if (confirmAction === 'clock') {
      const hasEndTime = selectedDay.endTime !== '--'
      if (hasEndTime) {
        return {
          title: 'Confirm Clock In',
          message: `This will set ${formatDateLong(selectedDay.key)} as in progress. End time will be cleared, hours will be reset to 4.0, and status will be Draft.`,
        }
      }

      return {
        title: 'Confirm Clock Out',
        message: `This will set end time to 06:00 PM for ${formatDateLong(selectedDay.key)}, update hours to at least 8.0, and mark the status as Draft.`,
      }
    }

    const impactedDays = activeRange.days.filter((day) => isWeekdayIso(day.key)).length
    return {
      title: 'Confirm Copy Previous Period',
      message: `This will overwrite ${impactedDays} working dates in the selected range with default values (09:00 AM to 06:00 PM, 8.0 hours, Draft status). Existing entries for those dates will be replaced.`,
    }
  }, [confirmAction, selectedDay, activeRange.days])

  const closeConfirmModal = () => setConfirmAction(null)

  const handleModuleClick = (moduleId: Module) => {
    setCurrentModule(moduleId)
    setStepIndex(0)
  }

  const updateActiveRange = (updater: (range: TimeEntryRangeData) => TimeEntryRangeData) => {
    setTimeEntryStore((prev) => {
      const current = prev.ranges[prev.activeRangeKey]
      const updated = updater(current)
      return {
        ...prev,
        ranges: {
          ...prev.ranges,
          [prev.activeRangeKey]: updated,
        },
      }
    })
  }

  const updateDay = (dayKey: string, updater: (day: TimeEntryDay) => TimeEntryDay) => {
    updateActiveRange((range) => ({
      ...range,
      days: range.days.map((day) => (day.key === dayKey ? updater(day) : day)),
      lastSaved: 'Just now',
    }))
  }

  const applyDateRange = () => {
    setDateRangeError('')
    setSubmitError('')

    if (!fromDateInput || !toDateInput) {
      setDateRangeError('Select both From and To dates.')
      return
    }

    const from = fromIso(fromDateInput)
    const to = fromIso(toDateInput)
    if (from > to) {
      setDateRangeError('From date cannot be after To date.')
      return
    }

    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
    if (daysDiff > MAX_RANGE_DAYS) {
      setDateRangeError(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`)
      return
    }

    const key = makeRangeKey(fromDateInput, toDateInput)

    setTimeEntryStore((prev) => {
      if (prev.ranges[key]) {
        return { ...prev, activeRangeKey: key }
      }

      return {
        activeRangeKey: key,
        ranges: {
          ...prev.ranges,
          [key]: buildRangeData(fromDateInput, toDateInput, prev.ranges[prev.activeRangeKey].days),
        },
      }
    })
  }

  const openEditModalForDay = (dayKey: string) => {
    const day = activeRange.days.find((entry) => entry.key === dayKey)
    if (!day) return
    setSelectedDayKey(dayKey)
    setEditForm(getEditFormFromDay(day))
    setEditError('')
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditError('')
  }

  const handleSaveDayEdit = () => {
    if (!selectedDay) return

    const hasStart = Boolean(editForm.startTime)
    const hasEnd = Boolean(editForm.endTime)

    if (hasStart !== hasEnd) {
      setEditError('Please provide both start and end time.')
      return
    }

    const breakMinutes = Math.max(0, Math.round(editForm.breakMinutes || 0))
    let hours = 0
    let regularHours = 0
    let overtimeHours = 0
    let startTime = '--'
    let endTime = '--'
    let status: TimeEntryStatus = 'none'

    if (hasStart && hasEnd) {
      const startMinutes = minutesFromTime(editForm.startTime)
      const endMinutes = minutesFromTime(editForm.endTime)

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        setEditError('End time must be later than start time.')
        return
      }

      const totalMinutes = Math.max(0, endMinutes - startMinutes - breakMinutes)
      hours = Number((totalMinutes / 60).toFixed(1))
      regularHours = Number(Math.min(8, hours).toFixed(1))
      overtimeHours = Number(Math.max(0, hours - 8).toFixed(1))
      startTime = formatTime24To12(editForm.startTime)
      endTime = formatTime24To12(editForm.endTime)
      status = hours > 0 ? 'draft' : 'none'
    }

    updateDay(selectedDay.key, (day) => ({
      ...day,
      startTime,
      endTime,
      breakDuration: hasStart && hasEnd ? formatBreakMinutes(breakMinutes) : '--',
      hours,
      regularHours,
      overtimeHours,
      status,
      workLocation: editForm.workLocation,
      notes: editForm.notes.trim() || (status === 'none' ? 'No entry.' : ''),
    }))

    closeEditModal()
  }

  const handleClockInOut = () => {
    if (!selectedDay || !isWeekdayIso(selectedDay.key)) {
      return
    }

    updateDay(selectedDay.key, (day) => {
      const hasEndTime = day.endTime !== '--'
      if (hasEndTime) {
        return {
          ...day,
          endTime: '--',
          hours: 4,
          regularHours: 4,
          overtimeHours: 0,
          status: 'draft',
          notes: 'Clocked in and still in progress.',
        }
      }

      return {
        ...day,
        startTime: day.startTime === '--' ? '09:00 AM' : day.startTime,
        endTime: '06:00 PM',
        breakDuration: day.breakDuration === '--' ? '01:00 hr' : day.breakDuration,
        hours: Math.max(day.hours, 8),
        regularHours: Math.max(day.regularHours, 8),
        overtimeHours: Math.max(0, Math.max(day.hours, 8) - 8),
        status: 'draft',
        notes: 'Clocked out after completing planned tasks.',
      }
    })
  }

  const requestClockInOut = () => {
    if (!selectedDay || !isWeekdayIso(selectedDay.key)) {
      return
    }
    setConfirmAction('clock')
  }

  const handleCopyPreviousPeriod = () => {
    updateActiveRange((range) => ({
      ...range,
      days: range.days.map((day) => {
        if (!isWeekdayIso(day.key)) {
          return {
            ...day,
            status: 'none',
            hours: 0,
            regularHours: 0,
            overtimeHours: 0,
            startTime: '--',
            endTime: '--',
            breakDuration: '--',
            workLocation: 'Off',
            notes: 'Weekend.',
          }
        }

        return {
          ...day,
          status: 'draft',
          hours: 8,
          regularHours: 8,
          overtimeHours: 0,
          startTime: '09:00 AM',
          endTime: '06:00 PM',
          breakDuration: '01:00 hr',
          workLocation: 'Office',
          notes: 'Copied from previous period template.',
        }
      }),
      lastSaved: 'Just now',
    }))
  }

  const requestCopyPreviousPeriod = () => {
    setConfirmAction('copy')
  }

  const handleConfirmAction = () => {
    if (confirmAction === 'clock') {
      handleClockInOut()
    }
    if (confirmAction === 'copy') {
      handleCopyPreviousPeriod()
    }
    setConfirmAction(null)
  }

  const handleRequestCorrection = () => {
    if (!selectedDay || !isWeekdayIso(selectedDay.key)) {
      return
    }

    updateDay(selectedDay.key, (day) => ({
      ...day,
      status: 'returned',
      notes: 'Correction requested for this entry.',
    }))
  }

  const handleSubmit = () => {
    setSubmitError('')

    if (!activeRange.fromDateISO || !activeRange.toDateISO) {
      setSubmitError('Select a valid date range before submitting.')
      return
    }

    if (fromIso(activeRange.fromDateISO) > fromIso(activeRange.toDateISO)) {
      setSubmitError('From date must be before To date.')
      return
    }

    if (activeRange.days.some((day) => day.status === 'returned')) {
      setSubmitError('Resolve returned entries before submitting.')
      return
    }

    const filledDays = activeRange.days.filter((day) => isWeekdayIso(day.key) && day.hours > 0)
    if (filledDays.length === 0) {
      setSubmitError('Enter time for at least one date before submitting.')
      return
    }

    if (filledDays.some((day) => day.startTime === '--' || day.endTime === '--')) {
      setSubmitError('Each filled date must have both start and end time.')
      return
    }

    updateActiveRange((range) => ({
      ...range,
      days: range.days.map((day) => {
        if (!isWeekdayIso(day.key) || day.hours <= 0) return day
        return { ...day, status: 'submitted' }
      }),
      lastSaved: 'Just now',
    }))
  }

  const handlePrevDate = () => {
    if (selectedDayIndex <= 0) return
    setSelectedDayKey(activeRange.days[selectedDayIndex - 1].key)
  }

  const handleNextDate = () => {
    if (selectedDayIndex >= activeRange.days.length - 1) return
    setSelectedDayKey(activeRange.days[selectedDayIndex + 1].key)
  }

  return (
    <>
      <div className="portal-header">
        <div className="portal-header-content">
          <h2>{currentModule === 'dashboard' ? 'Dashboard' : modules.find((m) => m.id === currentModule)?.label}</h2>
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
          {currentModule === 'time-entry' ? (
            <div className="time-entry-shell">
              <div className="time-entry-top">
                <div className="time-entry-tabs" role="tablist" aria-label="Time entry tabs">
                  {timeEntryTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`time-tab ${activeTimeEntryTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTimeEntryTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="time-entry-actions">
                  <label className="date-control">
                    From
                    <input type="date" value={fromDateInput} onChange={(event) => setFromDateInput(event.target.value)} />
                  </label>
                  <label className="date-control">
                    To
                    <input type="date" value={toDateInput} onChange={(event) => setToDateInput(event.target.value)} />
                  </label>
                  <button type="button" className="btn" onClick={applyDateRange}>Apply Dates</button>
                  <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
                </div>
              </div>

              {dateRangeError && <p className="submit-error">{dateRangeError}</p>}
              {submitError && <p className="submit-error">{submitError}</p>}

              <div className="time-entry-cards">
                <section className="time-card summary-card" aria-label="Summary">
                  <h3>Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Total Hours</span>
                      <strong>{formatHours(totals.totalHours)}</strong>
                      <small>/ 40 hrs</small>
                    </div>
                    <div className="summary-item">
                      <span>Regular Hours</span>
                      <strong>{formatHours(totals.regularHours)}</strong>
                      <small>/ 40 hrs</small>
                    </div>
                    <div className="summary-item">
                      <span>Overtime</span>
                      <strong>{formatHours(totals.overtimeHours)}</strong>
                      <small>hrs</small>
                    </div>
                    <div className="summary-item">
                      <span>Leave Hours</span>
                      <strong>{formatHours(leaveHours)}</strong>
                      <small>hrs</small>
                    </div>
                  </div>
                </section>

                <section className="time-card status-card" aria-label="Status">
                  <h3>Status</h3>
                  <span className={`status-chip ${rangeStatus.toLowerCase()}`}>{rangeStatus}</span>
                  <p>Last saved: {activeRange.lastSaved}</p>
                  <p>{getRangeLabel(activeRange.fromDateISO, activeRange.toDateISO)}</p>
                  <div className="status-progress">
                    <div className="status-progress-fill" style={{ width: `${completionPct}%` }} />
                  </div>
                  <small>{completionPct}% completed</small>
                </section>

                <section className="time-card quick-card" aria-label="Quick actions">
                  <h3>Quick Actions</h3>
                  <button type="button" className="quick-link" onClick={requestClockInOut}>
                    Clock In / Out <span>›</span>
                  </button>
                  <button type="button" className="quick-link" onClick={requestCopyPreviousPeriod}>
                    Copy Previous Period <span>›</span>
                  </button>
                  <button type="button" className="quick-link" onClick={handleRequestCorrection}>
                    Request Correction <span>›</span>
                  </button>
                </section>
              </div>

              <div className="time-entry-main">
                <div className="time-table-card">
                  <table className="time-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        {activeRange.days.map((day) => (
                          <th
                            key={day.key}
                            className={selectedDayKey === day.key ? 'selected' : ''}
                            onClick={() => setSelectedDayKey(day.key)}
                          >
                            <span>{day.label}</span>
                            <small>{day.dateLabel}</small>
                          </th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Status</td>
                        {activeRange.days.map((day) => (
                          <td key={`status-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                            <button
                              type="button"
                              className={`status-chip status-chip-btn ${day.status}`}
                              onClick={() => openEditModalForDay(day.key)}
                              title="Edit this date"
                            >
                              {statusLabel[day.status]}
                            </button>
                          </td>
                        ))}
                        <td> </td>
                      </tr>
                      <tr>
                        <td>Hours</td>
                        {activeRange.days.map((day) => (
                          <td key={`hours-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                            {formatHours(day.hours)}
                          </td>
                        ))}
                        <td>{formatHours(totals.totalHours)}</td>
                      </tr>
                      <tr>
                        <td>Regular Hours</td>
                        {activeRange.days.map((day) => (
                          <td key={`regular-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                            {formatHours(day.regularHours)}
                          </td>
                        ))}
                        <td>{formatHours(totals.regularHours)}</td>
                      </tr>
                      <tr>
                        <td>Overtime</td>
                        {activeRange.days.map((day) => (
                          <td key={`ot-${day.key}`} className={selectedDayKey === day.key ? 'selected' : ''}>
                            {formatHours(day.overtimeHours)}
                          </td>
                        ))}
                        <td>{formatHours(totals.overtimeHours)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="time-legend">
                    <span>
                      <i className="dot submitted" />Submitted
                    </span>
                    <span>
                      <i className="dot draft" />Draft
                    </span>
                    <span>
                      <i className="dot returned" />Returned
                    </span>
                    <span>
                      <i className="dot none" />No Entry
                    </span>
                  </div>
                </div>

                <aside className="time-day-card" aria-label="Selected date details">
                  <div className="day-card-head">
                    <h4>{formatDateLong(selectedDay.key)}</h4>
                    <button type="button" onClick={() => openEditModalForDay(selectedDay.key)}>Edit</button>
                  </div>
                  <dl>
                    <div><dt>Work Location</dt><dd>{selectedDay.workLocation}</dd></div>
                    <div><dt>Start Time</dt><dd>{selectedDay.startTime}</dd></div>
                    <div><dt>End Time</dt><dd>{selectedDay.endTime}</dd></div>
                    <div><dt>Break</dt><dd>{selectedDay.breakDuration}</dd></div>
                    <div><dt>Regular Hours</dt><dd>{formatHours(selectedDay.regularHours)} hrs</dd></div>
                    <div><dt>Overtime</dt><dd>{formatHours(selectedDay.overtimeHours)} hrs</dd></div>
                    <div><dt>Notes</dt><dd>{selectedDay.notes || 'No notes.'}</dd></div>
                  </dl>
                </aside>
              </div>

              <div className="foot">
                <button
                  className="btn"
                  onClick={handlePrevDate}
                  disabled={selectedDayIndex === 0}
                >
                  ← Back
                </button>
                <div className="progress">
                  <div className="pmeta">
                    <span>Date {selectedDayIndex + 1} of {activeRange.days.length}</span>
                    <span>{dateProgressPct}% complete</span>
                  </div>
                  <div className="pbar">
                    <div className="fill" style={{ width: `${dateProgressPct}%` }} />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleNextDate}
                  disabled={selectedDayIndex >= activeRange.days.length - 1}
                >
                  Next →
                </button>
              </div>

              {isEditModalOpen && (
                <div className="time-modal-backdrop" role="presentation" onClick={closeEditModal}>
                  <div
                    className="time-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Edit time entry"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3>Edit Entry · {formatDateLong(selectedDay.key)}</h3>
                    <div className="time-modal-grid">
                      <label>
                        Start Time
                        <input
                          type="time"
                          value={editForm.startTime}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, startTime: event.target.value }))}
                        />
                      </label>
                      <label>
                        End Time
                        <input
                          type="time"
                          value={editForm.endTime}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, endTime: event.target.value }))}
                        />
                      </label>
                      <label>
                        Break (minutes)
                        <input
                          type="number"
                          min={0}
                          max={300}
                          value={editForm.breakMinutes}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, breakMinutes: Number(event.target.value || 0) }))
                          }
                        />
                      </label>
                      <label>
                        Work Location
                        <select
                          value={editForm.workLocation}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, workLocation: event.target.value }))}
                        >
                          <option>Office</option>
                          <option>Remote</option>
                          <option>Client Site</option>
                        </select>
                      </label>
                      <label className="full">
                        Notes
                        <textarea
                          rows={3}
                          value={editForm.notes}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                        />
                      </label>
                    </div>
                    {editError && <p className="time-modal-error">{editError}</p>}
                    <div className="time-modal-actions">
                      <button type="button" className="btn" onClick={closeEditModal}>Cancel</button>
                      <button type="button" className="btn btn-primary" onClick={handleSaveDayEdit}>Save Entry</button>
                    </div>
                  </div>
                </div>
              )}

              {confirmAction && confirmContent && (
                <div className="time-modal-backdrop" role="presentation" onClick={closeConfirmModal}>
                  <div
                    className="time-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirm quick action"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3>{confirmContent.title}</h3>
                    <p className="time-confirm-message">{confirmContent.message}</p>
                    <div className="time-modal-actions">
                      <button type="button" className="btn" onClick={closeConfirmModal}>Cancel</button>
                      <button type="button" className="btn btn-primary" onClick={handleConfirmAction}>Yes, Continue</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`layout ${currentModule === 'dashboard' ? 'dashboard-layout' : ''}`}>
              {currentModule !== 'dashboard' && (
                <aside className="rail" aria-label="Steps">
                  <h2>{modules.find((m) => m.id === currentModule)?.label} · {steps.length} steps</h2>
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
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '8px' }}>
                        Data is stored locally in your browser
                      </p>
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
          )}
        </section>
      </div>
    </>
  )
}
