-- Función para que los vendedores puedan RETIRAR stock global de forma segura
CREATE OR REPLACE FUNCTION public.withdraw_stock_secure(p_id uuid, qty int)
RETURNS void AS $$
DECLARE
  current_qty int;
BEGIN
  -- 1. Verificar stock actual
  SELECT current_stock INTO current_qty FROM public.products WHERE id = p_id;
  
  IF current_qty >= qty THEN
    -- 2. Restar stock (Se ejecuta con permisos de Admin gracias a SECURITY DEFINER)
    UPDATE public.products 
    SET current_stock = current_stock - qty 
    WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'No hay suficiente stock';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para que los vendedores puedan DEVOLVER stock global
CREATE OR REPLACE FUNCTION public.return_stock_secure(p_id uuid, qty int)
RETURNS void AS $$
BEGIN
  -- Sumar stock de vuelta al almacén
  UPDATE public.products 
  SET current_stock = current_stock + qty 
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
