
import { supabase } from '@/integrations/supabase/client';

export interface ChartPreferences {
  visibleParams: Record<string, boolean>;
  columnAliases: Record<string, string>;
}

const isValidVisibleParams = (value: any): value is Record<string, boolean> => {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.values(value).every(v => typeof v === 'boolean');
};

const isValidColumnAliases = (value: any): value is Record<string, string> => {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.values(value).every(v => typeof v === 'string');
};

export const loadUserChartPreferences = async (userId: string, location: string): Promise<ChartPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_chart_preferences')
      .select('visible_params, column_aliases')
      .eq('user_id', userId)
      .eq('location', location)
      .maybeSingle();

    if (error) {
      console.error('Error loading chart preferences:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      visibleParams: isValidVisibleParams(data.visible_params) ? data.visible_params : {},
      columnAliases: isValidColumnAliases(data.column_aliases) ? data.column_aliases : {}
    };
  } catch (error) {
    console.error('Error loading chart preferences:', error);
    return null;
  }
};

export const saveUserChartPreferences = async (
  userId: string, 
  location: string, 
  preferences: ChartPreferences
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_chart_preferences')
      .upsert({
        user_id: userId,
        location: location,
        visible_params: preferences.visibleParams,
        column_aliases: preferences.columnAliases,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,location'
      });

    if (error) {
      console.error('Error saving chart preferences:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving chart preferences:', error);
    return false;
  }
};
