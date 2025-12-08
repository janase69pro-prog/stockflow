import { 
  sellItem, 
  withdrawItem, 
  registerBatchContribution, 
  returnItem,
  transferItem,
  login
} from './actions'
import { mockSupabaseClient, resetSupabaseMocks, createQueryBuilder } from '@/utils/test/supabase-mock'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn()
}))

describe('Server Actions Logic - Full Coverage', () => {
  
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe('Auth Logic', () => {
    it('login debe añadir sufijo @stockflow.local si no tiene email', async () => {
      const formData = new FormData()
      formData.append('username', 'unai')
      formData.append('password', '123456')

      await login(formData)

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'unai@stockflow.local',
        password: '123456'
      })
    })
  })

  describe('withdrawItem', () => {
    it('debe fallar si excede el límite de crédito', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'products') return createQueryBuilder({ id: 'prod-1', current_stock: 10, cost_price: 500 }, null)
        if (table === 'profiles') return createQueryBuilder({ invested_amount: 100 }, null)
        if (table === 'inventory_holds') return createQueryBuilder([], null)
        return createQueryBuilder(null)
      })

      const result = await withdrawItem('prod-1', 1)
      expect(result).toEqual({ error: 'Límite de crédito excedido' })
    })
  })

  describe('transferItem', () => {
    it('debe transferir correctamente de A a B', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-A' } } })

      const mockHoldA = { id: 'hold-A', quantity: 5 }
      const mockHoldB = null 

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'inventory_holds') {
          const builder = createQueryBuilder(null)
          // Sobrescribir single para devolver A primero y luego B
          builder.single = jest.fn()
            .mockResolvedValueOnce({ data: mockHoldA, error: null })
            .mockResolvedValueOnce({ data: mockHoldB, error: null })
          return builder
        }
        return createQueryBuilder(null)
      })

      const result = await transferItem('prod-1', 'user-B', 1)
      
      expect(result).toEqual({ success: true })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('inventory_holds')
    })
  })

  describe('returnItem', () => {
    it('debe devolver stock al almacén usando RPC', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
      const mockHold = { id: 'hold-1', quantity: 1 }
      
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'inventory_holds') return createQueryBuilder(mockHold, null)
        return createQueryBuilder(null)
      })

      // Mock RPC success
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null })

      const result = await returnItem('prod-1', 1)
      
      expect(result).toEqual({ success: true })
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('return_stock_secure', { p_id: 'prod-1', qty: 1 })
    })
  })

  describe('registerBatchContribution', () => {
    it('debe registrar dinero y stock', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin' } } })
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'profiles') return createQueryBuilder({ role: 'admin', invested_amount: 0 }, null)
        if (table === 'products') return createQueryBuilder({ current_stock: 0 }, null)
        return createQueryBuilder(null)
      })

      const contributions = [{ userId: 'user-1', amount: 100 }]
      const stock = [{ productId: 'prod-1', quantity: 10 }]

      await registerBatchContribution('Test Batch', contributions, stock)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('capital_entries')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
    })
  })
})
