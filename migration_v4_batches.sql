-- Tabla para registrar las aportaciones de capital por lotes
CREATE TABLE public.capital_entries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_name text NOT NULL, -- Ej: "Compra Noviembre"
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  amount decimal(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de seguridad (RLS)
ALTER TABLE public.capital_entries ENABLE ROW LEVEL SECURITY;

-- El admin puede ver y crear todo
CREATE POLICY "Admin can manage capital entries" ON public.capital_entries
  FOR ALL USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Los usuarios pueden ver sus propias aportaciones (transparencia)
CREATE POLICY "Users can see own capital entries" ON public.capital_entries
  FOR SELECT USING (auth.uid() = user_id);
