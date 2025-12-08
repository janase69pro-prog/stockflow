import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from './page'

// Mock login action
jest.mock('./actions', () => ({
  login: jest.fn()
}))

describe('LoginPage', () => {
  it('renderiza el formulario de login', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('Bienvenido a StockFlow')).toBeInTheDocument()
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument()
  })
})
