import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithTheme } from './test-utils'
import { Toast } from '../components/Toast'

const base = { message: 'Test mesajı', onClose: vi.fn() }

describe('Toast', () => {
  it('renders the message when open', () => {
    renderWithTheme(<Toast {...base} open severity="success" />)
    expect(screen.getByText('Test mesajı')).toBeInTheDocument()
  })

  it('does not show content when closed', () => {
    renderWithTheme(<Toast {...base} open={false} severity="success" />)
    expect(screen.queryByText('Test mesajı')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    renderWithTheme(<Toast message="hi" open severity="info" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.each(['success', 'error', 'warning', 'info'] as const)(
    'renders without crashing for severity=%s',
    (severity) => {
      renderWithTheme(<Toast {...base} open severity={severity} />)
      expect(screen.getByText('Test mesajı')).toBeInTheDocument()
    }
  )
})
