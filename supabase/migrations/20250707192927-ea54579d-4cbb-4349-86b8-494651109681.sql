
-- Create table for user language preferences
CREATE TABLE public.user_language_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Enable RLS on the table
ALTER TABLE public.user_language_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user language preferences
CREATE POLICY "Users can view their own language preference" 
  ON public.user_language_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own language preference" 
  ON public.user_language_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own language preference" 
  ON public.user_language_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create function to automatically insert default language preference for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_language()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_language_preferences (user_id, language)
  VALUES (NEW.id, 'en');
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set default language for new users
CREATE TRIGGER on_auth_user_created_language
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_language();
