
import { supabase } from '@/integrations/supabase/client';

export interface LeakDetectionThresholds {
  id?: string;
  user_id: string;
  location: string;
  good_threshold: number;
  warning_threshold: number;
  high_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export const getLeakDetectionThresholds = async (userId: string, location: string): Promise<LeakDetectionThresholds | null> => {
  try {
    const { data, error } = await supabase
      .from('leak_detection_thresholds')
      .select('*')
      .eq('user_id', userId)
      .eq('location', location)
      .maybeSingle();

    if (error) {
      console.error('Error fetching leak detection thresholds:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching leak detection thresholds:', error);
    return null;
  }
};

export const saveLeakDetectionThresholds = async (thresholds: LeakDetectionThresholds): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('leak_detection_thresholds')
      .upsert({
        user_id: thresholds.user_id,
        location: thresholds.location,
        good_threshold: thresholds.good_threshold,
        warning_threshold: thresholds.warning_threshold,
        high_threshold: thresholds.high_threshold,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,location'
      });

    if (error) {
      console.error('Error saving leak detection thresholds:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving leak detection thresholds:', error);
    return false;
  }
};
