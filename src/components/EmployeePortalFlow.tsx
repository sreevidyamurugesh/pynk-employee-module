import { useEffect, useMemo, useRef, useState } from 'react'

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
const myPayTabs = ['Overview', 'Payslips', 'Salary Breakdown', 'Tax Documents', 'Bank Details', 'Payment History'] as const
type MyPayTab = (typeof myPayTabs)[number]

const documentTabs = ['My Documents', 'Employment Documents', 'Payroll Documents', 'Tax Documents', 'Uploaded Documents', 'Expiring Documents'] as const
type DocumentTab = (typeof documentTabs)[number]

// ── Documents Types ──
interface PortalDocument {
  id: string
  name: string
  description?: string
  issuedOn?: string
  monthYear?: string
  financialYear?: string
  uploadedOn?: string
  status: 'Available' | 'Pending Verification' | 'Verified'
  size: string
  category?: string
  verifiedOn?: string
}


// ── My Pay Types ──
interface Payslip {
  id: string
  month: string
  payDate: string
  grossSalary: number
  netSalary: number
  status: 'Paid' | 'Pending' | 'Processing'
}

interface SalaryEarning {
  label: string
  amount: number
  color: string
}

interface SalaryDeduction {
  label: string
  amount: number
  color: string
}

interface TaxDocument {
  id: string
  name: string
  financialYear: string
  description: string
}

interface BankDetails {
  bankName: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  verified: boolean
}

interface BankUpdateForm {
  bankName: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  reason: string
}

interface PaymentHistoryItem {
  id: string
  month: string
  payDate: string
  grossSalary: number
  netSalary: number
  paymentMode: string
  transactionId: string
  status: 'Credited' | 'Pending' | 'Failed'
}

