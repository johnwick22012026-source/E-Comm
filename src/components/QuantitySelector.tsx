import { useMemo, type ChangeEvent } from 'react'

type QuantitySelectorProps = {
  value: number
  min?: number
  max?: number
  disabled?: boolean
  label?: string
  error?: string | null
  onChange: (value: number) => void
}

const QuantitySelector = ({
  value,
  min = 0,
  max,
  disabled = false,
  label,
  error,
  onChange,
}: QuantitySelectorProps) => {
  const sanitizedMin = Math.max(0, min)
  const currentValue = Math.max(sanitizedMin, value)
  const limitedMax = max !== undefined ? Math.max(sanitizedMin, max) : undefined

  const decrementDisabled = disabled || currentValue <= sanitizedMin
  const incrementDisabled = disabled || (limitedMax !== undefined && currentValue >= limitedMax)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return
    }
    const parsed = Number(event.target.value)
    const next = Number.isFinite(parsed) ? parsed : sanitizedMin
    onChange(next)
  }

  const handleDecrement = () => {
    if (decrementDisabled) {
      return
    }
    onChange(currentValue - 1)
  }

  const handleIncrement = () => {
    if (incrementDisabled) {
      return
    }
    onChange(currentValue + 1)
  }

  const errorId = error ? 'quantity-selector-error' : undefined

  return (
    <div className="quantity-selector">
      {label && <span className="quantity-selector__label">{label}</span>}
      <div className="quantity-selector__controls">
        <button
          type="button"
          aria-label="Decrease quantity"
          className="quantity-selector__button"
          onClick={handleDecrement}
          disabled={decrementDisabled}
        >
          –
        </button>
        <input
          className="quantity-selector__input"
          type="number"
          aria-label={label ?? 'Quantity'}
          aria-describedby={errorId}
          value={currentValue}
          min={sanitizedMin}
          max={limitedMax}
          onChange={handleInputChange}
          disabled={disabled}
        />
        <button
          type="button"
          aria-label="Increase quantity"
          className="quantity-selector__button"
          onClick={handleIncrement}
          disabled={incrementDisabled}
        >
          +
        </button>
      </div>
      {error && (
        <p id={errorId} className="inline-error" role="status">
          {error}
        </p>
      )}
    </div>
  )
}

export default QuantitySelector
