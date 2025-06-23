
-- Add location column to water_consumption_metrics table
ALTER TABLE public.water_consumption_metrics 
ADD COLUMN location TEXT;

-- Add filename column to track source file
ALTER TABLE public.water_consumption_metrics 
ADD COLUMN filename TEXT;

-- Add user_id column to associate data with users
ALTER TABLE public.water_consumption_metrics 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.water_consumption_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own data
CREATE POLICY "Users can view their own water consumption data" 
  ON public.water_consumption_metrics 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert their own water consumption data" 
  ON public.water_consumption_metrics 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update their own water consumption data" 
  ON public.water_consumption_metrics 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own data
CREATE POLICY "Users can delete their own water consumption data" 
  ON public.water_consumption_metrics 
  FOR DELETE 
  USING (auth.uid() = user_id);
