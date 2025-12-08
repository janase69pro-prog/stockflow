-- 1. Asegurar que el stock global nunca sea negativo
ALTER TABLE public.products 
ADD CONSTRAINT products_stock_non_negative CHECK (current_stock >= 0);

-- 2. Asegurar que el stock en mano nunca sea negativo
ALTER TABLE public.inventory_holds 
ADD CONSTRAINT holds_quantity_non_negative CHECK (quantity >= 0);

-- 3. Asegurar que el precio nunca sea negativo (por si acaso)
ALTER TABLE public.products 
ADD CONSTRAINT products_price_positive CHECK (price >= 0);
ALTER TABLE public.products 
ADD CONSTRAINT products_cost_positive CHECK (cost_price >= 0);
