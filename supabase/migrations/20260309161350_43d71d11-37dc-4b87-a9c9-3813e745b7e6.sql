
-- Step 1: Convert column to text temporarily
ALTER TABLE public.products 
  ALTER COLUMN type DROP DEFAULT,
  ALTER COLUMN type TYPE text USING type::text;

-- Step 2: Update existing data to new values
UPDATE public.products SET type = 'DIGITAL' WHERE type = 'DIGITAL_PRODUCT';
UPDATE public.products SET type = 'SERVICE' WHERE type = 'COACHING_CALL';
UPDATE public.products SET type = 'COURSE' WHERE type = 'ECOURSE';
UPDATE public.products SET type = 'COURSE' WHERE type = 'MEMBERSHIP';
UPDATE public.products SET type = 'DIGITAL' WHERE type = 'LINK';

-- Step 3: Drop old enum
DROP TYPE public.product_type;

-- Step 4: Create new enum
CREATE TYPE public.product_type AS ENUM ('DIGITAL', 'COURSE', 'SERVICE', 'PHYSICAL', 'LEAD_MAGNET');

-- Step 5: Convert column back to enum
ALTER TABLE public.products 
  ALTER COLUMN type TYPE public.product_type USING type::public.product_type,
  ALTER COLUMN type SET DEFAULT 'DIGITAL'::public.product_type;
