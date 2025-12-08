import { 
  registerBatchContribution, 
  withdrawItem 
} from './actions'
import { mockSupabaseClient, resetSupabaseMocks, createQueryBuilder } from '@/utils/test/supabase-mock'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

describe('Sistema Financiero (Economía Circular)', () => {
  
  beforeEach(() => {
    resetSupabaseMocks()
  })

  test('Test A: Admin asigna crédito -> Usuario recibe saldo', async () => {
    // Mock Admin
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'profiles') return createQueryBuilder({ role: 'admin', invested_amount: 0 }, null)
      if (table === 'products') return createQueryBuilder({ current_stock: 0 }, null) // Para la parte de stock
      return createQueryBuilder(null)
    })

    const contributions = [{ userId: 'user-A', amount: 100 }]
    const stock = [] // Solo dinero

    await registerBatchContribution('Lote Test', contributions, stock)

    // Verificar que se llamó a actualizar el perfil
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
    // Verificar que se insertó en el log de capital
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('capital_entries')
  })

  test('Test B: Retirada con saldo suficiente -> Éxito', async () => {
    // Mock Usuario A
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-A' } } })

    // Mock Datos
    const mockProduct = { id: 'p1', cost_price: 20, current_stock: 10 }
    const mockProfile = { invested_amount: 100 } // Tiene 100€
    const mockHolds = [] // No tiene nada en mano (0€ ocupados)

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'products') return createQueryBuilder(mockProduct, null)
      if (table === 'profiles') return createQueryBuilder(mockProfile, null)
      if (table === 'inventory_holds') return createQueryBuilder(mockHolds, null)
      return createQueryBuilder(null)
    })

    // Simulamos que el RPC funciona
    mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null })

    const result = await withdrawItem('p1', 1)

    expect(result).toEqual({ success: true })
    // Se debió llamar a RPC para restar stock
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('withdraw_stock_secure', expect.anything())
  })

  test('Test C: Retirada SIN saldo suficiente -> Error', async () => {
    // Mock Usuario A
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-A' } } })

    // Mock Datos
    const mockProduct = { id: 'p1', cost_price: 200, current_stock: 10 } // Cuesta 200
    const mockProfile = { invested_amount: 100 } // Tiene 100
    const mockHolds = [] 

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'products') return createQueryBuilder(mockProduct, null)
      if (table === 'profiles') return createQueryBuilder(mockProfile, null)
      if (table === 'inventory_holds') return createQueryBuilder(mockHolds, null)
      return createQueryBuilder(null)
    })

    const result = await withdrawItem('p1', 1)

    // Debe fallar
    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining('Límite') }))
  })
})
