-- 1. Crear tabla de Familias (Padres)
CREATE TABLE public.product_families (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price decimal(10,2) DEFAULT 0.00,
  cost_price decimal(10,2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modificar tabla Productos (Hijos) para vincularla
ALTER TABLE public.products 
ADD COLUMN family_id uuid REFERENCES public.product_families(id) ON DELETE CASCADE;

-- 3. SCRIPT DE MIGRACIÓN AUTOMÁTICA
-- Esto coge tus productos actuales, agrupa por nombre, crea las familias y las vincula.
DO $$
DECLARE
  r RECORD;
  fam_id uuid;
BEGIN
  FOR r IN SELECT DISTINCT name, price, cost_price FROM public.products LOOP
    -- Crear Familia para este nombre
    INSERT INTO public.product_families (name, price, cost_price)
    VALUES (r.name, r.price, r.cost_price)
    RETURNING id INTO fam_id;

    -- Vincular los productos existentes a esta nueva familia
    UPDATE public.products 
    SET family_id = fam_id 
    WHERE name = r.name;
  END LOOP;
END $$;

-- 4. Hacer family_id obligatorio para el futuro (una vez migrado)
ALTER TABLE public.products ALTER COLUMN family_id SET NOT NULL;

-- Políticas de seguridad para la nueva tabla
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view families" ON public.product_families FOR SELECT USING (true);
CREATE POLICY "Admin manage families" ON public.product_families FOR ALL USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