// ── My Pay Seed Data ──
const payslipSeedData: Payslip[] = [
  { id: 'ps-001', month: 'June 2025', payDate: '30 Jun 2025', grossSalary: 98500, netSalary: 68750, status: 'Paid' },
  { id: 'ps-002', month: 'May 2025', payDate: '31 May 2025', grossSalary: 98500, netSalary: 68750, status: 'Paid' },
  { id: 'ps-003', month: 'April 2025', payDate: '30 Apr 2025', grossSalary: 98500, netSalary: 68750, status: 'Paid' },
  { id: 'ps-004', month: 'March 2025', payDate: '31 Mar 2025', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-005', month: 'February 2025', payDate: '28 Feb 2025', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-006', month: 'January 2025', payDate: '31 Jan 2025', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-007', month: 'December 2024', payDate: '31 Dec 2024', grossSalary: 95000, netSalary: 66300, status: 'Paid' },
  { id: 'ps-008', month: 'November 2024', payDate: '30 Nov 2024', grossSalary: 92000, netSalary: 64100, status: 'Paid' },
  { id: 'ps-009', month: 'October 2024', payDate: '31 Oct 2024', grossSalary: 92000, netSalary: 64100, status: 'Paid' },
  { id: 'ps-010', month: 'September 2024', payDate: '30 Sep 2024', grossSalary: 92000, netSalary: 64100, status: 'Paid' },
  { id: 'ps-011', month: 'August 2024', payDate: '31 Aug 2024', grossSalary: 90000, netSalary: 62500, status: 'Paid' },
  { id: 'ps-012', month: 'July 2024', payDate: '31 Jul 2024', grossSalary: 90000, netSalary: 62500, status: 'Paid' },
]

const salaryEarnings: SalaryEarning[] = [
  { label: 'Basic Salary', amount: 45000, color: '#5a7dff' },
  { label: 'House Rent Allowance (HRA)', amount: 18000, color: '#8f63ff' },
  { label: 'Special Allowance', amount: 15000, color: '#f48e3f' },
  { label: 'Conveyance Allowance', amount: 3200, color: '#f4723f' },
  { label: 'Performance Bonus', amount: 5000, color: '#48b36a' },
  { label: 'Employer PF Contribution', amount: 7500, color: '#56c2d6' },
]

const salaryDeductions: SalaryDeduction[] = [
  { label: 'Employee PF Contribution', amount: 4000, color: '#8f63ff' },
  { label: 'Professional Tax', amount: 200, color: '#f48e3f' },
  { label: 'Income Tax (TDS)', amount: 9000, color: '#f4b03f' },
  { label: 'Health Insurance', amount: 1500, color: '#e74c3c' },
  { label: 'Other Deductions', amount: 15050, color: '#5a4fbf' },
]

const taxDocumentSeedData: TaxDocument[] = [
  { id: 'td-001', name: 'Form 16', financialYear: '2024-25', description: 'Annual tax statement as per income tax act.' },
  { id: 'td-002', name: 'Tax Certificate', financialYear: '2024-25', description: 'Certificate for tax deducted at source.' },
  { id: 'td-003', name: 'Annual Income Statement', financialYear: '2024-25', description: 'Summary of your income for the year.' },
  { id: 'td-004', name: 'Investment Proof Declaration', financialYear: '2024-25', description: 'Proof of your declared investments.' },
]

const bankDetailsSeed: BankDetails = {
  bankName: 'HDFC Bank Limited',
  accountNumber: 'XXXX XXXX 4589',
  ifscCode: 'HDFC0001234',
  accountHolderName: 'John Doe',
  verified: true,
}

const paymentHistorySeed: PaymentHistoryItem[] = [
  { id: 'ph-001', month: 'June 2025', payDate: '30 Jun 2025', grossSalary: 98500, netSalary: 68750, paymentMode: 'NEFT', transactionId: 'NEFT202506300001', status: 'Credited' },
  { id: 'ph-002', month: 'May 2025', payDate: '31 May 2025', grossSalary: 98500, netSalary: 68750, paymentMode: 'NEFT', transactionId: 'NEFT202505310001', status: 'Credited' },
  { id: 'ph-003', month: 'April 2025', payDate: '30 Apr 2025', grossSalary: 98500, netSalary: 68750, paymentMode: 'NEFT', transactionId: 'NEFT202504300001', status: 'Credited' },
  { id: 'ph-004', month: 'March 2025', payDate: '31 Mar 2025', grossSalary: 95000, netSalary: 66300, paymentMode: 'NEFT', transactionId: 'NEFT202503310001', status: 'Credited' },
  { id: 'ph-005', month: 'February 2025', payDate: '28 Feb 2025', grossSalary: 95000, netSalary: 66300, paymentMode: 'NEFT', transactionId: 'NEFT202502280001', status: 'Credited' },
  { id: 'ph-006', month: 'January 2025', payDate: '31 Jan 2025', grossSalary: 95000, netSalary: 66300, paymentMode: 'NEFT', transactionId: 'NEFT202501310001', status: 'Credited' },
]

// ── Documents Seed Data ──
const employmentDocsSeed: PortalDocument[] = [
  { id: 'ed-001', name: 'Offer Letter', description: 'Your offer letter at the time of joining', issuedOn: '12 Jun 2023', status: 'Available', size: '245 KB' },
  { id: 'ed-002', name: 'Employment Contract', description: 'Employment agreement and terms', issuedOn: '01 Apr 2023', status: 'Available', size: '1.2 MB' },
  { id: 'ed-003', name: 'Appointment Letter', description: 'Your appointment confirmation letter', issuedOn: '12 Jun 2023', status: 'Available', size: '300 KB' },
  { id: 'ed-004', name: 'Promotion Letter', description: 'Promotion to Senior Product Designer', issuedOn: '15 Jan 2025', status: 'Available', size: '210 KB' },
  { id: 'ed-005', name: 'Experience Letter', description: 'Experience letter for previous employment', issuedOn: '20 Dec 2024', status: 'Available', size: '150 KB' },
]

const payrollDocsSeed: PortalDocument[] = [
  { id: 'pd-001', name: 'Payslip - June 2025', description: 'Monthly salary payslip', monthYear: 'June 2025', status: 'Available', size: '230 KB' },
  { id: 'pd-002', name: 'Payslip - May 2025', description: 'Monthly salary payslip', monthYear: 'May 2025', status: 'Available', size: '230 KB' },
  { id: 'pd-003', name: 'Payslip - April 2025', description: 'Monthly salary payslip', monthYear: 'April 2025', status: 'Available', size: '230 KB' },
  { id: 'pd-004', name: 'Salary Certificate', description: 'Certificate for loan / visa purposes', monthYear: 'FY 2024-25', status: 'Available', size: '400 KB' },
  { id: 'pd-005', name: 'Payroll Summary', description: 'Annual payroll summary', monthYear: 'FY 2024-25', status: 'Available', size: '800 KB' },
  { id: 'pd-006', name: 'Bonus Letter', description: 'Annual performance bonus letter', monthYear: 'FY 2024-25', status: 'Available', size: '180 KB' },
]

const taxDocsSeed: PortalDocument[] = [
  { id: 'td-001', name: 'Form 16', description: 'Annual tax statement', financialYear: '2024-25', status: 'Available', size: '1.1 MB' },
  { id: 'td-002', name: 'Tax Certificate', description: 'Certificate for tax deducted at source', financialYear: '2024-25', status: 'Available', size: '350 KB' },
  { id: 'td-003', name: 'Annual Income Statement', description: 'Summary of your income for the year', financialYear: '2024-25', status: 'Available', size: '500 KB' },
  { id: 'td-004', name: 'Investment Declaration', description: 'Proof of your declared investments', financialYear: '2024-25', status: 'Available', size: '2.5 MB' },
]

const uploadedDocsSeed: PortalDocument[] = [
  { id: 'ud-001', name: 'Passport', category: 'Identity Proof', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '450 KB' },
  { id: 'ud-002', name: 'Visa', category: 'Work Authorization', uploadedOn: '05 Jan 2025', status: 'Pending Verification', verifiedOn: '-', size: '1.5 MB' },
  { id: 'ud-003', name: 'Aadhaar Card', category: 'Identity Proof', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '300 KB' },
  { id: 'ud-004', name: 'PAN Card', category: 'Tax Document', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '250 KB' },
  { id: 'ud-005', name: 'Bank Proof', category: 'Bank Details', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '180 KB' },
  { id: 'ud-006', name: 'Degree Certificate', category: 'Qualification', uploadedOn: '10 Jan 2025', status: 'Verified', verifiedOn: '11 Jan 2025', size: '800 KB' },
]


const formatCurrency = (amount: number) =>
  `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const maskAccountNumber = (num: string) => num

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
  const [activePayTab, setActivePayTab] = useState<MyPayTab>('Overview')

  // Documents state
  const [activeDocTab, setActiveDocTab] = useState<DocumentTab>('My Documents')
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [docCurrentPage, setDocCurrentPage] = useState(1)
  const [taxYearFilter, setTaxYearFilter] = useState('2024-25')
  const [docStatusFilter, setDocStatusFilter] = useState('All')

  const [uploadedDocsState, setUploadedDocsState] = useState<PortalDocument[]>(uploadedDocsSeed)
  const [isDocUploadModalOpen, setIsDocUploadModalOpen] = useState(false)
  const [docUploadName, setDocUploadName] = useState('')
  const [docUploadCategory, setDocUploadCategory] = useState('')
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null)
  const [docUploadError, setDocUploadError] = useState('')

  const [docPreview, setDocPreview] = useState<PortalDocument | null>(null)
  const [docNotification, setDocNotification] = useState<string | null>(null)

  const DOCS_PER_PAGE = 5

  const handleDownloadDoc = (doc: PortalDocument) => {
    setDocNotification(`Downloading ${doc.name}...`)
    setTimeout(() => setDocNotification(null), 3000)
  }

  // My Pay state
  const [payslipYear, setPayslipYear] = useState('2025')
  const [payslipSearchMonth, setPayslipSearchMonth] = useState('')
  const [payslipPage, setPayslipPage] = useState(1)
  const [selectedPayslipForView, setSelectedPayslipForView] = useState<Payslip | null>(null)
  const [salaryBreakdownMonth, setSalaryBreakdownMonth] = useState('June 2025')
  const [bankUpdateModalOpen, setBankUpdateModalOpen] = useState(false)
  const [bankUpdateForm, setBankUpdateForm] = useState<BankUpdateForm>({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    reason: '',
  })
  const [bankUpdateError, setBankUpdateError] = useState('')
  const [bankUpdateSuccess, setBankUpdateSuccess] = useState(false)
  const [bankUpdateRequestSent, setBankUpdateRequestSent] = useState(false)
  const [payHistoryStatusFilter, setPayHistoryStatusFilter] = useState<'All' | 'Credited' | 'Pending' | 'Failed'>('All')
  const payTabRef = useRef<HTMLDivElement>(null)
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
          ) : currentModule === 'my-pay' ? (
            <div className="pay-shell">
              {/* Pay Tab Navigation */}
              <div className="pay-top" ref={payTabRef}>
                <div className="pay-tabs" role="tablist" aria-label="My Pay tabs">
                  {myPayTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`pay-tab ${activePayTab === tab ? 'active' : ''}`}
                      onClick={() => setActivePayTab(tab)}
                      role="tab"
                      aria-selected={activePayTab === tab}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── OVERVIEW TAB ── */}
              {activePayTab === 'Overview' && (() => {
                const ytdGross = payslipSeedData.filter(p => p.status === 'Paid').reduce((s, p) => s + p.grossSalary, 0)
                const ytdNet = payslipSeedData.filter(p => p.status === 'Paid').reduce((s, p) => s + p.netSalary, 0)
                const ytdTax = salaryDeductions.find(d => d.label === 'Income Tax (TDS)')?.amount ?? 0
                const ytdDeductions = salaryDeductions.reduce((s, d) => s + d.amount, 0)
                const recentPayslips = payslipSeedData.slice(0, 3)
                return (
                  <div className="pay-overview-grid">
                    {/* Current Month Card */}
                    <section className="pay-card pay-current-month" aria-label="Current month salary">
                      <div className="pay-card-label">Current Month <span className="pay-month-badge">(June 2025)</span></div>
                      <div className="pay-net-row">
                        <div>
                          <div className="pay-net-label">Net Salary</div>
                          <div className="pay-net-amount">{formatCurrency(68750)}</div>
                        </div>
                        <span className="pay-status-chip paid">Paid</span>
                      </div>
                      <div className="pay-meta-row">
                        <div><span>Gross Salary</span><strong>{formatCurrency(98500)}</strong></div>
                        <div><span>Pay Date</span><strong>30 Jun 2025</strong></div>
                        <div><span>Next Payday</span><strong>31 Jul 2025</strong></div>
                      </div>
                    </section>

                    {/* Quick Actions Card */}
                    <section className="pay-card pay-quick-actions" aria-label="Quick actions">
                      <div className="pay-card-label">Quick Actions</div>
                      <div className="pay-actions-list">
                        <button type="button" className="pay-action-btn" onClick={() => {
                          setSelectedPayslipForView(payslipSeedData[0])
                          setActivePayTab('Payslips')
                        }}>
                          <span className="pay-action-icon">📄</span>
                          <span>View Payslip</span>
                        </button>
                        <button type="button" className="pay-action-btn" onClick={() => setActivePayTab('Payslips')}>
                          <span className="pay-action-icon">⬇️</span>
                          <span>Download Payslip</span>
                        </button>
                        <button type="button" className="pay-action-btn" onClick={() => setActivePayTab('Salary Breakdown')}>
                          <span className="pay-action-icon">📊</span>
                          <span>View Salary Breakdown</span>
                        </button>
                      </div>
                    </section>

                    {/* Employment Details Card */}
                    <section className="pay-card pay-emp-details" aria-label="Employment details">
                      <div className="pay-card-label">Employment Details</div>
                      <dl className="pay-emp-dl">
                        <div><dt>Employment Country</dt><dd>🇮🇳 India</dd></div>
                        <div><dt>Payroll Entity</dt><dd>Pynk India Pvt Ltd</dd></div>
                        <div><dt>Payroll Cycle</dt><dd>Monthly</dd></div>
                        <div><dt>Next Payday</dt><dd>31 Jul 2025</dd></div>
                      </dl>
                    </section>

                    {/* Year To Date Card */}
                    <section className="pay-card pay-ytd" aria-label="Year to date">
                      <div className="pay-card-label">Year To Date <span className="pay-fy-label">(FY 2025-26)</span></div>
                      <div className="pay-ytd-grid">
                        <div className="pay-ytd-item">
                          <span>Gross Earnings</span>
                          <strong className="pay-ytd-gross">{formatCurrency(ytdGross)}</strong>
                        </div>
                        <div className="pay-ytd-item">
                          <span>Net Earnings</span>
                          <strong className="pay-ytd-net">{formatCurrency(ytdNet)}</strong>
                        </div>
                        <div className="pay-ytd-item">
                          <span>Total Tax</span>
                          <strong className="pay-ytd-tax">{formatCurrency(ytdTax * 12)}</strong>
                        </div>
                        <div className="pay-ytd-item">
                          <span>Total Deductions</span>
                          <strong>{formatCurrency(ytdDeductions * 12)}</strong>
                        </div>
                      </div>
                      <button type="button" className="pay-view-link" onClick={() => setActivePayTab('Payment History')}>
                        View full Year To Date details →
                      </button>
                    </section>

                    {/* Recent Payslips Card */}
                    <section className="pay-card pay-recent" aria-label="Recent payslips">
                      <div className="pay-card-label">Recent Payslips</div>
                      <div className="pay-recent-list">
                        {recentPayslips.map((ps) => (
                          <div key={ps.id} className="pay-recent-row">
                            <span className="pay-recent-month">{ps.month}</span>
                            <span className="pay-recent-date">{ps.payDate}</span>
                            <span className={`pay-status-chip ${ps.status.toLowerCase()}`}>{ps.status}</span>
                            <button type="button" className="pay-view-link" onClick={() => {
                              setSelectedPayslipForView(ps)
                              setActivePayTab('Payslips')
                            }}>View</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="pay-view-link" onClick={() => setActivePayTab('Payslips')}>
                        View all payslips →
                      </button>
                    </section>
                  </div>
                )
              })()}

              {/* ── PAYSLIPS TAB ── */}
              {activePayTab === 'Payslips' && (() => {
                const years = [...new Set(payslipSeedData.map(p => p.month.split(' ')[1]))]
                const ITEMS_PER_PAGE = 6
                const filtered = payslipSeedData.filter(p => {
                  const yearMatch = p.month.includes(payslipYear)
                  const monthMatch = payslipSearchMonth === '' || p.month.toLowerCase().includes(payslipSearchMonth.toLowerCase())
                  return yearMatch && monthMatch
                })
                const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
                const safePage = Math.min(payslipPage, totalPages)
                const pageItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

                return (
                  <div className="pay-payslips-shell">
                    {/* Filters */}
                    <div className="pay-payslips-filters">
                      <label className="pay-filter-group">
                        <span>Year</span>
                        <select
                          id="payslip-year-select"
                          value={payslipYear}
                          onChange={e => { setPayslipYear(e.target.value); setPayslipPage(1) }}
                        >
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </label>
                      <label className="pay-filter-group">
                        <span>Search by month</span>
                        <div className="pay-search-input">
                          <input
                            id="payslip-month-search"
                            type="text"
                            placeholder="e.g. June"
                            value={payslipSearchMonth}
                            onChange={e => { setPayslipSearchMonth(e.target.value); setPayslipPage(1) }}
                          />
                          <span className="pay-search-icon">📅</span>
                        </div>
                      </label>
                    </div>

                    {/* Table */}
                    <section className="pay-table-card" aria-label="Payslips table">
                      <div className="pay-table-wrap">
                        <table className="pay-table">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Pay Date</th>
                              <th>Gross Salary</th>
                              <th>Net Salary</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.map(ps => (
                              <tr key={ps.id}>
                                <td>{ps.month}</td>
                                <td>{ps.payDate}</td>
                                <td>{formatCurrency(ps.grossSalary)}</td>
                                <td>{formatCurrency(ps.netSalary)}</td>
                                <td><span className={`pay-status-chip ${ps.status.toLowerCase()}`}>{ps.status}</span></td>
                                <td>
                                  <div className="pay-table-actions">
                                    <button type="button" className="pay-action-link" onClick={() => setSelectedPayslipForView(ps)}>
                                      👁️ View
                                    </button>
                                    <button type="button" className="pay-action-link" onClick={() => {
                                      const csv = `Month,Pay Date,Gross Salary,Net Salary,Status\n${ps.month},${ps.payDate},${ps.grossSalary},${ps.netSalary},${ps.status}`
                                      const blob = new Blob([csv], { type: 'text/csv' })
                                      const url = URL.createObjectURL(blob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `payslip-${ps.month.replace(' ', '-')}.csv`
                                      a.click()
                                      URL.revokeObjectURL(url)
                                    }}>
                                      ⬇️ Download
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {pageItems.length === 0 && (
                              <tr><td colSpan={6} className="pay-empty-row">No payslips found for the selected filters.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="pay-pagination">
                        <span className="pay-pagination-info">Showing {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, filtered.length)} to {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} payslips</span>
                        <div className="pay-pagination-controls">
                          <button type="button" className="pay-page-btn" disabled={safePage === 1} onClick={() => setPayslipPage(p => Math.max(1, p - 1))}>‹</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                            <button
                              key={pg}
                              type="button"
                              className={`pay-page-btn ${safePage === pg ? 'active' : ''}`}
                              onClick={() => setPayslipPage(pg)}
                            >{pg}</button>
                          ))}
                          <button type="button" className="pay-page-btn" disabled={safePage === totalPages} onClick={() => setPayslipPage(p => Math.min(totalPages, p + 1))}>›</button>
                        </div>
                      </div>
                    </section>

                    {/* Payslip View Modal */}
                    {selectedPayslipForView && (
                      <div className="pay-modal-backdrop" role="presentation" onClick={() => setSelectedPayslipForView(null)}>
                        <div
                          className="pay-modal pay-payslip-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-label={`Payslip for ${selectedPayslipForView.month}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="pay-modal-head">
                            <div>
                              <h3>Payslip · {selectedPayslipForView.month}</h3>
                              <p className="pay-modal-sub">Pynk India Pvt Ltd · John Doe</p>
                            </div>
                            <button type="button" className="pay-modal-close" onClick={() => setSelectedPayslipForView(null)}>✕</button>
                          </div>

                          <div className="payslip-view-grid">
                            <div className="payslip-section">
                              <h4>Earnings</h4>
                              {salaryEarnings.map(e => (
                                <div key={e.label} className="payslip-row">
                                  <span><i className="pay-dot" style={{ background: e.color }} />{e.label}</span>
                                  <strong>{formatCurrency(e.amount)}</strong>
                                </div>
                              ))}
                              <div className="payslip-total-row">
                                <span>Total Earnings</span>
                                <strong>{formatCurrency(salaryEarnings.reduce((s, e) => s + e.amount, 0))}</strong>
                              </div>
                            </div>
                            <div className="payslip-section">
                              <h4>Deductions</h4>
                              {salaryDeductions.map(d => (
                                <div key={d.label} className="payslip-row">
                                  <span><i className="pay-dot" style={{ background: d.color }} />{d.label}</span>
                                  <strong>{formatCurrency(d.amount)}</strong>
                                </div>
                              ))}
                              <div className="payslip-total-row">
                                <span>Total Deductions</span>
                                <strong>{formatCurrency(salaryDeductions.reduce((s, d) => s + d.amount, 0))}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="payslip-net-row">
                            <span>Net Salary (Take Home)</span>
                            <strong>{formatCurrency(selectedPayslipForView.netSalary)}</strong>
                          </div>

                          <div className="pay-modal-actions">
                            <button type="button" className="btn" onClick={() => setSelectedPayslipForView(null)}>Close</button>
                            <button type="button" className="btn btn-primary" onClick={() => {
                              const ps = selectedPayslipForView
                              const csv = `Month,Pay Date,Gross Salary,Net Salary,Status\n${ps.month},${ps.payDate},${ps.grossSalary},${ps.netSalary},${ps.status}`
                              const blob = new Blob([csv], { type: 'text/csv' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `payslip-${ps.month.replace(' ', '-')}.csv`
                              a.click()
                              URL.revokeObjectURL(url)
                            }}>⬇️ Download PDF</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── SALARY BREAKDOWN TAB ── */}
              {activePayTab === 'Salary Breakdown' && (() => {
                const totalEarnings = salaryEarnings.reduce((s, e) => s + e.amount, 0)
                const totalDeductions = salaryDeductions.reduce((s, d) => s + d.amount, 0)
                const netSalary = totalEarnings - totalDeductions
                const months = payslipSeedData.map(p => p.month)
                return (
                  <div className="pay-breakdown-shell">
                    <div className="pay-breakdown-sidebar">
                      <label className="pay-filter-group">
                        <span>Select Month</span>
                        <select
                          id="breakdown-month-select"
                          value={salaryBreakdownMonth}
                          onChange={e => setSalaryBreakdownMonth(e.target.value)}
                        >
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </label>

                      <div className="pay-breakdown-summary">
                        <div className="pay-breakdown-kpi">
                          <span>Gross Salary</span>
                          <strong>{formatCurrency(totalEarnings)}</strong>
                        </div>
                        <div className="pay-breakdown-kpi">
                          <span>Total Deductions</span>
                          <strong>{formatCurrency(totalDeductions)}</strong>
                        </div>
                        <div className="pay-breakdown-kpi net">
                          <span>Net Salary (Take Home)</span>
                          <strong>{formatCurrency(netSalary)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pay-breakdown-main">
                      <h3>Salary Breakdown</h3>
                      <div className="pay-breakdown-grid">
                        <section className="pay-breakdown-card" aria-label="Earnings">
                          <h4>Earnings</h4>
                          {salaryEarnings.map(e => (
                            <div key={e.label} className="pay-breakdown-row">
                              <span><i className="pay-dot" style={{ background: e.color }} />{e.label}</span>
                              <strong>{formatCurrency(e.amount)}</strong>
                            </div>
                          ))}
                          <div className="pay-breakdown-total">
                            <span>Total Earnings</span>
                            <strong>{formatCurrency(totalEarnings)}</strong>
                          </div>
                        </section>

                        <section className="pay-breakdown-card" aria-label="Deductions">
                          <h4>Deductions</h4>
                          {salaryDeductions.map(d => (
                            <div key={d.label} className="pay-breakdown-row">
                              <span><i className="pay-dot" style={{ background: d.color }} />{d.label}</span>
                              <strong>{formatCurrency(d.amount)}</strong>
                            </div>
                          ))}
                          <div className="pay-breakdown-total">
                            <span>Total Deductions</span>
                            <strong>{formatCurrency(totalDeductions)}</strong>
                          </div>
                        </section>
                      </div>

                      <p className="pay-breakdown-note">* The salary breakdown is for informational purposes only.</p>
                    </div>
                  </div>
                )
              })()}

              {/* ── TAX DOCUMENTS TAB ── */}
              {activePayTab === 'Tax Documents' && (
                <div className="pay-taxdocs-shell">
                  <div className="pay-taxdocs-banner">
                    <div className="pay-taxdocs-banner-left">
                      <span className="pay-taxdocs-icon">📋</span>
                      <div>
                        <div className="pay-taxdocs-fy-label">Financial Year</div>
                        <div className="pay-taxdocs-fy">2024-25 (01 Apr 2024 - 31 Mar 2025)</div>
                      </div>
                    </div>
                    <div className="pay-taxdocs-help">
                      <span>ℹ️</span>
                      <div>
                        <strong>Need help?</strong>
                        <p>For any tax related queries, contact your HR or check our Help Center.</p>
                      </div>
                    </div>
                  </div>

                  <section className="pay-table-card" aria-label="Tax documents">
                    <div className="pay-table-wrap">
                      <table className="pay-table">
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>Financial Year</th>
                            <th>Description</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {taxDocumentSeedData.map(doc => (
                            <tr key={doc.id}>
                              <td><strong>{doc.name}</strong></td>
                              <td>{doc.financialYear}</td>
                              <td>{doc.description}</td>
                              <td>
                                <button type="button" className="pay-download-btn" onClick={() => {
                                  const csv = `Document,Financial Year,Description\n${doc.name},${doc.financialYear},${doc.description}`
                                  const blob = new Blob([csv], { type: 'text/csv' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `${doc.name.replace(/\s+/g, '-')}-${doc.financialYear}.csv`
                                  a.click()
                                  URL.revokeObjectURL(url)
                                }}>
                                  ⬇️ Download
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <p className="pay-breakdown-note">You can download these documents for your tax filing purposes.</p>
                </div>
              )}

              {/* ── BANK DETAILS TAB ── */}
              {activePayTab === 'Bank Details' && (
                <div className="pay-bank-shell">
                  <div className="pay-bank-grid">
                    {/* Salary Account Card */}
                    <section className="pay-card pay-bank-card" aria-label="Salary account">
                      <h3>Salary Account</h3>
                      <div className="pay-bank-inner">
                        <div className="pay-bank-icon-wrap">
                          <span className="pay-bank-icon">🏛️</span>
                          {bankDetailsSeed.verified && (
                            <span className="pay-bank-verified">✅ Verified</span>
                          )}
                        </div>
                        <dl className="pay-bank-dl">
                          <div><dt>Bank Name</dt><dd><strong>{bankDetailsSeed.bankName}</strong></dd></div>
                          <div><dt>Account Number</dt><dd>{maskAccountNumber(bankDetailsSeed.accountNumber)}</dd></div>
                          <div><dt>IFSC Code</dt><dd>{bankDetailsSeed.ifscCode}</dd></div>
                          <div><dt>Account Holder Name</dt><dd>{bankDetailsSeed.accountHolderName}</dd></div>
                        </dl>
                      </div>
                    </section>

                    {/* Update Request Card */}
                    <section className="pay-card pay-bank-update-card" aria-label="Bank update request">
                      <h3>Need to update bank details?</h3>
                      <p className="pay-bank-update-desc">You can request for bank details update. The request will be reviewed and updated by HR.</p>
                      {bankUpdateRequestSent ? (
                        <div className="pay-bank-success">
                          ✅ Your bank update request has been submitted successfully. HR will review and update your details.
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          id="request-bank-update-btn"
                          onClick={() => { setBankUpdateModalOpen(true); setBankUpdateError(''); setBankUpdateSuccess(false) }}
                        >
                          Request Bank Update
                        </button>
                      )}
                      <button
                        type="button"
                        className="pay-view-link"
                        style={{ marginTop: '12px' }}
                        onClick={() => { }}
                      >
                        View Request Status ›
                      </button>
                    </section>
                  </div>

                  <p className="pay-breakdown-note">* Salary is credited to your above bank account every month.</p>

                  {/* Bank Update Modal */}
                  {bankUpdateModalOpen && (
                    <div className="pay-modal-backdrop" role="presentation" onClick={() => setBankUpdateModalOpen(false)}>
                      <div
                        className="pay-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Request bank details update"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="pay-modal-head">
                          <h3>Request Bank Details Update</h3>
                          <button type="button" className="pay-modal-close" onClick={() => setBankUpdateModalOpen(false)}>✕</button>
                        </div>
                        <p className="pay-modal-sub">Fill in the new bank details below. HR will verify and update.</p>

                        <div className="pay-bank-form-grid">
                          <label>
                            Bank Name <span className="pay-req">*</span>
                            <input
                              id="bank-name-input"
                              type="text"
                              placeholder="e.g. HDFC Bank Limited"
                              value={bankUpdateForm.bankName}
                              onChange={e => setBankUpdateForm(p => ({ ...p, bankName: e.target.value }))}
                            />
                          </label>
                          <label>
                            Account Number <span className="pay-req">*</span>
                            <input
                              id="bank-account-input"
                              type="text"
                              placeholder="Enter account number"
                              value={bankUpdateForm.accountNumber}
                              onChange={e => setBankUpdateForm(p => ({ ...p, accountNumber: e.target.value }))}
                            />
                          </label>
                          <label>
                            IFSC Code <span className="pay-req">*</span>
                            <input
                              id="bank-ifsc-input"
                              type="text"
                              placeholder="e.g. HDFC0001234"
                              value={bankUpdateForm.ifscCode}
                              onChange={e => setBankUpdateForm(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                            />
                          </label>
                          <label>
                            Account Holder Name <span className="pay-req">*</span>
                            <input
                              id="bank-holder-input"
                              type="text"
                              placeholder="Name as on bank account"
                              value={bankUpdateForm.accountHolderName}
                              onChange={e => setBankUpdateForm(p => ({ ...p, accountHolderName: e.target.value }))}
                            />
                          </label>
                          <label className="pay-form-full">
                            Reason for Update <span className="pay-req">*</span>
                            <textarea
                              id="bank-reason-input"
                              rows={3}
                              placeholder="Provide reason for bank account change"
                              value={bankUpdateForm.reason}
                              onChange={e => setBankUpdateForm(p => ({ ...p, reason: e.target.value }))}
                            />
                          </label>
                        </div>

                        {bankUpdateError && <p className="pay-form-error">{bankUpdateError}</p>}
                        {bankUpdateSuccess && <p className="pay-form-success">{bankUpdateSuccess}</p>}

                        <div className="pay-modal-actions">
                          <button type="button" className="btn" onClick={() => setBankUpdateModalOpen(false)}>Cancel</button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            id="submit-bank-update-btn"
                            onClick={() => {
                              setBankUpdateError('')
                              const { bankName, accountNumber, ifscCode, accountHolderName, reason } = bankUpdateForm
                              if (!bankName.trim()) { setBankUpdateError('Bank name is required.'); return }
                              if (!accountNumber.trim() || accountNumber.trim().length < 9) { setBankUpdateError('Please enter a valid account number (min 9 digits).'); return }
                              if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim())) { setBankUpdateError('IFSC Code must be in format: 4 letters, 0, 6 alphanumeric (e.g. HDFC0001234).'); return }
                              if (!accountHolderName.trim()) { setBankUpdateError('Account holder name is required.'); return }
                              if (!reason.trim() || reason.trim().length < 10) { setBankUpdateError('Please provide a reason (min 10 characters).'); return }
                              setBankUpdateRequestSent(true)
                              setBankUpdateModalOpen(false)
                              setBankUpdateForm({ bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', reason: '' })
                            }}
                          >
                            Submit Request
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PAYMENT HISTORY TAB ── */}
              {activePayTab === 'Payment History' && (() => {
                const filtered = payHistoryStatusFilter === 'All'
                  ? paymentHistorySeed
                  : paymentHistorySeed.filter(p => p.status === payHistoryStatusFilter)
                return (
                  <div className="pay-payhistory-shell">
                    <div className="pay-history-filters">
                      {(['All', 'Credited', 'Pending', 'Failed'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          className={`pay-history-chip ${payHistoryStatusFilter === status ? 'active' : ''}`}
                          onClick={() => setPayHistoryStatusFilter(status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <section className="pay-table-card" aria-label="Payment history table">
                      <div className="pay-table-wrap">
                        <table className="pay-table">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Pay Date</th>
                              <th>Gross Salary</th>
                              <th>Net Salary</th>
                              <th>Payment Mode</th>
                              <th>Transaction ID</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(ph => (
                              <tr key={ph.id}>
                                <td>{ph.month}</td>
                                <td>{ph.payDate}</td>
                                <td>{formatCurrency(ph.grossSalary)}</td>
                                <td>{formatCurrency(ph.netSalary)}</td>
                                <td>{ph.paymentMode}</td>
                                <td><span className="pay-txn-id">{ph.transactionId}</span></td>
                                <td><span className={`pay-history-status ${ph.status.toLowerCase()}`}>{ph.status}</span></td>
                              </tr>
                            ))}
                            {filtered.length === 0 && (
                              <tr><td colSpan={7} className="pay-empty-row">No payment history found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <p className="pay-breakdown-note">* Payment history shows salary credits to your registered bank account.</p>
                  </div>
                )
              })()}
            </div>
          ) : currentModule === 'documents' ? (
            <div className="doc-shell">
              <div className="doc-top">
                <div className="doc-tabs">
                  {documentTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`doc-tab ${activeDocTab === tab ? 'active' : ''}`}
                      onClick={() => {
                        setActiveDocTab(tab)
                        setDocSearchQuery('')
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── MY DOCUMENTS (OVERVIEW) ── */}
              {activeDocTab === 'My Documents' && (
                <div className="doc-overview-tab">
                  <div className="doc-metrics-grid">
                    <div className="doc-metric-card">
                      <div className="doc-metric-icon blue">📄</div>
                      <div className="doc-metric-content">
                        <span className="doc-metric-label">Total Documents</span>
                        <strong className="doc-metric-value">24</strong>
                        <span className="doc-metric-sub">All time</span>
                      </div>
                    </div>
                    <div className="doc-metric-card">
                      <div className="doc-metric-icon green">⬇️</div>
                      <div className="doc-metric-content">
                        <span className="doc-metric-label">Downloaded This Month</span>
                        <strong className="doc-metric-value">5</strong>
                        <span className="doc-metric-sub">Files</span>
                      </div>
                    </div>
                    <div className="doc-metric-card">
                      <div className="doc-metric-icon orange">⬆️</div>
                      <div className="doc-metric-content">
                        <span className="doc-metric-label">Pending Uploads</span>
                        <strong className="doc-metric-value">2</strong>
                        <span className="doc-metric-sub">Files</span>
                      </div>
                    </div>
                    <div className="doc-metric-card">
                      <div className="doc-metric-icon red">📅</div>
                      <div className="doc-metric-content">
                        <span className="doc-metric-label">Expiring Soon</span>
                        <strong className="doc-metric-value">1</strong>
                        <span className="doc-metric-sub">Documents</span>
                      </div>
                    </div>
                  </div>

                  <div className="doc-overview-split">
                    <section className="doc-card" aria-label="Quick Actions">
                      <h3>Quick Actions</h3>
                      <div className="doc-quick-actions-grid">
                        <button type="button" className="doc-quick-btn" onClick={() => setActiveDocTab('Uploaded Documents')}>
                          <div className="doc-quick-icon blue">📤</div>
                          <div className="doc-quick-text">
                            <strong>Upload Document</strong>
                            <span>Upload new document</span>
                          </div>
                        </button>
                        <button type="button" className="doc-quick-btn" onClick={() => setActiveDocTab('Employment Documents')}>
                          <div className="doc-quick-icon blue">📄</div>
                          <div className="doc-quick-text">
                            <strong>View Employment Contract</strong>
                            <span>View your contract</span>
                          </div>
                        </button>
                        <button type="button" className="doc-quick-btn" onClick={() => setActiveDocTab('Payroll Documents')}>
                          <div className="doc-quick-icon green">💵</div>
                          <div className="doc-quick-text">
                            <strong>Download Latest Payslip</strong>
                            <span>June 2025</span>
                          </div>
                        </button>
                        <button type="button" className="doc-quick-btn" onClick={() => setActiveDocTab('Tax Documents')}>
                          <div className="doc-quick-icon purple">🧾</div>
                          <div className="doc-quick-text">
                            <strong>View Tax Documents</strong>
                            <span>Download tax files</span>
                          </div>
                        </button>
                      </div>
                    </section>

                    <section className="doc-card" aria-label="Recent Documents">
                      <div className="doc-card-head">
                        <h3>Recent Documents</h3>
                        <button type="button" className="doc-view-all" onClick={() => setActiveDocTab('Employment Documents')}>View All</button>
                      </div>
                      <div className="doc-recent-list">
                        {[employmentDocsSeed[0], employmentDocsSeed[1], uploadedDocsSeed[0], payrollDocsSeed[0], taxDocsSeed[0]].map((doc, idx) => (
                          <div key={idx} className="doc-recent-row">
                            <span className="doc-recent-icon">📄</span>
                            <span className="doc-recent-name">{doc.name}</span>
                            <span className="doc-recent-meta">PDF • {doc.size}</span>
                            <span className="doc-recent-date">{doc.issuedOn || doc.monthYear || doc.uploadedOn || doc.financialYear}</span>
                            <button type="button" className="doc-action-btn" onClick={() => handleDownloadDoc(doc)}>⬇️</button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="doc-info-tip">
                    <span>ℹ️</span> Tip: You can upload documents in PDF, JPG, PNG format. Max file size 10MB.
                  </div>
                </div>
              )}

              {/* ── SHARED TABLE LAYOUT FOR OTHER TABS ── */}
              {activeDocTab !== 'My Documents' && (
                <div className="doc-table-shell">
                  <div className="doc-table-header">
                    <div className="doc-table-title">
                      <h3>{activeDocTab}</h3>
                      <p>
                        {activeDocTab === 'Employment Documents' && 'Documents issued by your employer.'}
                        {activeDocTab === 'Payroll Documents' && 'Payroll related documents and salary information.'}
                        {activeDocTab === 'Tax Documents' && 'Tax related documents and certificates.'}
                        {activeDocTab === 'Uploaded Documents' && 'Documents uploaded by you for verification.'}
                        {activeDocTab === 'Expiring Documents' && 'Documents that are expiring soon.'}
                      </p>
                    </div>

                    <div className="doc-table-controls">
                      {activeDocTab === 'Tax Documents' ? (
                        <div className="doc-filter-group">
                          <label>Financial Year</label>
                          <select value={taxYearFilter} onChange={(e) => { setTaxYearFilter(e.target.value); setDocCurrentPage(1); }}>
                            <option value="2024-25">2024-25 (Apr 2024 - Mar 2025)</option>
                            <option value="2023-24">2023-24 (Apr 2023 - Mar 2024)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="doc-search-box">
                          <input
                            type="text"
                            placeholder="Search document"
                            value={docSearchQuery}
                            onChange={(e) => { setDocSearchQuery(e.target.value); setDocCurrentPage(1); }}
                          />
                          <span className="doc-search-icon">🔍</span>
                        </div>
                      )}

                      {activeDocTab === 'Uploaded Documents' && (
                        <button type="button" className="doc-upload-btn" onClick={() => setIsDocUploadModalOpen(true)}>📤 Upload Document</button>
                      )}
                      <select className="doc-filter-btn" value={docStatusFilter} onChange={(e) => { setDocStatusFilter(e.target.value); setDocCurrentPage(1); }} style={{ appearance: 'auto' }}>
                        <option value="All">All Status</option>
                        <option value="Available">Available</option>
                        <option value="Verified">Verified</option>
                        <option value="Pending Verification">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="doc-table-card">
                    <div className="doc-table-wrap">
                      <table className="doc-table">
                        <thead>
                          <tr>
                            <th>Document Name</th>
                            {activeDocTab === 'Uploaded Documents' ? (
                              <th>Category</th>
                            ) : (
                              <th>Description</th>
                            )}
                            {activeDocTab === 'Employment Documents' && <th>Issued On</th>}
                            {activeDocTab === 'Payroll Documents' && <th>Month / Year</th>}
                            {activeDocTab === 'Tax Documents' && <th>Financial Year</th>}
                            {activeDocTab === 'Uploaded Documents' && <th>Uploaded On</th>}
                            <th>Status</th>
                            {activeDocTab === 'Uploaded Documents' && <th>Verified On</th>}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let source: PortalDocument[] = []
                            if (activeDocTab === 'Employment Documents') source = employmentDocsSeed
                            else if (activeDocTab === 'Payroll Documents') source = payrollDocsSeed
                            else if (activeDocTab === 'Tax Documents') source = taxDocsSeed
                            else if (activeDocTab === 'Uploaded Documents') source = uploadedDocsState
                            else if (activeDocTab === 'Expiring Documents') source = [uploadedDocsState[1]]

                            let filtered = source.filter(d => d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))

                            if (activeDocTab === 'Tax Documents') {
                              filtered = filtered.filter(d => d.financialYear === taxYearFilter)
                            }

                            if (docStatusFilter !== 'All') {
                              filtered = filtered.filter(d => {
                                if (docStatusFilter === 'Pending') return d.status === 'Pending Verification'
                                return d.status === docStatusFilter
                              })
                            }

                            const totalItems: number = filtered.length
                            if (totalItems === 0) return 'Showing 0 documents'
                            const startIndex = (docCurrentPage - 1) * DOCS_PER_PAGE
                            const paginated = filtered.slice(startIndex, startIndex + DOCS_PER_PAGE)

                            if (paginated.length === 0) {
                              return <tr><td colSpan={6} className="doc-empty">No documents found.</td></tr>
                            }

                            return paginated.map((doc) => (
                              <tr key={doc.id}>
                                <td className="doc-cell-name">{doc.name}</td>

                                {activeDocTab === 'Uploaded Documents' ? (
                                  <td>{doc.category}</td>
                                ) : (
                                  <td>{doc.description}</td>
                                )}

                                {activeDocTab === 'Employment Documents' && <td>{doc.issuedOn}</td>}
                                {activeDocTab === 'Payroll Documents' && <td>{doc.monthYear}</td>}
                                {activeDocTab === 'Tax Documents' && <td>{doc.financialYear}</td>}
                                {activeDocTab === 'Uploaded Documents' && <td>{doc.uploadedOn}</td>}

                                <td>
                                  <span className={`doc-status ${doc.status === 'Available' || doc.status === 'Verified' ? 'success' : 'warning'}`}>
                                    {doc.status}
                                  </span>
                                </td>

                                {activeDocTab === 'Uploaded Documents' && <td>{doc.verifiedOn}</td>}

                                <td>
                                  <div className="doc-table-actions">
                                    <button type="button" title="View" onClick={() => setDocPreview(doc)}>👁️</button>
                                    <button type="button" title="Download" onClick={() => handleDownloadDoc(doc)}>⬇️</button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="doc-pagination-info">
                        {(() => {
                          let source: PortalDocument[] = []
                          if (activeDocTab === 'Employment Documents') source = employmentDocsSeed
                          else if (activeDocTab === 'Payroll Documents') source = payrollDocsSeed
                          else if (activeDocTab === 'Tax Documents') source = taxDocsSeed
                          else if (activeDocTab === 'Uploaded Documents') source = uploadedDocsState
                          else if (activeDocTab === 'Expiring Documents') source = [uploadedDocsState[1]]

                          let filtered = source.filter(d => d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                          if (activeDocTab === 'Tax Documents') {
                            filtered = filtered.filter(d => d.financialYear === taxYearFilter)
                          }
                          if (docStatusFilter !== 'All') {
                            filtered = filtered.filter(d => d.status === (docStatusFilter === 'Pending' ? 'Pending Verification' : docStatusFilter))
                          }

                          const totalItems = filtered.length
                          if (totalItems === 0) return 'Showing 0 documents'
                          const start = (docCurrentPage - 1) * DOCS_PER_PAGE + 1
                          const end = Math.min(docCurrentPage * DOCS_PER_PAGE, totalItems)
                          return `Showing ${start} to ${end} of ${totalItems} documents`
                        })()}
                      </span>
                      <div className="doc-pagination-controls" style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn" disabled={docCurrentPage === 1} onClick={() => setDocCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                        <button type="button" className="btn" disabled={
                          (() => {
                            let source: PortalDocument[] = []
                            if (activeDocTab === 'Employment Documents') source = employmentDocsSeed
                            else if (activeDocTab === 'Payroll Documents') source = payrollDocsSeed
                            else if (activeDocTab === 'Tax Documents') source = taxDocsSeed
                            else if (activeDocTab === 'Uploaded Documents') source = uploadedDocsState
                            else if (activeDocTab === 'Expiring Documents') source = [uploadedDocsState[1]]

                            let filtered = source.filter(d => d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                            if (activeDocTab === 'Tax Documents') {
                              filtered = filtered.filter(d => d.financialYear === taxYearFilter)
                            }
                            if (docStatusFilter !== 'All') {
                              filtered = filtered.filter(d => d.status === (docStatusFilter === 'Pending' ? 'Pending Verification' : docStatusFilter))
                            }
                            return docCurrentPage >= Math.ceil(filtered.length / DOCS_PER_PAGE)
                          })()
                        } onClick={() => setDocCurrentPage(p => p + 1)}>Next</button>
                      </div>
                    </div>
                  </div>

                  {activeDocTab === 'Uploaded Documents' && (
                    <div className="doc-info-tip" style={{ marginTop: '14px' }}>
                      <span>ℹ️</span> You will be notified once your documents are verified by HR.
                    </div>
                  )}

                  {isDocUploadModalOpen && (
                    <div className="time-modal-backdrop" role="presentation" onClick={() => setIsDocUploadModalOpen(false)}>
                      <div className="time-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="time-modal-head">
                          <h3>Upload Document</h3>
                          <button type="button" onClick={() => setIsDocUploadModalOpen(false)}>✕</button>
                        </div>
                        <div className="time-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                          {docUploadError && <div className="login-error">{docUploadError}</div>}
                          <div className="login-group">
                            <label>Document Name *</label>
                            <input type="text" value={docUploadName} onChange={e => setDocUploadName(e.target.value)} placeholder="e.g. Passport Copy" />
                          </div>
                          <div className="login-group">
                            <label>Category *</label>
                            <select value={docUploadCategory} onChange={e => setDocUploadCategory(e.target.value)}>
                              <option value="">Select Category</option>
                              <option value="Identity Proof">Identity Proof</option>
                              <option value="Address Proof">Address Proof</option>
                              <option value="Work Authorization">Work Authorization</option>
                              <option value="Qualification">Qualification</option>
                              <option value="Tax Document">Tax Document</option>
                              <option value="Bank Details">Bank Details</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="login-group">
                            <label>File *</label>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocUploadFile(e.target.files?.[0] || null)} />
                          </div>
                        </div>
                        <div className="time-modal-foot">
                          <button type="button" className="btn" onClick={() => setIsDocUploadModalOpen(false)}>Cancel</button>
                          <button type="button" className="btn btn-primary" onClick={() => {
                            if (!docUploadName || !docUploadCategory || !docUploadFile) {
                              setDocUploadError('Please fill all required fields and select a file.')
                              return
                            }
                            const newDoc: PortalDocument = {
                              id: `ud-new-${Date.now()}`,
                              name: docUploadName,
                              category: docUploadCategory,
                              status: 'Pending Verification',
                              size: `${(docUploadFile.size / 1024).toFixed(0)} KB`,
                              uploadedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                              verifiedOn: '-'
                            }
                            setUploadedDocsState([newDoc, ...uploadedDocsState])
                            setIsDocUploadModalOpen(false)
                            setDocUploadName('')
                            setDocUploadCategory('')
                            setDocUploadFile(null)
                            setDocUploadError('')
                          }}>Upload</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {docPreview && (
                    <div className="time-modal-backdrop" role="presentation" onClick={() => setDocPreview(null)}>
                      <div className="time-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="time-modal-head">
                          <h3>{docPreview.name}</h3>
                          <button type="button" onClick={() => setDocPreview(null)}>✕</button>
                        </div>
                        <div className="time-modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px' }}>
                          <span style={{ fontSize: '48px' }}>📄</span>
                          <p style={{ textAlign: 'center', color: '#9ea2bd', margin: 0 }}>This is a preview of the document.<br />(Preview not available in demo)</p>
                          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', fontSize: '13px', color: '#c6c8de' }}>
                            <span>Size: {docPreview.size}</span>
                            <span>|</span>
                            <span>Status: {docPreview.status}</span>
                          </div>
                        </div>
                        <div className="time-modal-foot">
                          <button type="button" className="btn" onClick={() => setDocPreview(null)}>Close</button>
                          <button type="button" className="btn btn-primary" onClick={() => {
                            setDocPreview(null)
                            handleDownloadDoc(docPreview)
                          }}>Download</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {docNotification && (
                    <div style={{
                      position: 'fixed',
                      bottom: '24px',
                      right: '24px',
                      background: '#2ecc71',
                      color: '#fff',
                      padding: '12px 24px',
                      border: '1px solid #1a4d2e',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      fontWeight: '700',
                      zIndex: 1000,
                    }}>
                      {docNotification}
                    </div>
                  )}
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
