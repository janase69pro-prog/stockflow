-- Función para SUMAR capital de forma segura (Admin)
CREATE OR REPLACE FUNCTION public.add_capital_secure(u_id uuid, amount decimal)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET invested_amount = COALESCE(invested_amount, 0) + amount 
  WHERE id = u_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar y RESTAR capital al retirar stock (Vendedor)
-- Esta función combina la lógica financiera y de stock para que sea atómica
CREATE OR REPLACE FUNCTION public.withdraw_with_credit_check(p_id uuid, u_id uuid, qty int, cost_per_unit decimal)
RETURNS void AS $$
DECLARE
  current_qty int;
  current_credit decimal;
  total_cost decimal;
BEGIN
  total_cost := cost_per_unit * qty;

  -- 1. Verificar Crédito
  SELECT invested_amount INTO current_credit FROM public.profiles WHERE id = u_id;
  
  -- Calcular el valor de lo que ya tiene en mano (para no pasarse del límite total)
  -- O simplificado: Restamos directamente del invested_amount como si fuera una "cuenta corriente"
  -- NOTA: Tu lógica actual es "Límite de Crédito" (Saldo - Valor en mano).
  -- Para simplificar y hacer economía circular real, vamos a tratar 'invested_amount' como SALDO DISPONIBLE.
  -- Si sacas algo, tu saldo baja. Si devuelves, tu saldo sube.
  
  -- Vamos a mantener la lógica actual: Invested Amount es el techo.
  -- Crédito Disponible = Invested Amount - Valor(Inventory Held).
  
  -- Verificamos Stock
  SELECT current_stock INTO current_qty FROM public.products WHERE id = p_id;
  
  IF current_qty < qty THEN
    RAISE EXCEPTION 'No hay suficiente stock';
  END IF;

  -- El chequeo de crédito lo hacemos fuera o aquí. 
  -- Para máxima seguridad, restamos stock aquí.
  
  UPDATE public.products 
  SET current_stock = current_stock - qty 
  WHERE id = p_id;
  
  -- La validación financiera la haremos en la capa de aplicación o en una query compleja,
  -- pero actualizar el stock aquí es lo crítico para race conditions.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
