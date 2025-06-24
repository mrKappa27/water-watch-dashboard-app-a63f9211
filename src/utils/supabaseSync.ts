
import { supabase } from '@/integrations/supabase/client';
import { ParsedDataPoint } from '@/types/dataTypes';

export const syncDataToSupabase = async (data: ParsedDataPoint[], userId: string) => {
  try {
    // Transform ParsedDataPoint to match the water_consumption_metrics table structure
    const supabaseData = data.map(point => {
      const values = point.values;
      
      // Helper function to convert to number or null
      const toNumber = (value: any): number | null => {
        if (value === null || value === undefined || value === '') return null;
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      // Helper function to convert to string or null
      const toString = (value: any): string | null => {
        if (value === null || value === undefined || value === '') return null;
        return String(value);
      };
      
      return {
        location: point.location,
        filename: point.filename,
        user_id: userId,
        time: point.datetime instanceof Date ? point.datetime.toISOString() : new Date(point.datetime).toISOString(),
        type: toString(values.type || values.Type),
        din1: toNumber(values.din1 || values.DIN1),
        din2: toNumber(values.din2 || values.DIN2),
        din3: toNumber(values.din3 || values.DIN3),
        din4: toNumber(values.din4 || values.DIN4),
        dout1: toNumber(values.dout1 || values.DOUT1),
        dout2: toNumber(values.dout2 || values.DOUT2),
        vbat: toNumber(values.vbat || values.VBAT),
        pow: toNumber(values.pow || values.POW),
        tot1: toNumber(values.tot1 || values.TOT1),
        cnt1: toNumber(values.cnt1 || values.CNT1),
        delta1: toNumber(values.delta1 || values.DELTA1),
        tot2: toNumber(values.tot2 || values.TOT2),
        cnt2: toNumber(values.cnt2 || values.CNT2),
        delta2: toNumber(values.delta2 || values.DELTA2),
        tot3: toNumber(values.tot3 || values.TOT3),
        cnt3: toNumber(values.cnt3 || values.CNT3),
        delta3: toNumber(values.delta3 || values.DELTA3),
        tot4: toNumber(values.tot4 || values.TOT4),
        cnt4: toNumber(values.cnt4 || values.CNT4),
        delta4: toNumber(values.delta4 || values.DELTA4),
        gsm: toNumber(values.gsm || values.GSM),
        temp: toNumber(values.temp || values.TEMP),
        tavg: toNumber(values.tavg || values.TAVG),
        tmin: toNumber(values.tmin || values.TMIN),
        tmax: toNumber(values.tmax || values.TMAX)
      };
    });

    // Insert data in batches to avoid potential issues with large datasets
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < supabaseData.length; i += batchSize) {
      const batch = supabaseData.slice(i, i + batchSize);
      const { data: insertedData, error } = await supabase
        .from('water_consumption_metrics')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
      
      results.push(...(insertedData || []));
    }

    return { data: results, error: null };
  } catch (error) {
    console.error('Error syncing data to Supabase:', error);
    return { data: null, error };
  }
};
