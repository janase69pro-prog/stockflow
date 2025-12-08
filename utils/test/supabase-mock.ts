// utils/test/supabase-mock.ts

export const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
}

export const resetSupabaseMocks = () => {
  mockSupabaseClient.from.mockReset();
  mockSupabaseClient.auth.getUser.mockReset();
  mockSupabaseClient.auth.signInWithPassword.mockReset(); // Reset pero mantener comportamiento base si se desea, o re-mockear en beforeEach
  // Restore default safe responses
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
  mockSupabaseClient.auth.updateUser.mockResolvedValue({ data: {}, error: null });
  mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
}

export const createQueryBuilder = (returnData: any, error: any = null) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error }),
    then: (resolve: any) => Promise.resolve({ data: returnData, error }).then(resolve)
  };
  return builder;
}