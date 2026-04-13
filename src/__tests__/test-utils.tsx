import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import type { ReactElement } from 'react'

const theme = createTheme()

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

export function renderWithTheme(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

export { screen, fireEvent, waitFor, act } from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
