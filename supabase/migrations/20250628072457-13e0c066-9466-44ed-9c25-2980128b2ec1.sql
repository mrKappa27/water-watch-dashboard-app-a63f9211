
-- Create a table for leak detection thresholds
CREATE TABLE public.leak_detection_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location TEXT NOT NULL,
  good_threshold NUMERIC NOT NULL DEFAULT 0.5,
  warning_threshold NUMERIC NOT NULL DEFAULT 2.0,
  high_threshold NUMERIC NOT NULL DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, location)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.leak_detection_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own thresholds" 
  ON public.leak_detection_thresholds 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own thresholds" 
  ON public.leak_detection_thresholds 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thresholds" 
  ON public.leak_detection_thresholds 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thresholds" 
  ON public.leak_detection_thresholds 
  FOR DELETE 
  USING (auth.uid() = user_id);
