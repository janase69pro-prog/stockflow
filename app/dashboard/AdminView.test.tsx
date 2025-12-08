import { render, screen, fireEvent } from '@testing-library/react'
import AdminView from './admin-view'
import { Product } from '@/types'

// Mock actions
jest.mock('@/app/actions', () => ({
  createProductFamily: jest.fn(),
  restockProduct: jest.fn(),
  registerBatchContribution: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}))

describe('AdminView Component', () => {
  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      family_id: 'fam-1',
      name: 'Proteína',
      variation: 'Chocolate',
      price: 30,
      cost_price: 15,
      current_stock: 10,
      created_at: ''
    },
    {
      id: 'prod-2',
      family_id: 'fam-1',
      name: 'Proteína',
      variation: 'Vainilla',
      price: 30,
      cost_price: 15,
      current_stock: 5,
      created_at: ''
    }
  ]

  const mockUsers = [{ id: 'u1', name: 'Unai', email: 'unai@local' }]

  it('agrupa productos por familia correctamente', () => {
    render(<AdminView products={mockProducts} transactions={[]} allUsers={mockUsers} />)
    expect(screen.getByText('Proteína')).toBeInTheDocument()
    expect(screen.getByText(/2 variantes/i)).toBeInTheDocument()
  })

  it('abre el modal de Nuevo Lote', () => {
    render(<AdminView products={mockProducts} transactions={[]} allUsers={mockUsers} />)
    
    // Buscar botón exacto "Lote" (o con icono)
    // Usamos role button y name parcial
    const batchBtn = screen.getByRole('button', { name: /Lote/i })
    fireEvent.click(batchBtn)
    
    expect(screen.getByText('Registrar Lote')).toBeInTheDocument()
  })

  it('muestra el formulario de creación de producto', () => {
    render(<AdminView products={mockProducts} transactions={[]} allUsers={mockUsers} />)
    
    // Texto actualizado
    expect(screen.getByText(/Nuevo Producto \(Familia\)/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Proteína Whey')).toBeInTheDocument()
  })
})