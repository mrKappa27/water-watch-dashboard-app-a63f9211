
-- Create table for user preferences
CREATE TABLE public.user_chart_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location TEXT NOT NULL,
  visible_params JSONB NOT NULL DEFAULT '{}',
  column_aliases JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, location)
);

-- Enable RLS
ALTER TABLE public.user_chart_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences
CREATE POLICY "Users can view their own chart preferences" 
  ON public.user_chart_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chart preferences" 
  ON public.user_chart_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chart preferences" 
  ON public.user_chart_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chart preferences" 
  ON public.user_chart_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);
