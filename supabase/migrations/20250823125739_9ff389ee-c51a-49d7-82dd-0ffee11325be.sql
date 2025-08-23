-- Create table for location GPS coordinates
CREATE TABLE public.location_coordinates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.location_coordinates ENABLE ROW LEVEL SECURITY;

-- Create policies for location coordinates (globally accessible)
CREATE POLICY "Anyone can view location coordinates" 
ON public.location_coordinates 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create location coordinates" 
ON public.location_coordinates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update location coordinates" 
ON public.location_coordinates 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete location coordinates" 
ON public.location_coordinates 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_location_coordinates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_location_coordinates_updated_at
BEFORE UPDATE ON public.location_coordinates
FOR EACH ROW
EXECUTE FUNCTION public.update_location_coordinates_updated_at();