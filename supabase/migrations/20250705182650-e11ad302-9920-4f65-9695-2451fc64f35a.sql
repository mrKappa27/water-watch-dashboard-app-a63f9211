
-- Update RLS policy for water_consumption_metrics to allow admins to see all data
DROP POLICY IF EXISTS "Users can view their own water consumption data" ON public.water_consumption_metrics;

CREATE POLICY "Users can view their own water consumption data" 
  ON public.water_consumption_metrics 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Update RLS policy for leak_detection_thresholds to allow admins to see all thresholds
DROP POLICY IF EXISTS "Users can view their own thresholds" ON public.leak_detection_thresholds;

CREATE POLICY "Users can view their own thresholds" 
  ON public.leak_detection_thresholds 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Update RLS policy for user_chart_preferences to allow admins to see all preferences
DROP POLICY IF EXISTS "Users can view their own chart preferences" ON public.user_chart_preferences;

CREATE POLICY "Users can view their own chart preferences" 
  ON public.user_chart_preferences 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    has_role(auth.uid(), 'admin'::app_role)
  );
