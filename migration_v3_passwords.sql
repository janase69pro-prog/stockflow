-- 1. Añadir columna para forzar cambio de password
ALTER TABLE public.profiles 
ADD COLUMN must_change_password boolean DEFAULT false;

-- 2. (Opcional) Script para forzar a los usuarios específicos cuando se creen
-- Ejecuta esto DESPUÉS de crear los usuarios en Supabase Auth, o ejecuta esta regla
-- para que se aplique automáticamente si el email coincide con los vendedores.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, must_change_password)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    'seller',
    CASE 
      WHEN new.email IN ('unai@stockflow.app', 'claudia@stockflow.app', 'jose@stockflow.app', 'maria@stockflow.app') THEN true 
      ELSE false 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
