import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useBoardingPreference } from '../hooks/useBoardingPreference'

interface BoardingPreferenceSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  compact?: boolean
}

export function BoardingPreferenceSwitch({
  checked,
  onCheckedChange,
  label,
  compact = false,
}: BoardingPreferenceSwitchProps) {
  const inputId = useId()

  return (
    <label
      className={`boarding-preference-toggle ${compact ? 'boarding-preference-toggle--compact' : ''}`}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
      />
      <span className="boarding-preference-toggle__track" aria-hidden="true">
        <span />
      </span>
      <span className="boarding-preference-toggle__label">{label}</span>
    </label>
  )
}

interface BoardingPreferenceToggleProps {
  compact?: boolean
}

export default function BoardingPreferenceToggle({
  compact = false,
}: BoardingPreferenceToggleProps) {
  const { t } = useTranslation()
  const { skipBoarding, setSkipBoarding } = useBoardingPreference()

  return (
    <BoardingPreferenceSwitch
      checked={skipBoarding}
      onCheckedChange={setSkipBoarding}
      label={t('boarding.skipNext')}
      compact={compact}
    />
  )
}
