-- 1. Añadir columna invested_amount si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'invested_amount') THEN
        ALTER TABLE public.profiles ADD COLUMN invested_amount decimal(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. Reparar valores NULL para evitar NaN en el frontend
UPDATE public.profiles 
SET invested_amount = 0 
WHERE invested_amount IS NULL;
