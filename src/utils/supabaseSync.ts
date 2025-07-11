import { supabase } from '@/integrations/supabase/client';
import { ParsedDataPoint, LocationStats } from '@/types/dataTypes';

export const checkFileExists = async (filename: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('water_consumption_metrics')
      .select('filename')
      .eq('filename', filename)
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking file existence:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

// Helper function to check if user is admin
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('has_role', { 
        _user_id: userId, 
        _role: 'admin' 
      });

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const fetchDataFromDatabase = async (
  userId: string, 
  dateFrom?: Date, 
  dateTo?: Date
): Promise<ParsedDataPoint[]> => {
  try {
    console.log('Fetching data from database for user:', userId, 'Date range:', dateFrom, 'to', dateTo);
    
    // Check if user is admin
    const isAdmin = await checkIsAdmin(userId);
    console.log('User is admin:', isAdmin);
    
    let allData: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // Fetch in batches of 1000
    
    while (hasMore) {
      console.log(`Fetching page ${page + 1} (records ${page * pageSize} to ${(page + 1) * pageSize})...`);
      
      // Build query - don't filter by user_id if admin
      // ENFORCE ASCENDING ORDER BY TIME for chart data consistency
      let query = supabase
        .from('water_consumption_metrics')
        .select('*')
        .order('time', { ascending: true })
        .order('id', { ascending: true }) // Secondary sort by id for consistent ordering when timestamps are identical
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq('user_id', userId);
      }

      // Add date range filtering if provided
      if (dateFrom) {
        query = query.gte('time', dateFrom.toISOString());
      }
      if (dateTo) {
        // Add 23:59:59 to include the entire end date
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('time', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching data from database:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        console.log(`Fetched ${data.length} records on page ${page + 1}. Total so far: ${allData.length}`);
        
        // If we got less than pageSize records, we've reached the end
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    console.log('Total records fetched from database:', allData.length);

    // Transform database records back to ParsedDataPoint format
    const transformedData = allData.map(record => ({
      id: `${record.filename}-${record.id}`,
      location: record.location || '',
      datetime: new Date(record.time || ''),
      filename: record.filename || '',
      values: {
        type: record.type,
        din1: record.din1,
        din2: record.din2,
        din3: record.din3,
        din4: record.din4,
        dout1: record.dout1,
        dout2: record.dout2,
        vbat: record.vbat,
        pow: record.pow,
        tot1: record.tot1,
        cnt1: record.cnt1,
        delta1: record.delta1,
        tot2: record.tot2,
        cnt2: record.cnt2,
        delta2: record.delta2,
        tot3: record.tot3,
        cnt3: record.cnt3,
        delta3: record.delta3,
        tot4: record.tot4,
        cnt4: record.cnt4,
        delta4: record.delta4,
        gsm: record.gsm,
        temp: record.temp,
        tavg: record.tavg,
        tmin: record.tmin,
        tmax: record.tmax
      }
    }));

    console.log('Transformed data points:', transformedData.length);
    return transformedData;
  } catch (error) {
    console.error('Error fetching data from database:', error);
    return [];
  }
};

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

export const getTotalRecordCount = async (userId: string, dateFrom?: Date, dateTo?: Date): Promise<number> => {
  try {
    // Check if user is admin
    const isAdmin = await checkIsAdmin(userId);
    
    let query = supabase
      .from('water_consumption_metrics')
      .select('*', { count: 'exact', head: true });
    
    // Only filter by user_id if not admin
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    // Add date range filtering if provided
    if (dateFrom) {
      query = query.gte('time', dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('time', endOfDay.toISOString());
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting total record count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting total record count:', error);
    return 0;
  }
};

export const getLocationStats = async (userId: string, dateFrom?: Date, dateTo?: Date): Promise<LocationStats[]> => {
  try {
    // Check if user is admin
    const isAdmin = await checkIsAdmin(userId);
    
    // Get unique locations and their record counts
    let locationQuery = supabase
      .from('water_consumption_metrics')
      .select('location')
      .not('location', 'is', null);
    
    // Only filter by user_id if not admin
    if (!isAdmin) {
      locationQuery = locationQuery.eq('user_id', userId);
    }

    // Add date range filtering if provided
    if (dateFrom) {
      locationQuery = locationQuery.gte('time', dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      locationQuery = locationQuery.lte('time', endOfDay.toISOString());
    }

    const { data: locationData, error: locationError } = await locationQuery;

    if (locationError) {
      console.error('Error fetching locations:', locationError);
      return [];
    }

    // Get unique locations
    const uniqueLocations = [...new Set(locationData.map(item => item.location))];
    
    const locationStats: LocationStats[] = [];

    // For each location, get detailed stats
    for (const location of uniqueLocations) {
      if (!location) continue;

      // Get count for this location
      let countQuery = supabase
        .from('water_consumption_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('location', location);
      
      if (!isAdmin) {
        countQuery = countQuery.eq('user_id', userId);
      }

      // Add date range filtering if provided
      if (dateFrom) {
        countQuery = countQuery.gte('time', dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        countQuery = countQuery.lte('time', endOfDay.toISOString());
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error(`Error getting count for location ${location}:`, countError);
        continue;
      }

      // Get date range and sample data for averages - ENSURE ASCENDING ORDER
      let dataQuery = supabase
        .from('water_consumption_metrics')
        .select('time, tot1, tot2, tot3, tot4, temp, vbat')
        .eq('location', location)
        .order('time', { ascending: true });
      
      if (!isAdmin) {
        dataQuery = dataQuery.eq('user_id', userId);
      }

      // Add date range filtering if provided
      if (dateFrom) {
        dataQuery = dataQuery.gte('time', dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        dataQuery = dataQuery.lte('time', endOfDay.toISOString());
      }

      const { data: dateRangeData, error: dateError } = await dataQuery;

      if (dateError || !dateRangeData || dateRangeData.length === 0) {
        console.error(`Error getting date range for location ${location}:`, dateError);
        continue;
      }

      const firstRecord = dateRangeData[0];
      const lastRecord = dateRangeData[dateRangeData.length - 1];

      // Calculate averages - ensure only numbers are included
      const averageValues: Record<string, number> = {};
      const numericFields = ['tot1', 'tot2', 'tot3', 'tot4', 'temp', 'vbat'];
      
      numericFields.forEach(field => {
        const values = dateRangeData
          .map(record => record[field as keyof typeof record])
          .filter(val => val !== null && val !== undefined && typeof val === 'number') as number[];
        
        if (values.length > 0) {
          averageValues[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
      });

      locationStats.push({
        location,
        totalRecords: count || 0,
        dateRange: {
          start: new Date(firstRecord.time),
          end: new Date(lastRecord.time)
        },
        averageValues,
        lastUpdate: new Date(lastRecord.time)
      });
    }

    return locationStats;
  } catch (error) {
    console.error('Error getting location stats:', error);
    return [];
  }
};

export const getLastUpdateTime = async (userId: string, dateFrom?: Date, dateTo?: Date): Promise<Date | null> => {
  try {
    // Check if user is admin
    const isAdmin = await checkIsAdmin(userId);
    
    let query = supabase
      .from('water_consumption_metrics')
      .select('time')
      .order('time', { ascending: false })
      .limit(1);
    
    // Only filter by user_id if not admin
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    // Add date range filtering if provided
    if (dateFrom) {
      query = query.gte('time', dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('time', endOfDay.toISOString());
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.error('Error getting last update time:', error);
      return null;
    }

    return new Date(data.time);
  } catch (error) {
    console.error('Error getting last update time:', error);
    return null;
  }
};
