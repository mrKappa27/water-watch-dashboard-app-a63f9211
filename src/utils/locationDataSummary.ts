import { supabase } from '@/integrations/supabase/client';

interface LocationSummary {
  totalRecords: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  latestReading: {
    datetime: Date;
    temp?: number;
    vbat?: number;
    totalConsumption?: number;
    flowRate?: number;
  };
  trends: {
    consumption: 'up' | 'down' | 'stable';
    temperature: 'up' | 'down' | 'stable';
  };
  averages: {
    temperature?: number;
    battery?: number;
    dailyConsumption?: number;
  };
  status: 'active' | 'inactive' | 'warning';
}

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

export const getLocationDataSummary = async (
  userId: string, 
  locationName: string
): Promise<LocationSummary | null> => {
  try {
    // Check if user is admin
    const isAdmin = await checkIsAdmin(userId);
    
    // Build base query
    let query = supabase
      .from('water_consumption_metrics')
      .select('*')
      .eq('location', locationName)
      .order('time', { ascending: true });
    
    // Only filter by user_id if not admin
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching location data:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Calculate basic stats
    const totalRecords = data.length;
    const firstRecord = data[0];
    const lastRecord = data[data.length - 1];
    
    const dateRange = {
      start: new Date(firstRecord.time),
      end: new Date(lastRecord.time)
    };

    // Get latest reading values - handle null/0 values properly
    const latestReading = {
      datetime: new Date(lastRecord.time),
      temp: (lastRecord.temp !== null && lastRecord.temp !== undefined) ? lastRecord.temp : undefined,
      vbat: (lastRecord.vbat !== null && lastRecord.vbat !== undefined) ? lastRecord.vbat : undefined,
      totalConsumption: (lastRecord.tot1 !== null && lastRecord.tot1 !== undefined) ? lastRecord.tot1 : undefined,
      flowRate: (lastRecord.delta1 !== null && lastRecord.delta1 !== undefined) ? lastRecord.delta1 : undefined
    };

    // Calculate averages from all data
    const validTemps = data.filter(d => d.temp !== null && d.temp !== undefined).map(d => d.temp);
    const validVbats = data.filter(d => d.vbat !== null && d.vbat !== undefined).map(d => d.vbat);
    const validTotals = data.filter(d => d.tot1 !== null && d.tot1 !== undefined).map(d => d.tot1);

    const averages = {
      temperature: validTemps.length > 0 ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length : undefined,
      battery: validVbats.length > 0 ? validVbats.reduce((a, b) => a + b, 0) / validVbats.length : undefined,
      dailyConsumption: validTotals.length > 0 ? 
        (Math.max(...validTotals) - Math.min(...validTotals)) / 
        Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))) 
        : undefined
    };

    // Calculate trends by comparing recent vs older data
    const midPoint = Math.floor(data.length / 2);
    const olderHalf = data.slice(0, midPoint);
    const recentHalf = data.slice(midPoint);

    // Temperature trend - with safe calculations
    const olderTemps = olderHalf.filter(d => d.temp !== null && d.temp !== undefined);
    const recentTemps = recentHalf.filter(d => d.temp !== null && d.temp !== undefined);
    
    let temperatureTrend: 'up' | 'down' | 'stable' = 'stable';
    if (olderTemps.length > 0 && recentTemps.length > 0) {
      const olderTempAvg = olderTemps.reduce((a, b) => a + (b.temp || 0), 0) / olderTemps.length;
      const recentTempAvg = recentTemps.reduce((a, b) => a + (b.temp || 0), 0) / recentTemps.length;
      const tempDiff = recentTempAvg - olderTempAvg;
      temperatureTrend = Math.abs(tempDiff) < 1 ? 'stable' : (tempDiff > 0 ? 'up' : 'down');
    }
    
    // Consumption trend - with safe calculations  
    const olderCons = olderHalf.filter(d => d.delta1 !== null && d.delta1 !== undefined);
    const recentCons = recentHalf.filter(d => d.delta1 !== null && d.delta1 !== undefined);
    
    let consumptionTrend: 'up' | 'down' | 'stable' = 'stable';
    if (olderCons.length > 0 && recentCons.length > 0) {
      const olderConsAvg = olderCons.reduce((a, b) => a + (b.delta1 || 0), 0) / olderCons.length;
      const recentConsAvg = recentCons.reduce((a, b) => a + (b.delta1 || 0), 0) / recentCons.length;
      const consDiff = recentConsAvg - olderConsAvg;
      consumptionTrend = Math.abs(consDiff) < 0.1 ? 'stable' : (consDiff > 0 ? 'up' : 'down');
    }

    const trends = {
      temperature: temperatureTrend,
      consumption: consumptionTrend
    };

    // Determine status based on recency and data quality
    const daysSinceLastReading = (new Date().getTime() - dateRange.end.getTime()) / (1000 * 60 * 60 * 24);
    const batteryLevel = latestReading.vbat || 0;
    
    let status: 'active' | 'inactive' | 'warning';
    if (daysSinceLastReading > 7) {
      status = 'inactive';
    } else if (daysSinceLastReading > 2 || batteryLevel < 3.0) {
      status = 'warning';
    } else {
      status = 'active';
    }

    return {
      totalRecords,
      dateRange,
      latestReading,
      trends,
      averages,
      status
    };
  } catch (error) {
    console.error('Error getting location data summary:', error);
    throw error;
  }
};