-- Fix search_path for existing functions to address security warnings
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'borghi.kevin@gmail.com' THEN
    is_admin := TRUE;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');

  -- Insert role (admin for specific email, user for others)
  IF is_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix search_path for handle_new_user_language function
CREATE OR REPLACE FUNCTION public.handle_new_user_language()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_language_preferences (user_id, language)
  VALUES (NEW.id, 'en');
  RETURN NEW;
END;
$function$;

-- Fix search_path for the new function as well
CREATE OR REPLACE FUNCTION public.update_location_coordinates_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;