DO $$
DECLARE
  _user_to_delete uuid;
BEGIN
  -- 1. Buscar el ID (variable con guion bajo para evitar ambigüedad)
  SELECT id INTO _user_to_delete 
  FROM auth.users 
  WHERE email = 'unai@stockflow.app';

  IF _user_to_delete IS NOT NULL THEN
    
    -- 2. Borrar transacciones
    DELETE FROM public.transactions 
    WHERE user_id = _user_to_delete 
       OR target_user_id = _user_to_delete;

    -- 3. Borrar inventario
    DELETE FROM public.inventory_holds 
    WHERE user_id = _user_to_delete;

    -- 4. Borrar perfil
    DELETE FROM public.profiles 
    WHERE id = _user_to_delete;

    -- 5. Borrar usuario de autenticación
    DELETE FROM auth.users 
    WHERE id = _user_to_delete;
    
    RAISE NOTICE 'Usuario eliminado con éxito.';
  ELSE
    RAISE NOTICE 'Usuario no encontrado.';
  END IF;
END $$;