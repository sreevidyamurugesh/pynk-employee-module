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
  approvalStatus?: ApprovalStatus
  submittedOnISO?: string
  approvedOnISO?: string
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

interface TimeEntryWarning {
  title: string
  message: string
}

type TimeHistoryStatus = 'approved' | 'draft' | 'returned'
type ApprovalStatus = 'pending' | 'approved' | 'returned'

interface ApprovalDayDetail {
  key: string
  label: string
  dateLabel: string
  hours: number
  regularHours: number
  overtimeHours: number
}

interface ApprovalItem {
  key: string
  employeeName: string
  employeeRole: string
  fromDateISO: string
  toDateISO: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  submittedOnISO: string
  status: ApprovalStatus
  details: ApprovalDayDetail[]
}

interface TimeHistoryItem {
  key: string
  fromDateISO: string
  toDateISO: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  status: TimeHistoryStatus
  submittedOnISO: string
  approvedOnISO: string
}

type LeaveStatus = 'pending' | 'approved' | 'returned' | 'cancelled'
type LeaveTypeId = 'annual' | 'sick' | 'casual' | 'comp' | 'other' | 'maternity' | 'paternity'

interface LeaveBalanceItem {
  id: LeaveTypeId
  name: string
  entitlement: number
  used: number
  pending: number
  color: string
}

interface LeaveRequestItem {
  id: string
  leaveType: LeaveTypeId
  fromDateISO: string
  toDateISO: string
  durationDays: number
  status: LeaveStatus
  appliedOnISO: string
  reason: string
  handoverTo: string
  contactDuringLeave: string
}

interface TeamLeaveApprovalItem {
  id: string
  employeeName: string
  employeeRole: string
  leaveType: LeaveTypeId
  fromDateISO: string
  toDateISO: string
  durationDays: number
  status: LeaveStatus
}

interface LeaveApplyForm {
  leaveType: LeaveTypeId
  fromDateISO: string
  toDateISO: string
  reason: string
  handoverTo: string
  contactDuringLeave: string
}

interface LeaveWarning {
  title: string
  message: string
}

const TIME_ENTRY_STORE_KEY = 'portalTimeEntryRangeStoreV2'
const MAX_RANGE_DAYS = 31

const timeEntryTabs = ['My Timesheet', 'Calendar', 'Time History', 'Approvals'] as const
const leaveTabs = ['My Leave', 'Apply Leave', 'Leave Balance', 'Leave History'] as const

const statusLabel: Record<TimeEntryStatus, string> = {
  submitted: 'Submitted',
  draft: 'Draft',
  returned: 'Returned',
  none: '-',
}

const timeHistoryStatusLabel: Record<TimeHistoryStatus, string> = {
  approved: 'Approved',
  draft: 'Draft',
  returned: 'Returned',
}

const approvalStatusLabel: Record<ApprovalStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  returned: 'Returned',
}

const leaveStatusLabel: Record<LeaveStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  returned: 'Returned',
  cancelled: 'Cancelled',
}

const leaveTypeLabel: Record<LeaveTypeId, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  casual: 'Casual Leave',
  comp: 'Comp Off',
  other: 'Other',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
}

const leaveTypeDescriptions: Record<LeaveTypeId, string> = {
  annual: 'Paid time off for vacation.',
  sick: 'Leave for medical reasons.',
  casual: 'Short-term personal leave.',
  comp: 'Compensatory time off.',
  other: 'Other approved leave type.',
  maternity: 'Maternity benefit leave.',
  paternity: 'Paternity leave benefit.',
}

const leaveSeedBalances: LeaveBalanceItem[] = [
  { id: 'annual', name: 'Annual Leave', entitlement: 24, used: 6, pending: 0, color: '#5a7dff' },
  { id: 'sick', name: 'Sick Leave', entitlement: 12, used: 2, pending: 0, color: '#48b36a' },
  { id: 'casual', name: 'Casual Leave', entitlement: 12, used: 4, pending: 2, color: '#8f63ff' },
  { id: 'comp', name: 'Comp Off', entitlement: 6, used: 2, pending: 1, color: '#f4ac3f' },
  { id: 'maternity', name: 'Maternity Leave', entitlement: 180, used: 0, pending: 0, color: '#ff7da8' },
  { id: 'paternity', name: 'Paternity Leave', entitlement: 15, used: 0, pending: 0, color: '#56c2d6' },
  { id: 'other', name: 'Other', entitlement: 5, used: 0, pending: 0, color: '#9999aa' },
]

const leaveSeedRequests: LeaveRequestItem[] = [
  {
    id: 'lv-001',
    leaveType: 'annual',
    fromDateISO: '2025-07-21',
    toDateISO: '2025-07-22',
    durationDays: 2,
    status: 'pending',
    appliedOnISO: '2025-07-18',
    reason: 'Family trip',
    handoverTo: 'Robert Brown',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-002',
    leaveType: 'sick',
    fromDateISO: '2025-07-10',
    toDateISO: '2025-07-10',
    durationDays: 1,
    status: 'approved',
    appliedOnISO: '2025-07-10',
    reason: 'Fever and rest advised',
    handoverTo: 'Nina Rao',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-003',
    leaveType: 'casual',
    fromDateISO: '2025-06-25',
    toDateISO: '2025-06-25',
    durationDays: 1,
    status: 'approved',
    appliedOnISO: '2025-06-24',
    reason: 'Personal errand',
    handoverTo: 'Jane Smith',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-004',
    leaveType: 'comp',
    fromDateISO: '2025-06-05',
    toDateISO: '2025-06-05',
    durationDays: 1,
    status: 'approved',
    appliedOnISO: '2025-06-05',
    reason: 'Comp off for release weekend',
    handoverTo: 'Emily Johnson',
    contactDuringLeave: '9876543210',
  },
  {
    id: 'lv-005',
    leaveType: 'sick',
    fromDateISO: '2025-05-20',
    toDateISO: '2025-05-20',
    durationDays: 1,
    status: 'cancelled',
    appliedOnISO: '2025-05-20',
    reason: 'Recovered quickly and resumed work',
    handoverTo: 'Michael Lee',
    contactDuringLeave: '9876543210',
  },
]

const leaveSeedApprovals: TeamLeaveApprovalItem[] = [
  {
    id: 'ap-001',
    employeeName: 'Jane Smith',
    employeeRole: 'UI/UX Designer',
    leaveType: 'annual',
    fromDateISO: '2025-07-22',
    toDateISO: '2025-07-23',
    durationDays: 2,
    status: 'pending',
  },
  {
    id: 'ap-002',
    employeeName: 'Robert Brown',
    employeeRole: 'Frontend Dev',
    leaveType: 'sick',
    fromDateISO: '2025-07-21',
    toDateISO: '2025-07-21',
    durationDays: 1,
    status: 'pending',
  },
  {
    id: 'ap-003',
    employeeName: 'Emily Johnson',
    employeeRole: 'QA Engineer',
    leaveType: 'casual',
    fromDateISO: '2025-07-21',
    toDateISO: '2025-07-21',
    durationDays: 1,
    status: 'returned',
  },
]

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

const getTodayDate = () => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

const getTodayIso = () => toIso(getTodayDate())

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

const formatDateWithYear = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

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

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const startOfWeek = (date: Date) => {
  const weekday = date.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  return addDays(date, mondayOffset)
}

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

const calendarWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const buildCalendarGrid = (monthDate: Date) => {
  const monthStart = startOfMonth(monthDate)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = addDays(monthStart, -mondayOffset)

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

const isFutureIso = (iso: string) => fromIso(iso).getTime() > getTodayDate().getTime()

const countWeekdaysInclusive = (fromDateISO: string, toDateISO: string) => {
  const from = fromIso(fromDateISO)
  const to = fromIso(toDateISO)
  if (from > to) return 0

  let count = 0
  const cursor = new Date(from)
  while (cursor.getTime() <= to.getTime()) {
    const weekday = cursor.getDay()
    if (weekday >= 1 && weekday <= 5) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

const doesDateRangeOverlap = (
  leftFromISO: string,
  leftToISO: string,
  rightFromISO: string,
  rightToISO: string,
) => {
  const leftFrom = fromIso(leftFromISO).getTime()
  const leftTo = fromIso(leftToISO).getTime()
  const rightFrom = fromIso(rightFromISO).getTime()
  const rightTo = fromIso(rightToISO).getTime()

  return leftFrom <= rightTo && rightFrom <= leftTo
}

const deriveLeaveBalances = (balances: LeaveBalanceItem[], requests: LeaveRequestItem[]) => {
  const usage = requests.reduce(
    (acc, request) => {
      if (request.status === 'approved') {
        acc[request.leaveType].used += request.durationDays
      }
      if (request.status === 'pending') {
        acc[request.leaveType].pending += request.durationDays
      }
      return acc
    },
    Object.fromEntries(
      balances.map((item) => [item.id, { used: 0, pending: 0 }]),
    ) as Record<LeaveTypeId, { used: number; pending: number }>,
  )

  return balances.map((item) => ({
    ...item,
    used: usage[item.id].used,
    pending: usage[item.id].pending,
  }))
}

const getCurrentTimeEntryBounds = () => {
  const today = getTodayDate()
  const fromDate = startOfWeek(today)

  return {
    fromDateISO: toIso(fromDate),
    toDateISO: toIso(today),
  }
}

const getPreferredSelectedDayKey = (days: TimeEntryDay[], todayIso: string) =>
  days.find((day) => day.key === todayIso)?.key
  ?? days.find((day) => !isFutureIso(day.key))?.key
  ?? days[0]?.key
  ?? ''

const seedRangeData = (range: TimeEntryRangeData) => {
  const seeded: Array<Partial<TimeEntryDay>> = [
    { status: 'draft', hours: 8, regularHours: 8, overtimeHours: 0, notes: 'Worked on dashboard and time entry modules.' },
    { status: 'draft', hours: 8, regularHours: 8, overtimeHours: 0, notes: 'Sprint planning and task breakdown.' },
    { status: 'submitted', hours: 8, regularHours: 8, overtimeHours: 0, notes: 'Development and code review.' },
    { status: 'draft', hours: 7.5, regularHours: 7.5, overtimeHours: 0, endTime: '05:30 PM', notes: 'Fixes and documentation.' },
    { status: 'draft', hours: 7, regularHours: 7, overtimeHours: 0, endTime: '05:00 PM', notes: 'Demo prep and backlog grooming.' },
  ]

  range.days = range.days.map((day, idx) => {
    if (!isWeekdayIso(day.key)) {
      return day
    }

    return { ...day, ...seeded[idx] }
  })

  return range
}

const createCurrentRangeData = () => {
  const { fromDateISO, toDateISO } = getCurrentTimeEntryBounds()
  return seedRangeData(buildRangeData(fromDateISO, toDateISO))
}

const buildApprovalDetailsFromDays = (days: TimeEntryDay[]): ApprovalDayDetail[] =>
  days.map((day) => ({
    key: day.key,
    label: day.label,
    dateLabel: day.dateLabel,
    hours: day.hours,
    regularHours: day.regularHours,
    overtimeHours: day.overtimeHours,
  }))

const distributeHoursAcrossWeek = (totalHours: number, regularHours: number, overtimeHours: number) => {
  const regularPerDay = Array.from({ length: 5 }, () => 0)
  let remainingRegular = regularHours

  regularPerDay.forEach((_, index) => {
    const allocation = Math.min(8, remainingRegular)
    regularPerDay[index] = Number(allocation.toFixed(1))
    remainingRegular = Number((remainingRegular - allocation).toFixed(1))
  })

  const hoursPerDay = [...regularPerDay]
  if (overtimeHours > 0) {
    hoursPerDay[4] = Number((hoursPerDay[4] + overtimeHours).toFixed(1))
  }

  const consumed = hoursPerDay.reduce((sum, value) => sum + value, 0)
  if (consumed < totalHours) {
    hoursPerDay[4] = Number((hoursPerDay[4] + (totalHours - consumed)).toFixed(1))
  }

  return { regularPerDay, hoursPerDay }
}

const buildSeedApprovalDetails = (fromDateISO: string, totalHours: number, regularHours: number, overtimeHours: number) => {
  const weekStart = fromIso(fromDateISO)
  const { regularPerDay, hoursPerDay } = distributeHoursAcrossWeek(totalHours, regularHours, overtimeHours)

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const iso = toIso(date)
    const weekdayIndex = index < 5 ? index : -1
    const regular = weekdayIndex >= 0 ? regularPerDay[weekdayIndex] : 0
    const hours = weekdayIndex >= 0 ? hoursPerDay[weekdayIndex] : 0
    const overtime = Number(Math.max(0, hours - regular).toFixed(1))

    return {
      key: iso,
      label: dayLabelFromIso(iso),
      dateLabel: dateLabelFromIso(iso),
      hours,
      regularHours: regular,
      overtimeHours: overtime,
    }
  })
}

const buildApprovalItemFromRange = (range: TimeEntryRangeData): ApprovalItem => {
  const totalHours = Number(range.days.reduce((sum, day) => sum + day.hours, 0).toFixed(1))
  const regularHours = Number(range.days.reduce((sum, day) => sum + day.regularHours, 0).toFixed(1))
  const overtimeHours = Number(range.days.reduce((sum, day) => sum + day.overtimeHours, 0).toFixed(1))

  return {
    key: makeRangeKey(range.fromDateISO, range.toDateISO),
    employeeName: 'John Doe',
    employeeRole: 'Product Designer',
    fromDateISO: range.fromDateISO,
    toDateISO: range.toDateISO,
    totalHours,
    regularHours,
    overtimeHours,
    leaveHours: 0,
    submittedOnISO: range.submittedOnISO ?? range.toDateISO,
    status: range.approvalStatus ?? (range.days.some((day) => day.status === 'returned') ? 'returned' : 'pending'),
    details: buildApprovalDetailsFromDays(range.days),
  }
}

const createSeedApprovalItems = (today: Date): ApprovalItem[] => {
  return createSeedHistoryItems(today)
    .filter((item) => item.status !== 'draft')
    .map((item) => ({
      key: `approval-${item.key}`,
      employeeName: 'John Doe',
      employeeRole: 'Product Designer',
      fromDateISO: item.fromDateISO,
      toDateISO: item.toDateISO,
      totalHours: item.totalHours,
      regularHours: item.regularHours,
      overtimeHours: item.overtimeHours,
      leaveHours: item.leaveHours,
      submittedOnISO: item.submittedOnISO,
      status: item.status === 'approved' ? 'approved' : 'returned',
      details: buildSeedApprovalDetails(item.fromDateISO, item.totalHours, item.regularHours, item.overtimeHours),
    }))
}

const mapRangeStatusToHistoryStatus = (range: TimeEntryRangeData): TimeHistoryStatus => {
  if (range.approvalStatus === 'approved') {
    return 'approved'
  }
  if (range.approvalStatus === 'returned') {
    return 'returned'
  }
  if (range.days.some((day) => day.status === 'returned')) {
    return 'returned'
  }
  if (range.days.some((day) => day.status === 'draft')) {
    return 'draft'
  }
  return 'approved'
}

const buildHistoryItemFromRange = (range: TimeEntryRangeData): TimeHistoryItem => {
  const totals = range.days.reduce(
    (acc, day) => {
      acc.totalHours += day.hours
      acc.regularHours += day.regularHours
      acc.overtimeHours += day.overtimeHours
      return acc
    },
    { totalHours: 0, regularHours: 0, overtimeHours: 0 },
  )

  const status = mapRangeStatusToHistoryStatus(range)
  const weekEnd = fromIso(range.toDateISO)
  const submittedOnISO = status === 'draft' ? '' : range.toDateISO
  const approvedOnISO = status === 'approved' ? toIso(addDays(weekEnd, 1)) : ''

  return {
    key: makeRangeKey(range.fromDateISO, range.toDateISO),
    fromDateISO: range.fromDateISO,
    toDateISO: range.toDateISO,
    totalHours: Number(totals.totalHours.toFixed(1)),
    regularHours: Number(totals.regularHours.toFixed(1)),
    overtimeHours: Number(totals.overtimeHours.toFixed(1)),
    leaveHours: 0,
    status,
    submittedOnISO,
    approvedOnISO,
  }
}

const createSeedHistoryItems = (today: Date) => {
  const currentWeekStart = startOfWeek(today)

  const seedRows: Array<{
    weeksAgo: number
    totalHours: number
    regularHours: number
    overtimeHours: number
    leaveHours: number
    status: TimeHistoryStatus
    submittedOffset: number
    approvedOffset: number | null
  }> = [
    { weeksAgo: 0, totalHours: 38.5, regularHours: 36, overtimeHours: 2.5, leaveHours: 0, status: 'draft', submittedOffset: 0, approvedOffset: null },
    { weeksAgo: 1, totalHours: 42, regularHours: 40, overtimeHours: 2, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 6 },
    { weeksAgo: 2, totalHours: 39, regularHours: 38, overtimeHours: 1, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 7 },
    { weeksAgo: 3, totalHours: 41, regularHours: 40, overtimeHours: 1, leaveHours: 0, status: 'returned', submittedOffset: 6, approvedOffset: null },
    { weeksAgo: 4, totalHours: 40, regularHours: 40, overtimeHours: 0, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 7 },
    { weeksAgo: 5, totalHours: 40, regularHours: 40, overtimeHours: 0, leaveHours: 0, status: 'approved', submittedOffset: 6, approvedOffset: 7 },
  ]

  return seedRows.map((item) => {
    const fromDate = addDays(currentWeekStart, item.weeksAgo * -7)
    const toDate = item.weeksAgo === 0 ? today : addDays(fromDate, 6)
    const submittedOnISO = item.status === 'draft' ? '' : toIso(addDays(fromDate, item.submittedOffset))
    const approvedOnISO = item.approvedOffset === null ? '' : toIso(addDays(fromDate, item.approvedOffset))

    return {
      key: makeRangeKey(toIso(fromDate), toIso(toDate)),
      fromDateISO: toIso(fromDate),
      toDateISO: toIso(toDate),
      totalHours: item.totalHours,
      regularHours: item.regularHours,
      overtimeHours: item.overtimeHours,
      leaveHours: item.leaveHours,
      status: item.status,
      submittedOnISO,
      approvedOnISO,
    } satisfies TimeHistoryItem
  })
}

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
  const range = createCurrentRangeData()
  const key = makeRangeKey(range.fromDateISO, range.toDateISO)
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

    const todayIso = getTodayIso()
    const activeContainsToday = active.days.some((day) => day.key === todayIso)
    if (activeContainsToday) {
      return parsed
    }

    const currentRange = createCurrentRangeData()
    const currentRangeKey = makeRangeKey(currentRange.fromDateISO, currentRange.toDateISO)

    return {
      ...parsed,
      activeRangeKey: currentRangeKey,
      ranges: {
        ...parsed.ranges,
        [currentRangeKey]: parsed.ranges[currentRangeKey] ?? currentRange,
      },
    }
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
  const [activeLeaveTab, setActiveLeaveTab] = useState<(typeof leaveTabs)[number]>('My Leave')
  const [timeEntryStore, setTimeEntryStore] = useState<TimeEntryStore>(() => loadTimeEntryStore())
  const activeRange = timeEntryStore.ranges[timeEntryStore.activeRangeKey]
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => startOfMonth(fromIso(activeRange.fromDateISO)))
  const [isCalendarFiltersOpen, setIsCalendarFiltersOpen] = useState(false)
  const [calendarVisibleStatuses, setCalendarVisibleStatuses] = useState<TimeEntryStatus[]>([
    'submitted',
    'draft',
    'returned',
    'none',
  ])
  const [isTimeHistoryFiltersOpen, setIsTimeHistoryFiltersOpen] = useState(false)

  const [fromDateInput, setFromDateInput] = useState(activeRange.fromDateISO)
  const [toDateInput, setToDateInput] = useState(activeRange.toDateISO)
  const [historyFromDateInput, setHistoryFromDateInput] = useState(() => toIso(addDays(startOfWeek(getTodayDate()), -35)))
  const [historyToDateInput, setHistoryToDateInput] = useState(getTodayIso())
  const [appliedHistoryFromDate, setAppliedHistoryFromDate] = useState(() => toIso(addDays(startOfWeek(getTodayDate()), -35)))
  const [appliedHistoryToDate, setAppliedHistoryToDate] = useState(getTodayIso())
  const [historyStatusFilter, setHistoryStatusFilter] = useState<TimeHistoryStatus | 'all'>('all')
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatus | 'all'>('pending')
  const [expandedApprovalKey, setExpandedApprovalKey] = useState<string | null>(null)
  const [isApprovalsFilterOpen, setIsApprovalsFilterOpen] = useState(false)
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => getPreferredSelectedDayKey(activeRange.days, getTodayIso()))
  const [dateRangeError, setDateRangeError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [historyFilterError, setHistoryFilterError] = useState('')
  const [confirmAction, setConfirmAction] = useState<'clock' | 'copy' | null>(null)
  const [warningModal, setWarningModal] = useState<TimeEntryWarning | null>(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<TimeEntryEditForm>({
    startTime: '',
    endTime: '',
    breakMinutes: 60,
    workLocation: 'Office',
    notes: '',
  })
  const [editError, setEditError] = useState('')
  const todayIso = getTodayIso()

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(leaveSeedRequests)
  const [leaveApprovals, setLeaveApprovals] = useState<TeamLeaveApprovalItem[]>(leaveSeedApprovals)
  const [leaveForm, setLeaveForm] = useState<LeaveApplyForm>({
    leaveType: 'annual',
    fromDateISO: todayIso,
    toDateISO: todayIso,
    reason: '',
    handoverTo: '',
    contactDuringLeave: '',
  })
  const [leaveFormError, setLeaveFormError] = useState('')
  const [leaveFormSuccess, setLeaveFormSuccess] = useState('')
  const [leaveWarning, setLeaveWarning] = useState<LeaveWarning | null>(null)
  const [leaveHistoryStatusFilter, setLeaveHistoryStatusFilter] = useState<LeaveStatus | 'all'>('all')
  const [leaveHistoryFromInput, setLeaveHistoryFromInput] = useState(() => toIso(addDays(getTodayDate(), -120)))
  const [leaveHistoryToInput, setLeaveHistoryToInput] = useState(todayIso)
  const [appliedLeaveHistoryFrom, setAppliedLeaveHistoryFrom] = useState(() => toIso(addDays(getTodayDate(), -120)))
  const [appliedLeaveHistoryTo, setAppliedLeaveHistoryTo] = useState(todayIso)
  const [leaveHistoryError, setLeaveHistoryError] = useState('')
  const [leaveApprovalFilter, setLeaveApprovalFilter] = useState<LeaveStatus | 'all'>('pending')

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
    const hasSelectedDay = activeRange.days.some((day) => day.key === selectedDayKey)
    if (!hasSelectedDay || isFutureIso(selectedDayKey)) {
      setSelectedDayKey(getPreferredSelectedDayKey(activeRange.days, todayIso))
    }
  }, [activeRange.fromDateISO, activeRange.toDateISO, activeRange.days, selectedDayKey, todayIso])

  const selectedDay = activeRange.days.find((day) => day.key === selectedDayKey) ?? activeRange.days[0]
  const selectedDayIndex = Math.max(0, activeRange.days.findIndex((day) => day.key === selectedDay.key))
  const dateProgressPct = activeRange.days.length > 0
    ? Math.round(((selectedDayIndex + 1) / activeRange.days.length) * 100)
    : 0

  useEffect(() => {
    if (activeTimeEntryTab === 'Calendar' && selectedDay) {
      setCalendarMonthDate(startOfMonth(fromIso(selectedDay.key)))
    }
  }, [activeTimeEntryTab, selectedDay])

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
  const isCalendarTab = activeTimeEntryTab === 'Calendar'
  const isTimeHistoryTab = activeTimeEntryTab === 'Time History'
  const isApprovalsTab = activeTimeEntryTab === 'Approvals'
  const rangeStatus: 'Draft' | 'Submitted' | 'Returned' =
    activeRange.days.some((day) => day.status === 'returned')
      ? 'Returned'
      : activeRange.days.some((day) => day.status === 'draft')
        ? 'Draft'
        : 'Submitted'

  const entryMap = useMemo(() => new Map(activeRange.days.map((day) => [day.key, day])), [activeRange.days])

  const visibleMonthDays = useMemo(
    () => activeRange.days.filter((day) => isSameMonth(fromIso(day.key), calendarMonthDate)),
    [activeRange.days, calendarMonthDate],
  )

  const visibleMonthTotals = useMemo(() => {
    return visibleMonthDays.reduce(
      (acc, day) => {
        acc.totalHours += day.hours
        acc.regularHours += day.regularHours
        acc.overtimeHours += day.overtimeHours
        acc[day.status] += 1
        return acc
      },
      {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        submitted: 0,
        draft: 0,
        returned: 0,
        none: 0,
      },
    )
  }, [visibleMonthDays])

  const calendarDays = useMemo(() => {
    return buildCalendarGrid(calendarMonthDate).map((date) => {
      const iso = toIso(date)
      const entry = entryMap.get(iso)
      return {
        iso,
        date,
        entry,
        isCurrentMonth: isSameMonth(date, calendarMonthDate),
        isSelected: selectedDay?.key === iso,
        isToday: iso === todayIso,
        isVisible: entry ? calendarVisibleStatuses.includes(entry.status) : calendarVisibleStatuses.includes('none'),
      }
    })
  }, [calendarMonthDate, entryMap, selectedDay?.key, todayIso, calendarVisibleStatuses])

  const timeHistoryItems = useMemo(() => {
    const seededItems = createSeedHistoryItems(getTodayDate())
    const derivedItems = Object.values(timeEntryStore.ranges).map(buildHistoryItemFromRange)
    const merged = new Map<string, TimeHistoryItem>()

    seededItems.forEach((item) => {
      merged.set(item.key, item)
    })

    derivedItems.forEach((item) => {
      merged.set(item.key, item)
    })

    return Array.from(merged.values()).sort(
      (left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime(),
    )
  }, [timeEntryStore.ranges])

  const filteredTimeHistoryItems = useMemo(() => {
    const fromFilter = appliedHistoryFromDate ? fromIso(appliedHistoryFromDate).getTime() : null
    const toFilter = appliedHistoryToDate ? fromIso(appliedHistoryToDate).getTime() : null

    return timeHistoryItems.filter((item) => {
      const startsAt = fromIso(item.fromDateISO).getTime()
      const endsAt = fromIso(item.toDateISO).getTime()
      const matchesStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter
      const matchesFrom = fromFilter === null || endsAt >= fromFilter
      const matchesTo = toFilter === null || startsAt <= toFilter

      return matchesStatus && matchesFrom && matchesTo
    })
  }, [appliedHistoryFromDate, appliedHistoryToDate, historyStatusFilter, timeHistoryItems])

  const approvalItems = useMemo(() => {
    const rangeItems = Object.values(timeEntryStore.ranges)
      .filter((range) => range.days.some((day) => day.hours > 0))
      .map(buildApprovalItemFromRange)

    const merged = new Map<string, ApprovalItem>()
    createSeedApprovalItems(getTodayDate()).forEach((item) => merged.set(item.key, item))
    rangeItems.forEach((item) => merged.set(item.key, item))

    return Array.from(merged.values()).sort(
      (left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime(),
    )
  }, [timeEntryStore.ranges])

  const filteredApprovalItems = useMemo(() => {
    return approvalFilter === 'all'
      ? approvalItems
      : approvalItems.filter((item) => item.status === approvalFilter)
  }, [approvalFilter, approvalItems])

  const approvalCounts = useMemo(() => {
    return approvalItems.reduce(
      (acc, item) => {
        acc[item.status] += 1
        acc.all += 1
        return acc
      },
      { pending: 0, approved: 0, returned: 0, all: 0 },
    )
  }, [approvalItems])

  const appliedHistoryRangeLabel = `${formatDateWithYear(appliedHistoryFromDate)} - ${formatDateWithYear(appliedHistoryToDate)}`
  const appliedLeaveHistoryRangeLabel = `${formatDateWithYear(appliedLeaveHistoryFrom)} - ${formatDateWithYear(appliedLeaveHistoryTo)}`
  const leaveRequestedDaysPreview = useMemo(
    () => countWeekdaysInclusive(leaveForm.fromDateISO, leaveForm.toDateISO),
    [leaveForm.fromDateISO, leaveForm.toDateISO],
  )
  const leaveBalances = useMemo(() => deriveLeaveBalances(leaveSeedBalances, leaveRequests), [leaveRequests])

  const leaveAvailableByType = useMemo(
    () => Object.fromEntries(
      leaveBalances.map((item) => [item.id, Math.max(0, item.entitlement - item.used - item.pending)]),
    ) as Record<LeaveTypeId, number>,
    [leaveBalances],
  )

  const leaveSummary = useMemo(() => {
    const pending = leaveRequests.filter((item) => item.status === 'pending').length
    const approved = leaveRequests.filter((item) => item.status === 'approved').length
    const returned = leaveRequests.filter((item) => item.status === 'returned').length
    const cancelled = leaveRequests.filter((item) => item.status === 'cancelled').length
    const upcoming = leaveRequests.filter(
      (item) => item.status !== 'cancelled' && fromIso(item.fromDateISO).getTime() >= fromIso(todayIso).getTime(),
    ).length

    return {
      pending,
      approved,
      returned,
      cancelled,
      upcoming,
    }
  }, [leaveRequests, todayIso])

  const filteredLeaveHistory = useMemo(() => {
    const fromFilter = appliedLeaveHistoryFrom ? fromIso(appliedLeaveHistoryFrom).getTime() : null
    const toFilter = appliedLeaveHistoryTo ? fromIso(appliedLeaveHistoryTo).getTime() : null

    return leaveRequests
      .filter((item) => {
        const startsAt = fromIso(item.fromDateISO).getTime()
        const endsAt = fromIso(item.toDateISO).getTime()
        const matchesStatus = leaveHistoryStatusFilter === 'all' || item.status === leaveHistoryStatusFilter
        const matchesFrom = fromFilter === null || endsAt >= fromFilter
        const matchesTo = toFilter === null || startsAt <= toFilter
        return matchesStatus && matchesFrom && matchesTo
      })
      .sort((left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime())
  }, [appliedLeaveHistoryFrom, appliedLeaveHistoryTo, leaveHistoryStatusFilter, leaveRequests])

  const filteredLeaveApprovals = useMemo(
    () => (leaveApprovalFilter === 'all'
      ? leaveApprovals
      : leaveApprovals.filter((item) => item.status === leaveApprovalFilter)),
    [leaveApprovalFilter, leaveApprovals],
  )

  const leaveApprovalCounts = useMemo(() => leaveApprovals.reduce(
    (acc, item) => {
      acc[item.status] += 1
      acc.all += 1
      return acc
    },
    { pending: 0, approved: 0, returned: 0, cancelled: 0, all: 0 },
  ), [leaveApprovals])

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

  const closeWarningModal = () => setWarningModal(null)

  const openFutureDateWarning = (dateIso: string, intent: 'select' | 'edit' | 'range') => {
    const actionLabel = intent === 'edit' ? 'edit' : intent === 'range' ? 'use' : 'select'
    setWarningModal({
      title: 'Future Date Not Allowed',
      message: `${formatDateLong(dateIso)} is in the future. You cannot ${actionLabel} future dates in Time Entry.`,
    })
  }

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

    if (isFutureIso(fromDateInput) || isFutureIso(toDateInput)) {
      setDateRangeError('Future dates are not allowed in the selected range.')
      openFutureDateWarning(isFutureIso(toDateInput) ? toDateInput : fromDateInput, 'range')
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
    if (isFutureIso(dayKey)) {
      openFutureDateWarning(dayKey, 'edit')
      return
    }
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
    handleDaySelection(activeRange.days[selectedDayIndex - 1].key)
  }

  const handleNextDate = () => {
    if (selectedDayIndex >= activeRange.days.length - 1) return
    handleDaySelection(activeRange.days[selectedDayIndex + 1].key)
  }

  const handleDaySelection = (dayKey: string) => {
    if (isFutureIso(dayKey)) {
      openFutureDateWarning(dayKey, 'select')
      return false
    }

    setSelectedDayKey(dayKey)
    return true
  }

  const toggleCalendarStatus = (status: TimeEntryStatus) => {
    setCalendarVisibleStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.length === 1 ? prev : prev.filter((value) => value !== status)
      }

      return [...prev, status]
    })
  }

  const handleCalendarCellClick = (iso: string) => {
    const clickedDate = fromIso(iso)
    if (isFutureIso(iso)) {
      openFutureDateWarning(iso, 'select')
      return
    }

    if (!isSameMonth(clickedDate, calendarMonthDate)) {
      setCalendarMonthDate(startOfMonth(clickedDate))
    }

    if (entryMap.has(iso)) {
      handleDaySelection(iso)
    }
  }

  const handleExportTimeHistory = () => {
    const header = ['Week', 'Total Hours', 'Regular Hours', 'Overtime', 'Leave Hours', 'Status', 'Submitted On', 'Approved On']
    const rows = filteredTimeHistoryItems.map((item) => [
      getRangeLabel(item.fromDateISO, item.toDateISO),
      formatHours(item.totalHours),
      formatHours(item.regularHours),
      formatHours(item.overtimeHours),
      formatHours(item.leaveHours),
      timeHistoryStatusLabel[item.status],
      item.submittedOnISO ? formatDateWithYear(item.submittedOnISO) : '-',
      item.approvedOnISO ? formatDateWithYear(item.approvedOnISO) : '-',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'time-history.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const applyHistoryDateFilter = () => {
    setHistoryFilterError('')

    if (!historyFromDateInput || !historyToDateInput) {
      setHistoryFilterError('Select both From and To dates.')
      return
    }

    if (isFutureIso(historyFromDateInput) || isFutureIso(historyToDateInput)) {
      setHistoryFilterError('Future dates are not allowed in Time History filters.')
      openFutureDateWarning(isFutureIso(historyToDateInput) ? historyToDateInput : historyFromDateInput, 'range')
      return
    }

    if (fromIso(historyFromDateInput) > fromIso(historyToDateInput)) {
      setHistoryFilterError('From date cannot be after To date.')
      return
    }

    setAppliedHistoryFromDate(historyFromDateInput)
    setAppliedHistoryToDate(historyToDateInput)
  }

  const applyLeaveHistoryDateFilter = () => {
    setLeaveHistoryError('')

    if (!leaveHistoryFromInput || !leaveHistoryToInput) {
      setLeaveHistoryError('Select both From and To dates.')
      return
    }

    if (isFutureIso(leaveHistoryFromInput) || isFutureIso(leaveHistoryToInput)) {
      setLeaveHistoryError('Future dates are not allowed in Leave History filters.')
      setLeaveWarning({
        title: 'Future Date Not Allowed',
        message: 'Please choose dates up to today for history filters.',
      })
      return
    }

    if (fromIso(leaveHistoryFromInput) > fromIso(leaveHistoryToInput)) {
      setLeaveHistoryError('From date cannot be after To date.')
      return
    }

    setAppliedLeaveHistoryFrom(leaveHistoryFromInput)
    setAppliedLeaveHistoryTo(leaveHistoryToInput)
  }

  const handleSubmitLeaveRequest = () => {
    setLeaveFormError('')
    setLeaveFormSuccess('')

    if (!leaveForm.leaveType || !leaveForm.fromDateISO || !leaveForm.toDateISO) {
      setLeaveFormError('Leave type, from date, and to date are required.')
      return
    }

    if (fromIso(leaveForm.fromDateISO) > fromIso(leaveForm.toDateISO)) {
      setLeaveFormError('From date cannot be after To date.')
      return
    }

    if (fromIso(leaveForm.fromDateISO).getTime() < fromIso(todayIso).getTime()) {
      setLeaveFormError('Past dates are not allowed while applying leave.')
      return
    }

    if (!leaveForm.reason.trim() || leaveForm.reason.trim().length < 5) {
      setLeaveFormError('Reason is required and must be at least 5 characters.')
      return
    }

    if (!leaveForm.handoverTo.trim()) {
      setLeaveFormError('Please provide handover person details.')
      return
    }

    if (!/^\d{10}$/.test(leaveForm.contactDuringLeave.trim())) {
      setLeaveFormError('Contact during leave must be a valid 10-digit number.')
      return
    }

    const leaveDays = countWeekdaysInclusive(leaveForm.fromDateISO, leaveForm.toDateISO)
    if (leaveDays <= 0) {
      setLeaveFormError('Selected range has no working days. Please choose weekdays.')
      return
    }

    const hasOverlap = leaveRequests.some((item) => {
      if (item.status === 'cancelled' || item.status === 'returned') {
        return false
      }

      return doesDateRangeOverlap(
        leaveForm.fromDateISO,
        leaveForm.toDateISO,
        item.fromDateISO,
        item.toDateISO,
      )
    })

    if (hasOverlap) {
      setLeaveFormError('Selected leave dates overlap with an existing pending/approved request.')
      return
    }

    if (leaveDays > leaveAvailableByType[leaveForm.leaveType]) {
      setLeaveFormError(`Insufficient ${leaveTypeLabel[leaveForm.leaveType]} balance for selected dates.`)
      return
    }

    const newRequest: LeaveRequestItem = {
      id: `lv-${Date.now()}`,
      leaveType: leaveForm.leaveType,
      fromDateISO: leaveForm.fromDateISO,
      toDateISO: leaveForm.toDateISO,
      durationDays: leaveDays,
      status: 'pending',
      appliedOnISO: todayIso,
      reason: leaveForm.reason.trim(),
      handoverTo: leaveForm.handoverTo.trim(),
      contactDuringLeave: leaveForm.contactDuringLeave.trim(),
    }

    setLeaveRequests((prev) => [newRequest, ...prev])
    setLeaveFormSuccess('Leave request submitted successfully and sent for approval.')
    setLeaveForm({
      leaveType: 'annual',
      fromDateISO: todayIso,
      toDateISO: todayIso,
      reason: '',
      handoverTo: '',
      contactDuringLeave: '',
    })
    setActiveLeaveTab('My Leave')
  }

  const handleCancelLeaveRequest = (requestId: string) => {
    setLeaveRequests((prev) => prev.map((item) => (
      item.id === requestId && item.status === 'pending'
        ? { ...item, status: 'cancelled' }
        : item
    )))
  }

  const handleLeaveApprovalAction = (id: string, nextStatus: LeaveStatus) => {
    setLeaveApprovals((prev) => prev.map((item) => (
      item.id === id && item.status === 'pending'
        ? { ...item, status: nextStatus }
        : item
    )))
  }

  useEffect(() => {
    if (!expandedApprovalKey && approvalItems.length > 0) {
      setExpandedApprovalKey(approvalItems[0].key)
    }
  }, [approvalItems, expandedApprovalKey])

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

                {isCalendarTab ? (
                  <div className="calendar-toolbar">
                    <div className="calendar-nav-group" aria-label="Calendar navigation">
                      <button type="button" className="calendar-chip-btn" onClick={() => setCalendarMonthDate(startOfMonth(fromIso(activeRange.fromDateISO)))}>
                        Today
                      </button>
                      <button type="button" className="calendar-icon-btn" aria-label="Previous month" onClick={() => setCalendarMonthDate((prev) => addMonths(prev, -1))}>
                        ‹
                      </button>
                      <div className="calendar-month-pill">{formatMonthYear(calendarMonthDate)}</div>
                      <button type="button" className="calendar-icon-btn" aria-label="Next month" onClick={() => setCalendarMonthDate((prev) => addMonths(prev, 1))}>
                        ›
                      </button>
                    </div>

                    <div className="calendar-toolbar-actions">
                      <button
                        type="button"
                        className={`calendar-chip-btn ${isCalendarFiltersOpen ? 'active' : ''}`}
                        onClick={() => setIsCalendarFiltersOpen((prev) => !prev)}
                      >
                        Filters
                      </button>
                      <button type="button" className="btn" onClick={() => openEditModalForDay(selectedDay.key)}>
                        Edit Selected
                      </button>
                      <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
                    </div>

                    {isCalendarFiltersOpen && (
                      <div className="calendar-filter-popover" role="dialog" aria-label="Calendar filters">
                        {(['submitted', 'draft', 'returned', 'none'] as TimeEntryStatus[]).map((status) => (
                          <label key={status} className="calendar-filter-option">
                            <input
                              type="checkbox"
                              checked={calendarVisibleStatuses.includes(status)}
                              onChange={() => toggleCalendarStatus(status)}
                            />
                            <span className={`status-chip ${status}`}>{statusLabel[status] === '-' ? 'No Entry' : statusLabel[status]}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isTimeHistoryTab ? (
                  <div className="history-toolbar">
                    <div className="history-range-group">
                      <span className="history-range-label">Date Range</span>
                      <label className="history-date-pill">
                        <input
                          type="date"
                          value={historyFromDateInput}
                          max={todayIso}
                          onChange={(event) => setHistoryFromDateInput(event.target.value)}
                        />
                      </label>
                      <span className="history-range-sep">-</span>
                      <label className="history-date-pill">
                        <input
                          type="date"
                          value={historyToDateInput}
                          max={todayIso}
                          onChange={(event) => setHistoryToDateInput(event.target.value)}
                        />
                      </label>
                      <button type="button" className="history-ghost-btn" onClick={applyHistoryDateFilter}>
                        Apply
                      </button>
                    </div>

                    <div className="history-toolbar-actions">
                      <button
                        type="button"
                        className={`history-ghost-btn ${isTimeHistoryFiltersOpen ? 'active' : ''}`}
                        onClick={() => setIsTimeHistoryFiltersOpen((prev) => !prev)}
                      >
                        Filter
                      </button>
                      <button type="button" className="history-ghost-btn" onClick={handleExportTimeHistory}>
                        Export
                      </button>
                    </div>

                    {isTimeHistoryFiltersOpen && (
                      <div className="history-filter-popover" role="dialog" aria-label="Time history filters">
                        {(['all', 'approved', 'draft', 'returned'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`history-filter-chip ${historyStatusFilter === status ? 'active' : ''}`}
                            onClick={() => setHistoryStatusFilter(status)}
                          >
                            {status === 'all' ? 'All Statuses' : timeHistoryStatusLabel[status]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isApprovalsTab ? (
                  <div className="approvals-toolbar">
                    <div className="approvals-filter-row" role="tablist" aria-label="Approval filters">
                      {([
                        ['pending', `Pending (${approvalCounts.pending})`],
                        ['approved', 'Approved'],
                        ['returned', 'Returned'],
                        ['all', 'All'],
                      ] as const).map(([status, label]) => (
                        <button
                          key={status}
                          type="button"
                          className={`approval-filter-chip ${approvalFilter === status ? 'active' : ''}`}
                          onClick={() => setApprovalFilter(status)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="approvals-toolbar-actions">
                      <button
                        type="button"
                        className={`approval-toolbar-btn ${isApprovalsFilterOpen ? 'active' : ''}`}
                        onClick={() => setIsApprovalsFilterOpen((prev) => !prev)}
                      >
                        Filter
                      </button>
                    </div>

                    {isApprovalsFilterOpen && (
                      <div className="approval-filter-popover" role="dialog" aria-label="Approvals filters">
                        {(['pending', 'approved', 'returned', 'all'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`approval-filter-chip ${approvalFilter === status ? 'active' : ''}`}
                            onClick={() => {
                              setApprovalFilter(status)
                              setIsApprovalsFilterOpen(false)
                            }}
                          >
                            {status === 'pending'
                              ? `Pending (${approvalCounts.pending})`
                              : status === 'all'
                                ? 'All'
                                : approvalStatusLabel[status]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="time-entry-actions">
                    <label className="date-control">
                      From
                      <input type="date" value={fromDateInput} max={todayIso} onChange={(event) => setFromDateInput(event.target.value)} />
                    </label>
                    <label className="date-control">
                      To
                      <input type="date" value={toDateInput} max={todayIso} onChange={(event) => setToDateInput(event.target.value)} />
                    </label>
                    <button type="button" className="btn" onClick={applyDateRange}>Apply Dates</button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
                  </div>
                )}
              </div>

              {dateRangeError && <p className="submit-error">{dateRangeError}</p>}
              {submitError && <p className="submit-error">{submitError}</p>}
              {isTimeHistoryTab && historyFilterError && <p className="submit-error">{historyFilterError}</p>}

              {isCalendarTab ? (
                <div className="time-calendar-layout">
                  <section className="calendar-surface" aria-label="Monthly time entry calendar">
                    <div className="calendar-week-header">
                      {calendarWeekdays.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>

                    <div className="calendar-grid">
                      {calendarDays.map((cell) => {
                        const status = cell.entry?.status ?? 'none'
                        const statusText = statusLabel[status] === '-' ? 'No Entry' : statusLabel[status]

                        return (
                          <button
                            key={cell.iso}
                            type="button"
                            className={[
                              'calendar-cell',
                              cell.isCurrentMonth ? '' : 'is-outside',
                              cell.isSelected ? 'is-selected' : '',
                              cell.isToday ? 'is-today' : '',
                              cell.isVisible ? '' : 'is-filtered',
                            ].filter(Boolean).join(' ')}
                            onClick={() => handleCalendarCellClick(cell.iso)}
                          >
                            <div className="calendar-cell-head">
                              <span className="calendar-date-number">{cell.date.getDate()}</span>
                              {cell.entry && cell.isVisible ? <i className={`dot ${status}`} /> : null}
                            </div>
                            <div className="calendar-cell-body">
                              {cell.entry && cell.isVisible ? (
                                <>
                                  <span className={`calendar-hours-pill ${status}`}>
                                    {cell.entry.hours > 0 ? `${formatHours(cell.entry.hours)}h` : '0h'}
                                  </span>
                                  <small>{statusText}</small>
                                </>
                              ) : (
                                <small>{cell.isCurrentMonth ? 'No entry' : ''}</small>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  <aside className="calendar-summary-panel" aria-label="Calendar summary">
                    <section className="calendar-summary-card">
                      <h3>Summary</h3>
                      <p className="calendar-summary-month">{formatMonthYear(calendarMonthDate)}</p>
                      <div className="calendar-summary-metrics">
                        <div>
                          <span>Total Hours</span>
                          <strong>{formatHours(visibleMonthTotals.totalHours)} hrs</strong>
                        </div>
                        <div>
                          <span>Regular Hours</span>
                          <strong>{formatHours(visibleMonthTotals.regularHours)} hrs</strong>
                        </div>
                        <div>
                          <span>Overtime</span>
                          <strong>{formatHours(visibleMonthTotals.overtimeHours)} hrs</strong>
                        </div>
                        <div>
                          <span>Leave Hours</span>
                          <strong>{formatHours(leaveHours)} hrs</strong>
                        </div>
                      </div>
                    </section>

                    <section className="calendar-summary-card">
                      <h3>Status Mix</h3>
                      <div className="calendar-status-list">
                        <span><i className="dot submitted" />Submitted <strong>{visibleMonthTotals.submitted}</strong></span>
                        <span><i className="dot draft" />Draft <strong>{visibleMonthTotals.draft}</strong></span>
                        <span><i className="dot returned" />Returned <strong>{visibleMonthTotals.returned}</strong></span>
                        <span><i className="dot none" />No Entry <strong>{visibleMonthTotals.none}</strong></span>
                      </div>
                    </section>

                    <section className="calendar-summary-card">
                      <div className="day-card-head compact">
                        <h4>{formatDateLong(selectedDay.key)}</h4>
                        <button type="button" onClick={() => openEditModalForDay(selectedDay.key)}>Edit</button>
                      </div>
                      <dl className="calendar-detail-list">
                        <div><dt>Status</dt><dd><span className={`status-chip ${selectedDay.status}`}>{statusLabel[selectedDay.status] === '-' ? 'No Entry' : statusLabel[selectedDay.status]}</span></dd></div>
                        <div><dt>Work Location</dt><dd>{selectedDay.workLocation}</dd></div>
                        <div><dt>Start Time</dt><dd>{selectedDay.startTime}</dd></div>
                        <div><dt>End Time</dt><dd>{selectedDay.endTime}</dd></div>
                        <div><dt>Break</dt><dd>{selectedDay.breakDuration}</dd></div>
                        <div><dt>Notes</dt><dd>{selectedDay.notes || 'No notes.'}</dd></div>
                      </dl>
                    </section>
                  </aside>
                </div>
              ) : isTimeHistoryTab ? (
                <div className="time-history-shell">
                  <p className="history-range-note">Showing history for {appliedHistoryRangeLabel}</p>
                  <section className="time-history-card" aria-label="Time history table">
                    <table className="time-history-table">
                      <thead>
                        <tr>
                          <th>Week</th>
                          <th>Total Hours</th>
                          <th>Regular Hours</th>
                          <th>Overtime</th>
                          <th>Leave Hours</th>
                          <th>Status</th>
                          <th>Submitted On</th>
                          <th>Approved On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTimeHistoryItems.map((item) => (
                          <tr key={item.key}>
                            <td>{getRangeLabel(item.fromDateISO, item.toDateISO)}</td>
                            <td>{formatHours(item.totalHours)}</td>
                            <td>{formatHours(item.regularHours)}</td>
                            <td>{formatHours(item.overtimeHours)}</td>
                            <td>{formatHours(item.leaveHours)}</td>
                            <td>
                              <span className={`history-status-chip ${item.status}`}>
                                {timeHistoryStatusLabel[item.status]}
                              </span>
                            </td>
                            <td>{item.submittedOnISO ? formatDateWithYear(item.submittedOnISO) : '-'}</td>
                            <td>{item.approvedOnISO ? formatDateWithYear(item.approvedOnISO) : '-'}</td>
                          </tr>
                        ))}
                        {filteredTimeHistoryItems.length === 0 && (
                          <tr>
                            <td colSpan={8} className="history-empty-row">No time history found for the current filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </div>
              ) : isApprovalsTab ? (
                <div className="approvals-shell">
                  {filteredApprovalItems.map((item) => {
                    const isExpanded = expandedApprovalKey === item.key

                    return (
                      <section key={item.key} className="approval-card" aria-label={`Approval item ${item.employeeName}`}>
                        <div className="approval-card-head">
                          <div className="approval-employee">
                            <div className="approval-avatar">JD</div>
                            <div>
                              <h4>{item.employeeName}</h4>
                              <p>{item.employeeRole}</p>
                            </div>
                          </div>

                          <div className="approval-summary-grid">
                            <div>
                              <span>Week</span>
                              <strong>{getRangeLabel(item.fromDateISO, item.toDateISO)}</strong>
                            </div>
                            <div>
                              <span>Total Hours</span>
                              <strong>{formatHours(item.totalHours)}</strong>
                            </div>
                            <div>
                              <span>Submitted On</span>
                              <strong>{formatDateWithYear(item.submittedOnISO)}</strong>
                            </div>
                            <div>
                              <span>Status</span>
                              <strong><span className={`approval-status-pill ${item.status}`}>{approvalStatusLabel[item.status]}</span></strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="approval-toggle-btn"
                            onClick={() => setExpandedApprovalKey((prev) => (prev === item.key ? null : item.key))}
                            aria-label={isExpanded ? 'Collapse approval details' : 'Expand approval details'}
                          >
                            {isExpanded ? '⌃' : '⌄'}
                          </button>
                        </div>

                        {isExpanded && (
                          <>
                            <div className="approval-detail-table-wrap">
                              <table className="approval-detail-table">
                                <thead>
                                  <tr>
                                    <th>Day</th>
                                    {item.details.map((day) => (
                                      <th key={day.key}>
                                        <span>{day.label}</span>
                                        <small>{day.dateLabel}</small>
                                      </th>
                                    ))}
                                    <th>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>Hours</td>
                                    {item.details.map((day) => <td key={`hours-${day.key}`}>{formatHours(day.hours)}</td>)}
                                    <td>{formatHours(item.totalHours)}</td>
                                  </tr>
                                  <tr>
                                    <td>Regular Hours</td>
                                    {item.details.map((day) => <td key={`regular-${day.key}`}>{formatHours(day.regularHours)}</td>)}
                                    <td>{formatHours(item.regularHours)}</td>
                                  </tr>
                                  <tr>
                                    <td>Overtime</td>
                                    {item.details.map((day) => <td key={`ot-${day.key}`}>{formatHours(day.overtimeHours)}</td>)}
                                    <td>{formatHours(item.overtimeHours)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </section>
                    )
                  })}

                  {filteredApprovalItems.length === 0 && (
                    <section className="approval-card approval-empty-card">
                      <p>No approvals found for the selected filter.</p>
                    </section>
                  )}
                </div>
              ) : (
                <>
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
                                onClick={() => handleDaySelection(day.key)}
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
                </>
              )}

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

              {warningModal && (
                <div className="time-modal-backdrop" role="presentation" onClick={closeWarningModal}>
                  <div
                    className="time-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Time entry warning"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3>{warningModal.title}</h3>
                    <p className="time-confirm-message">{warningModal.message}</p>
                    <div className="time-modal-actions">
                      <button type="button" className="btn btn-primary" onClick={closeWarningModal}>OK</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : currentModule === 'leave' ? (
            <div className="leave-shell">
              <div className="leave-top">
                <div className="leave-tabs" role="tablist" aria-label="Leave tabs">
                  {leaveTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`leave-tab ${activeLeaveTab === tab ? 'active' : ''}`}
                      onClick={() => {
                        setActiveLeaveTab(tab)
                        setLeaveFormError('')
                        setLeaveFormSuccess('')
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeLeaveTab === 'Leave History' && (
                  <div className="leave-history-toolbar">
                    <div className="leave-history-range-group">
                      <span className="leave-history-range-label">Date Range</span>
                      <label className="leave-date-pill">
                        <input
                          type="date"
                          value={leaveHistoryFromInput}
                          max={todayIso}
                          onChange={(event) => setLeaveHistoryFromInput(event.target.value)}
                        />
                      </label>
                      <span className="leave-range-sep">-</span>
                      <label className="leave-date-pill">
                        <input
                          type="date"
                          value={leaveHistoryToInput}
                          max={todayIso}
                          onChange={(event) => setLeaveHistoryToInput(event.target.value)}
                        />
                      </label>
                      <button type="button" className="leave-ghost-btn" onClick={applyLeaveHistoryDateFilter}>
                        Apply
                      </button>
                    </div>

                    <div className="leave-filter-row" role="tablist" aria-label="Leave history filters">
                      {(['all', 'pending', 'approved', 'returned', 'cancelled'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`leave-filter-chip ${leaveHistoryStatusFilter === status ? 'active' : ''}`}
                          onClick={() => setLeaveHistoryStatusFilter(status)}
                        >
                          {status === 'all' ? 'All Statuses' : leaveStatusLabel[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {leaveHistoryError && activeLeaveTab === 'Leave History' && <p className="submit-error">{leaveHistoryError}</p>}
              {leaveFormError && activeLeaveTab === 'Apply Leave' && <p className="submit-error">{leaveFormError}</p>}
              {leaveFormSuccess && activeLeaveTab === 'Apply Leave' && <p className="submit-success">{leaveFormSuccess}</p>}

              {activeLeaveTab === 'My Leave' ? (
                <div className="leave-my-shell">
                  <div className="leave-kpi-grid">
                    <section className="leave-kpi-card">
                      <span>Upcoming Leaves</span>
                      <strong>{leaveSummary.upcoming}</strong>
                    </section>
                    <section className="leave-kpi-card">
                      <span>Pending</span>
                      <strong>{leaveSummary.pending}</strong>
                    </section>
                    <section className="leave-kpi-card">
                      <span>Approved</span>
                      <strong>{leaveSummary.approved}</strong>
                    </section>
                    <section className="leave-kpi-card">
                      <span>Returned / Cancelled</span>
                      <strong>{leaveSummary.returned + leaveSummary.cancelled}</strong>
                    </section>
                  </div>

                  <section className="leave-card" aria-label="My leave requests">
                    <div className="leave-card-head">
                      <h3>My Leave Requests</h3>
                      <button type="button" className="btn" onClick={() => setActiveLeaveTab('Apply Leave')}>
                        Apply Leave
                      </button>
                    </div>

                    <div className="leave-request-list">
                      {leaveRequests.slice().sort((left, right) => fromIso(right.fromDateISO).getTime() - fromIso(left.fromDateISO).getTime()).map((item) => (
                        <article key={item.id} className="leave-request-item">
                          <div className="leave-request-main">
                            <h4>{leaveTypeLabel[item.leaveType]}</h4>
                            <p>{getRangeLabel(item.fromDateISO, item.toDateISO)} · {item.durationDays} day(s)</p>
                            <small>Applied on {formatDateWithYear(item.appliedOnISO)}</small>
                          </div>
                          <div className="leave-request-side">
                            <span className={`leave-status-pill ${item.status}`}>{leaveStatusLabel[item.status]}</span>
                            {item.status === 'pending' && fromIso(item.fromDateISO).getTime() >= fromIso(todayIso).getTime() && (
                              <button type="button" className="leave-ghost-btn" onClick={() => handleCancelLeaveRequest(item.id)}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : activeLeaveTab === 'Apply Leave' ? (
                <div className="leave-apply-shell">
                  <section className="leave-card leave-form-card">
                    <h3>Apply for Leave</h3>
                    <div className="leave-form-grid">
                      <label>
                        Leave Type
                        <select
                          value={leaveForm.leaveType}
                          onChange={(event) => setLeaveForm((prev) => ({ ...prev, leaveType: event.target.value as LeaveTypeId }))}
                        >
                          {(Object.keys(leaveTypeLabel) as LeaveTypeId[]).map((typeId) => (
                            <option key={typeId} value={typeId}>
                              {leaveTypeLabel[typeId]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        From Date
                        <input
                          type="date"
                          value={leaveForm.fromDateISO}
                          min={todayIso}
                          onChange={(event) => setLeaveForm((prev) => ({ ...prev, fromDateISO: event.target.value }))}
                        />
                      </label>
                      <label>
                        To Date
                        <input
                          type="date"
                          value={leaveForm.toDateISO}
                          min={leaveForm.fromDateISO || todayIso}
                          onChange={(event) => setLeaveForm((prev) => ({ ...prev, toDateISO: event.target.value }))}
                        />
                      </label>
                      <label>
                        Handover To
                        <input
                          type="text"
                          value={leaveForm.handoverTo}
                          onChange={(event) => setLeaveForm((prev) => ({ ...prev, handoverTo: event.target.value }))}
                          placeholder="e.g. Jane Smith"
                        />
                      </label>
                      <label>
                        Contact During Leave
                        <input
                          type="tel"
                          value={leaveForm.contactDuringLeave}
                          onChange={(event) => setLeaveForm((prev) => ({ ...prev, contactDuringLeave: event.target.value }))}
                          placeholder="10-digit mobile"
                        />
                      </label>
                      <label className="full">
                        Reason
                        <textarea
                          rows={4}
                          value={leaveForm.reason}
                          onChange={(event) => setLeaveForm((prev) => ({ ...prev, reason: event.target.value }))}
                          placeholder="Provide the reason for leave"
                        />
                      </label>
                    </div>

                    <div className="leave-form-foot">
                      <div className="leave-form-meta">
                        <p>Requested Working Days: <strong>{Math.max(0, leaveRequestedDaysPreview)}</strong></p>
                        <p>Available {leaveTypeLabel[leaveForm.leaveType]}: <strong>{leaveAvailableByType[leaveForm.leaveType]}</strong></p>
                      </div>
                      <button type="button" className="btn btn-primary" onClick={handleSubmitLeaveRequest}>
                        Submit Leave Request
                      </button>
                    </div>
                  </section>
                </div>
              ) : activeLeaveTab === 'Leave Balance' ? (
                <div className="leave-balance-shell">
                  <div className="leave-balance-grid">
                    {leaveBalances.map((item) => {
                      const consumed = item.used + item.pending
                      const ratio = item.entitlement > 0 ? Math.min(100, Math.round((consumed / item.entitlement) * 100)) : 0
                      const available = Math.max(0, item.entitlement - consumed)

                      return (
                        <section key={item.id} className="leave-balance-card">
                          <h4>{item.name}</h4>
                          <p>{leaveTypeDescriptions[item.id]}</p>
                          <div className="leave-balance-nums">
                            <span>Entitlement: <strong>{item.entitlement}</strong></span>
                            <span>Used: <strong>{item.used}</strong></span>
                            <span>Pending: <strong>{item.pending}</strong></span>
                            <span>Available: <strong>{available}</strong></span>
                          </div>
                          <div className="leave-balance-progress">
                            <div style={{ width: `${ratio}%`, backgroundColor: item.color }} />
                          </div>
                        </section>
                      )
                    })}
                  </div>
                </div>
              ) : activeLeaveTab === 'Leave History' ? (
                <div className="leave-history-shell">
                  <p className="leave-history-note">Showing leave history for {appliedLeaveHistoryRangeLabel}</p>
                  <section className="leave-card">
                    <table className="leave-history-table">
                      <thead>
                        <tr>
                          <th>Applied On</th>
                          <th>Leave Type</th>
                          <th>Date Range</th>
                          <th>Days</th>
                          <th>Status</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaveHistory.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDateWithYear(item.appliedOnISO)}</td>
                            <td>{leaveTypeLabel[item.leaveType]}</td>
                            <td>{getRangeLabel(item.fromDateISO, item.toDateISO)}</td>
                            <td>{item.durationDays}</td>
                            <td><span className={`leave-status-pill ${item.status}`}>{leaveStatusLabel[item.status]}</span></td>
                            <td>{item.reason}</td>
                          </tr>
                        ))}
                        {filteredLeaveHistory.length === 0 && (
                          <tr>
                            <td colSpan={6} className="history-empty-row">No leave requests found for the selected filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </div>
              ) : (
                <div className="leave-approvals-shell">
                  <div className="leave-approvals-filter-row" role="tablist" aria-label="Leave approvals filters">
                    {([
                      ['pending', `Pending (${leaveApprovalCounts.pending})`],
                      ['approved', `Approved (${leaveApprovalCounts.approved})`],
                      ['returned', `Returned (${leaveApprovalCounts.returned})`],
                      ['all', `All (${leaveApprovalCounts.all})`],
                    ] as const).map(([status, label]) => (
                      <button
                        key={status}
                        type="button"
                        className={`leave-filter-chip ${leaveApprovalFilter === status ? 'active' : ''}`}
                        onClick={() => setLeaveApprovalFilter(status)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="leave-approval-list">
                    {filteredLeaveApprovals.map((item) => (
                      <article key={item.id} className="leave-approval-card">
                        <div className="leave-approval-main">
                          <h4>{item.employeeName}</h4>
                          <p>{item.employeeRole}</p>
                          <small>{leaveTypeLabel[item.leaveType]} · {getRangeLabel(item.fromDateISO, item.toDateISO)} · {item.durationDays} day(s)</small>
                        </div>
                        <div className="leave-approval-side">
                          <span className={`leave-status-pill ${item.status}`}>{leaveStatusLabel[item.status]}</span>
                          {item.status === 'pending' && (
                            <div className="leave-approval-actions">
                              <button type="button" className="btn btn-primary" onClick={() => handleLeaveApprovalAction(item.id, 'approved')}>
                                Approve
                              </button>
                              <button type="button" className="btn" onClick={() => handleLeaveApprovalAction(item.id, 'returned')}>
                                Return
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}

                    {filteredLeaveApprovals.length === 0 && (
                      <section className="leave-card approval-empty-card">
                        <p>No leave approvals found for the selected filter.</p>
                      </section>
                    )}
                  </div>
                </div>
              )}

              {leaveWarning && (
                <div className="time-modal-backdrop" role="presentation" onClick={() => setLeaveWarning(null)}>
                  <div
                    className="time-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Leave warning"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3>{leaveWarning.title}</h3>
                    <p className="time-confirm-message">{leaveWarning.message}</p>
                    <div className="time-modal-actions">
                      <button type="button" className="btn btn-primary" onClick={() => setLeaveWarning(null)}>OK</button>
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
