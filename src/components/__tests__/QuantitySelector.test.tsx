import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuantitySelector from '../QuantitySelector'

describe('QuantitySelector', () => {
  it('calls onChange when increment and decrement are clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<QuantitySelector value={2} min={1} max={5} onChange={onChange} label="Quantity" />)

    const increment = screen.getByLabelText('Increase quantity')
    const decrement = screen.getByLabelText('Decrease quantity')

    await user.click(increment)
    expect(onChange).toHaveBeenCalledWith(3)

    await user.click(decrement)
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('disables increment when max reached and shows provided error', () => {
    const onChange = vi.fn()
    render(
      <QuantitySelector
        value={5}
        min={1}
        max={5}
        onChange={onChange}
        label="Quantity"
        error="Only 5 left in stock."
      />,
    )

    const increment = screen.getByLabelText('Increase quantity')
    expect(increment).toBeDisabled()
    expect(screen.getByText('Only 5 left in stock.')).toBeInTheDocument()
  })
})
