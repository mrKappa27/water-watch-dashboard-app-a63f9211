
import { supabase } from '@/integrations/supabase/client';
import { ParsedDataPoint } from '@/types/dataTypes';

export const syncDataToSupabase = async (data: ParsedDataPoint[], userId: string) => {
  try {
    // Transform ParsedDataPoint to match the water_consumption_metrics table structure
    const supabaseData = data.map(point => {
      const values = point.values;
      
      return {
        location: point.location,
        filename: point.filename,
        user_id: userId,
        time: point.datetime instanceof Date ? point.datetime.toISOString() : new Date(point.datetime).toISOString(),
        type: values.type || values.Type || null,
        din1: values.din1 || values.DIN1 || null,
        din2: values.din2 || values.DIN2 || null,
        din3: values.din3 || values.DIN3 || null,
        din4: values.din4 || values.DIN4 || null,
        dout1: values.dout1 || values.DOUT1 || null,
        dout2: values.dout2 || values.DOUT2 || null,
        vbat: values.vbat || values.VBAT || null,
        pow: values.pow || values.POW || null,
        tot1: values.tot1 || values.TOT1 || null,
        cnt1: values.cnt1 || values.CNT1 || null,
        delta1: values.delta1 || values.DELTA1 || null,
        tot2: values.tot2 || values.TOT2 || null,
        cnt2: values.cnt2 || values.CNT2 || null,
        delta2: values.delta2 || values.DELTA2 || null,
        tot3: values.tot3 || values.TOT3 || null,
        cnt3: values.cnt3 || values.CNT3 || null,
        delta3: values.delta3 || values.DELTA3 || null,
        tot4: values.tot4 || values.TOT4 || null,
        cnt4: values.cnt4 || values.CNT4 || null,
        delta4: values.delta4 || values.DELTA4 || null,
        gsm: values.gsm || values.GSM || null,
        temp: values.temp || values.TEMP || null,
        tavg: values.tavg || values.TAVG || null,
        tmin: values.tmin || values.TMIN || null,
        tmax: values.tmax || values.TMAX || null
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
