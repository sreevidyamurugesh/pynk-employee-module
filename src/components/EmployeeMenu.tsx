interface EmployeeMenuProps {
  onSelectOption: (optionId: string) => void
  selectedOption?: string
}

export function EmployeeMenu({ onSelectOption, selectedOption }: EmployeeMenuProps) {
  return (
    <div className="employee-menu">
      {/* Content coming soon */}
    </div>
  )
}
