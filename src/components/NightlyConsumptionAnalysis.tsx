import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";

interface DatabaseRecord {
  id: number;
  location: string;
  time: string;
  delta1: number | null;
  delta2: number | null;
  delta3: number | null;
  delta4: number | null;
}

const NightlyConsumptionAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch all records by using a large limit and potentially paginating if needed
        let allData: DatabaseRecord[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: dbData, error } = await supabase
            .from('water_consumption_metrics')
            .select('id, location, time, delta1, delta2, delta3, delta4')
            .eq('user_id', user.id)
            .order('time', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) {
            console.error('Error fetching data from database:', error);
            toast({
              title: "Error",
              description: "Failed to load data from database",
              variant: "destructive",
            });
            break;
          }

          if (!dbData || dbData.length === 0) {
            hasMore = false;
          } else {
            allData = [...allData, ...dbData];
            hasMore = dbData.length === batchSize;
            from += batchSize;
          }
        }

        console.log('Fetched all data from database:', allData.length, 'records');
        console.log('Latest record:', allData[0]);
        setData(allData);
      } catch (error) {
        console.error('Error fetching data from database:', error);
        toast({
          title: "Error",
          description: "Failed to load data from database",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Compute daily minimum for DELTA1-4 per location, focusing on 2AM-5AM
  const dailyNightMinStats = useMemo(() => {
    const stats: Record<string, Record<string, Record<string, number | null>>> = {};
    
    data.forEach(record => {
      if (!record.location || !record.time) return;
      
      const datetime = new Date(record.time);
      const location = record.location;
      const dateKey = datetime.toISOString().split('T')[0];
      const hour = datetime.getHours();
      
      // Only consider data between 2AM and 5AM
      if (hour < 2 || hour > 5) return;

      if (!stats[location]) stats[location] = {};
      if (!stats[location][dateKey]) stats[location][dateKey] = {};

      for (let i = 1; i <= 4; i++) {
        const key = `DELTA${i}`;
        const deltaKey = `delta${i}` as keyof typeof record;
        const val = record[deltaKey];
        
        if (typeof val === 'number') {
          if (
            stats[location][dateKey][key] === undefined ||
            val < (stats[location][dateKey][key] as number)
          ) {
            stats[location][dateKey][key] = val;
          }
        }
      }
    });

    // Set null for days with no data
    Object.values(stats).forEach(locationStats => {
      Object.values(locationStats).forEach(dayStats => {
        for (let i = 1; i <= 4; i++) {
          const key = `DELTA${i}`;
          if (dayStats[key] === undefined) dayStats[key] = null;
        }
      });
    });

    return stats;
  }, [data]);

  // Calculate location statistics with proper latest data
  const locationStats = useMemo(() => {
    const statsMap = new Map<string, {
      location: string;
      totalRecords: number;
      lastUpdate: Date | null;
      dateRange: { start: Date | null; end: Date | null };
    }>();

    data.forEach(record => {
      if (!record.location || !record.time) return;
      
      const datetime = new Date(record.time);
      const location = record.location;

      if (!statsMap.has(location)) {
        statsMap.set(location, {
          location,
          totalRecords: 0,
          lastUpdate: datetime,
          dateRange: { start: datetime, end: datetime }
        });
      }

      const stats = statsMap.get(location)!;
      stats.totalRecords++;
      
      if (!stats.dateRange.start || datetime < stats.dateRange.start) {
        stats.dateRange.start = datetime;
      }
      if (!stats.dateRange.end || datetime > stats.dateRange.end) {
        stats.dateRange.end = datetime;
      }
      if (!stats.lastUpdate || datetime > stats.lastUpdate) {
        stats.lastUpdate = datetime;
      }
    });

    return Array.from(statsMap.values());
  }, [data]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (data.length === 0) return { totalRecords: 0, locations: 0, latestUpdate: null };

    const latestRecord = data.reduce((latest, current) => {
      const currentTime = new Date(current.time);
      const latestTime = new Date(latest.time);
      return currentTime > latestTime ? current : latest;
    });

    return {
      totalRecords: data.length,
      locations: new Set(data.map(d => d.location).filter(Boolean)).size,
      latestUpdate: new Date(latestRecord.time)
    };
  }, [data]);

  // Helper function to determine the status of a consumption value
  const getConsumptionStatus = (value: number | null) => {
    if (value === null || value === undefined) return 'no-data';
    if (value <= 0.5) return 'good'; // Near zero consumption
    if (value <= 2.0) return 'warning'; // Low consumption
    return 'high'; // High consumption (potential leak)
  };

  // Helper function to get the appropriate icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'high':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <span className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Good</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      default:
        return <Badge variant="outline">No Data</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nightly Water Consumption Analysis (2AM-5AM)</CardTitle>
          <CardDescription>Loading all data from database...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-lg">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nightly Water Consumption Analysis (2AM-5AM)</CardTitle>
          <CardDescription>
            No DELTA1-4 data available in the database for leak detection analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            Upload data files containing DELTA1-4 measurements to see nightly consumption analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(dailyNightMinStats).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nightly Water Consumption Analysis (2AM-5AM)</CardTitle>
          <CardDescription>
            No DELTA1-4 data available in the 2AM-5AM window for leak detection analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            Database contains {data.length.toLocaleString()} records, but none in the 2AM-5AM time window.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nightly Water Consumption Analysis (2AM-5AM)</CardTitle>
        <CardDescription>
          Minimum consumption values during low-usage hours from database. 
          Total records: {overallStats.totalRecords.toLocaleString()}. 
          Values near zero indicate no leaks, while higher values may suggest potential issues.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Database Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{overallStats.totalRecords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{overallStats.locations}</div>
              <div className="text-sm text-muted-foreground">Locations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {overallStats.latestUpdate 
                  ? overallStats.latestUpdate.toLocaleDateString()
                  : 'N/A'
                }
              </div>
              <div className="text-sm text-muted-foreground">Latest Data</div>
              {overallStats.latestUpdate && (
                <div className="text-xs text-muted-foreground mt-1">
                  {overallStats.latestUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">≤ 0.5: Good (No leak detected)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">0.5-2.0: Warning (Monitor)</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm">&gt; 2.0: High (Potential leak)</span>
            </div>
          </div>

          {Object.entries(dailyNightMinStats).map(([location, days]) => {
            const locationStat = locationStats.find(stat => stat.location === location);
            
            return (
              <div key={location} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-lg font-semibold">{location}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{locationStat?.totalRecords || 0} total records</span>
                    <span>Last: {locationStat?.lastUpdate?.toLocaleDateString() || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border px-3 py-2 text-left">Date</th>
                        {[1, 2, 3, 4].map(i => (
                          <th key={i} className="border border-border px-3 py-2 text-center">
                            DELTA{i}
                          </th>
                        ))}
                        <th className="border border-border px-3 py-2 text-center">Daily Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(days)
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Sort by date descending
                        .map(([date, stats]) => {
                          // Calculate overall daily status
                          const deltaValues = [1, 2, 3, 4].map(i => stats[`DELTA${i}`]);
                          const validValues = deltaValues.filter(val => val !== null && val !== undefined) as number[];
                          const hasGoodReading = validValues.some(val => val <= 0.5);
                          const allHighValues = validValues.length > 0 && validValues.every(val => val > 2.0);
                          const dailyStatus = validValues.length === 0 ? 'no-data' : 
                                            hasGoodReading ? 'good' : 
                                            allHighValues ? 'high' : 'warning';

                          return (
                            <tr key={date} className="hover:bg-muted/25">
                              <td className="border border-border px-3 py-2 font-medium">
                                {new Date(date).toLocaleDateString()}
                              </td>
                              {[1, 2, 3, 4].map(i => {
                                const val = stats[`DELTA${i}`];
                                const status = getConsumptionStatus(val);
                                
                                return (
                                  <td key={i} className="border border-border px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {getStatusIcon(status)}
                                      {val === null || val === undefined ? (
                                        <span className="text-muted-foreground">-</span>
                                      ) : (
                                        <span className={
                                          status === 'good' ? 'text-green-700' :
                                          status === 'warning' ? 'text-yellow-700' :
                                          status === 'high' ? 'text-red-700' : ''
                                        }>
                                          {val.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="border border-border px-3 py-2 text-center">
                                {getStatusBadge(dailyStatus)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Summary for this location */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    <strong>Summary:</strong> {Object.keys(days).length} days analyzed from {locationStat?.totalRecords || 0} total records. 
                    {(() => {
                      const totalDays = Object.keys(days).length;
                      const goodDays = Object.values(days).filter(dayStats => {
                        const deltaValues = [1, 2, 3, 4].map(i => dayStats[`DELTA${i}`]);
                        const validValues = deltaValues.filter(val => val !== null && val !== undefined) as number[];
                        return validValues.some(val => val <= 0.5);
                      }).length;
                      
                      return totalDays > 0 ? 
                        ` ${goodDays} days (${((goodDays / totalDays) * 100).toFixed(0)}%) show good consumption patterns.` :
                        ' No data available.';
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default NightlyConsumptionAnalysis;
