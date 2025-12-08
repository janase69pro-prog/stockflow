import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SellerView from './seller-view'
import { Product, InventoryHold, Profile } from '@/types'

// Mock de las acciones
jest.mock('@/app/actions', () => ({
  withdrawItem: jest.fn(),
  sellItem: jest.fn(),
  transferItem: jest.fn(),
  returnItem: jest.fn(),
}))

// Mock de resizeObserver (necesario a veces)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('SellerView Component', () => {
  const mockProfile: Profile = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
    role: 'seller',
    invested_amount: 500,
    created_at: ''
  }

  const mockProducts: Product[] = [
    {
      id: 'prod-1',
      family_id: 'fam-1',
      name: 'Camiseta',
      variation: 'Roja',
      price: 20,
      cost_price: 10,
      current_stock: 50,
      created_at: ''
    }
  ]

  const mockHolds: InventoryHold[] = [
    {
      id: 'hold-1',
      user_id: 'user-1',
      product_id: 'prod-1',
      quantity: 5,
      status: 'held',
      updated_at: '',
      products: mockProducts[0]
    }
  ]

  it('calcula y muestra el crédito disponible correctamente', () => {
    render(
      <SellerView 
        products={mockProducts} 
        myHolds={mockHolds} 
        profile={mockProfile} 
        allUsers={[]} 
      />
    )
    expect(screen.getByText('450.00 €')).toBeInTheDocument()
  })

  it('habilita el botón de Vender porque tengo stock', () => {
    render(
      <SellerView 
        products={mockProducts} 
        myHolds={mockHolds} 
        profile={mockProfile} 
        allUsers={[]} 
      />
    )

    fireEvent.click(screen.getByText('Camiseta'))
    
    // Buscar el botón vender específico
    // Al haber solo uno, getAllByText[0] sirve
    const sellButton = screen.getAllByText('Vender')[0]
    expect(sellButton.closest('button')).not.toBeDisabled()
  })

  it('abre el modal de confirmación al hacer click en Vender', async () => {
    render(
      <SellerView 
        products={mockProducts} 
        myHolds={mockHolds} 
        profile={mockProfile} 
        allUsers={[]} 
      />
    )

    // 1. Abrir familia
    fireEvent.click(screen.getByText('Camiseta'))
    
    // 2. Click en Vender
    const sellButton = screen.getAllByText('Vender')[0]
    fireEvent.click(sellButton)

    // 3. Esperar a que aparezca el modal
    // Buscamos por el título del modal que incluye el nombre del producto
    await waitFor(() => {
        expect(screen.getByText(/Vender 1x Camiseta/i)).toBeInTheDocument()
    })
    
    // Verificar input de precio
    expect(screen.getByDisplayValue('20')).toBeInTheDocument()
  })
})