
import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';
import { getLeakDetectionThresholds, LeakDetectionThresholds } from "@/utils/leakDetectionThresholds";
import { loadUserChartPreferences, ChartPreferences } from "@/utils/chartPreferences";

interface DatabaseRecord {
  id: number;
  location: string;
  time: string;
  delta1: number | null;
  delta2: number | null;
  delta3: number | null;
  delta4: number | null;
}

interface StatsData {
  totalRecords: number;
  locations: number;
  latestUpdate: Date | null;
}

interface NightlyConsumptionAnalysisProps {
  dateFrom: Date;
  dateTo: Date;
}

const NightlyConsumptionAnalysis = ({ dateFrom, dateTo }: NightlyConsumptionAnalysisProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [data, setData] = useState<DatabaseRecord[]>([]);
  const [statsData, setStatsData] = useState<StatsData>({ totalRecords: 0, locations: 0, latestUpdate: null });
  const [isLoading, setIsLoading] = useState(true);
  const [thresholds, setThresholds] = useState<Record<string, LeakDetectionThresholds>>({});
  const [chartPreferences, setChartPreferences] = useState<Record<string, ChartPreferences>>({});

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);

        const [countResult, latestResult, locationsResult] = await Promise.all([
          supabase
            .from('water_consumption_metrics')
            .select('*', { count: 'exact', head: true })
            .gte('time', dateFrom.toISOString())
            .lte('time', endOfDay.toISOString()),
          
          supabase
            .from('water_consumption_metrics')
            .select('time')
            .gte('time', dateFrom.toISOString())
            .lte('time', endOfDay.toISOString())
            .order('time', { ascending: false })
            .limit(1)
            .single(),
          
          supabase
            .from('water_consumption_metrics')
            .select('location')
            .not('location', 'is', null)
            .gte('time', dateFrom.toISOString())
            .lte('time', endOfDay.toISOString())
        ]);

        if (countResult.error) {
          console.error('Error getting record count:', countResult.error);
        }

        if (latestResult.error && latestResult.error.code !== 'PGRST116') {
          console.error('Error getting latest record:', latestResult.error);
        }

        if (locationsResult.error) {
          console.error('Error getting locations:', locationsResult.error);
        }

        const totalRecords = countResult.count || 0;
        const latestUpdate = latestResult.data?.time ? new Date(latestResult.data.time) : null;
        const uniqueLocations = new Set(locationsResult.data?.map(record => record.location).filter(Boolean)).size;

        setStatsData({
          totalRecords,
          locations: uniqueLocations,
          latestUpdate
        });

        // Fetch all records for analysis
        let allData: DatabaseRecord[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: dbData, error } = await supabase
            .from('water_consumption_metrics')
            .select('id, location, time, delta1, delta2, delta3, delta4')
            .gte('time', dateFrom.toISOString())
            .lte('time', endOfDay.toISOString())
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
  }, [user, dateFrom, dateTo, toast]);

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

  // Load thresholds and chart preferences for each location
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || locationStats.length === 0) return;

      const thresholdsMap: Record<string, LeakDetectionThresholds> = {};
      const preferencesMap: Record<string, ChartPreferences> = {};

      await Promise.all(
        locationStats.map(async (stat) => {
          const { data: existingThresholds } = await supabase
            .from('leak_detection_thresholds')
            .select('*')
            .eq('location', stat.location)
            .limit(1);

          if (existingThresholds && existingThresholds.length > 0) {
            thresholdsMap[stat.location] = existingThresholds[0];
          } else {
            thresholdsMap[stat.location] = {
              user_id: user.id,
              location: stat.location,
              good_threshold: 0.5,
              warning_threshold: 2.0,
              high_threshold: 5.0,
            };
          }

          const { data: existingPreferences } = await supabase
            .from('user_chart_preferences')
            .select('*')
            .eq('location', stat.location)
            .limit(1);

          if (existingPreferences && existingPreferences.length > 0) {
            preferencesMap[stat.location] = {
              visibleParams: existingPreferences[0].visible_params as Record<string, boolean>,
              columnAliases: existingPreferences[0].column_aliases as Record<string, string>,
            };
          } else {
            preferencesMap[stat.location] = {
              visibleParams: { DELTA1: true, DELTA2: true, DELTA3: true, DELTA4: true },
              columnAliases: {},
            };
          }
        })
      );

      setThresholds(thresholdsMap);
      setChartPreferences(preferencesMap);
    };

    loadSettings();
  }, [user, locationStats]);

  const getConsumptionStatus = (value: number | null, location: string) => {
    if (value === null || value === undefined) return 'no-data';
    
    const locationThresholds = thresholds[location];
    if (!locationThresholds) {
      if (value <= 0.5) return 'good';
      if (value <= 2.0) return 'warning';
      return 'high';
    }

    if (value <= locationThresholds.good_threshold) return 'good';
    if (value <= locationThresholds.warning_threshold) return 'warning';
    return 'high';
  };

  const getEnabledDeltas = (location: string): number[] => {
    const preferences = chartPreferences[location];
    if (!preferences) return [1, 2, 3, 4];

    return [1, 2, 3, 4].filter(i => preferences.visibleParams[`DELTA${i}`] !== false);
  };

  const getDeltaAlias = (location: string, deltaKey: string): string => {
    const preferences = chartPreferences[location];
    return preferences?.columnAliases?.[deltaKey] || deltaKey;
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">{t('good')}</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('warning')}</Badge>;
      case 'high':
        return <Badge variant="destructive">{t('high')}</Badge>;
      default:
        return <Badge variant="outline">{t('no_data_available')}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('nightly_consumption_analysis')} (2AM-5AM)</CardTitle>
          <CardDescription>{t('loading_data_from_database')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-lg">{t('loading')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statsData.totalRecords === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('nightly_consumption_analysis')} (2AM-5AM)</CardTitle>
          <CardDescription>
            {t('no_data_available')} ({dateFrom.toLocaleDateString()} - {dateTo.toLocaleDateString()})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            {t('upload_some_csv_files')}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(dailyNightMinStats).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('nightly_consumption_analysis')} (2AM-5AM)</CardTitle>
          <CardDescription>
            {t('no_data_available')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            {statsData.totalRecords.toLocaleString()} {t('records')} {t('in_selected_date_range')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nightly_consumption_analysis')} (2AM-5AM)</CardTitle>
        <CardDescription>
          {t('leak_detection_analysis')} ({dateFrom.toLocaleDateString()} - {dateTo.toLocaleDateString()})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Help Section */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">{t('leak_detection_help')}</p>
              <p>{t('leak_status_explanation')}</p>
            </div>
          </div>

          {/* Database Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{statsData.totalRecords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">{t('total_records_analyzed')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{statsData.locations}</div>
              <div className="text-sm text-muted-foreground">{t('locations')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {statsData.latestUpdate 
                  ? statsData.latestUpdate.toLocaleDateString()
                  : 'N/A'
                }
              </div>
              <div className="text-sm text-muted-foreground">{t('last_record')}</div>
            </div>
          </div>

          {/* Thresholds Legend */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium">{t('thresholds_by_location')}</h5>
            {Object.entries(thresholds).map(([location, threshold]) => {
              const enabledDeltas = getEnabledDeltas(location);
              if (enabledDeltas.length === 0) return null;
              
              return (
                <div key={location} className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg">
                  <h6 className="text-sm font-medium">{location}:</h6>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs">≤ {threshold.good_threshold}: {t('good')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs">{threshold.good_threshold}-{threshold.warning_threshold}: {t('warning')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs">&gt; {threshold.warning_threshold}: {t('high')}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('monitoring_parameters')}: {enabledDeltas.map(i => getDeltaAlias(location, `DELTA${i}`)).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>

          {Object.entries(dailyNightMinStats).map(([location, days]) => {
            const locationStat = locationStats.find(stat => stat.location === location);
            const enabledDeltas = getEnabledDeltas(location);
            
            // Skip locations with no enabled deltas
            if (enabledDeltas.length === 0) return null;
            
            // Calculate summary statistics
            const totalDays = Object.keys(days).length;
            const locationThresholds = thresholds[location];
            const goodThreshold = locationThresholds?.good_threshold || 0.5;
            
            const goodDays = Object.values(days).filter(dayStats => {
              const deltaValues = enabledDeltas.map(i => dayStats[`DELTA${i}`]);
              const validValues = deltaValues.filter(val => val !== null && val !== undefined) as number[];
              return validValues.some(val => val <= goodThreshold);
            }).length;

            const warningDays = Object.values(days).filter(dayStats => {
              const deltaValues = enabledDeltas.map(i => dayStats[`DELTA${i}`]);
              const validValues = deltaValues.filter(val => val !== null && val !== undefined) as number[];
              const hasGoodReading = validValues.some(val => val <= goodThreshold);
              const allHighValues = validValues.length > 0 && validValues.every(val => val > (locationThresholds?.warning_threshold || 2.0));
              return !hasGoodReading && !allHighValues && validValues.length > 0;
            }).length;

            const highDays = totalDays - goodDays - warningDays;
            
            return (
              <div key={location} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-lg font-semibold">{location}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{locationStat?.totalRecords || 0} {t('records')}</span>
                    <span>{t('last_record')} {locationStat?.lastUpdate?.toLocaleDateString() || 'N/A'}</span>
                  </div>
                </div>

                {/* Analysis Summary for this location */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{goodDays}</div>
                    <div className="text-xs text-muted-foreground">{t('good')} {t('days_analyzed')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-600">{warningDays}</div>
                    <div className="text-xs text-muted-foreground">{t('warning')} {t('days_analyzed')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{highDays}</div>
                    <div className="text-xs text-muted-foreground">{t('potential_leak_days')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">{totalDays > 0 ? ((goodDays / totalDays) * 100).toFixed(0) : 0}%</div>
                    <div className="text-xs text-muted-foreground">{t('good_days_percentage')}</div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-border">
                     <thead>
                       <tr className="bg-muted/50">
                         <th className="border border-border px-3 py-2 text-left">Date</th>
                         {enabledDeltas.map(i => (
                           <th key={i} className="border border-border px-3 py-2 text-center">
                             {getDeltaAlias(location, `DELTA${i}`)}
                           </th>
                         ))}
                         <th className="border border-border px-3 py-2 text-center">{t('daily_status')}</th>
                       </tr>
                     </thead>
                    <tbody>
                      {Object.entries(days)
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                         .map(([date, stats]) => {
                           const deltaValues = enabledDeltas.map(i => stats[`DELTA${i}`]);
                           const validValues = deltaValues.filter(val => val !== null && val !== undefined) as number[];
                           
                           const locationThresholds = thresholds[location];
                           const goodThreshold = locationThresholds?.good_threshold || 0.5;
                           const warningThreshold = locationThresholds?.warning_threshold || 2.0;
                           
                           const hasGoodReading = validValues.some(val => val <= goodThreshold);
                           const allHighValues = validValues.length > 0 && validValues.every(val => val > warningThreshold);
                           const dailyStatus = validValues.length === 0 ? 'no-data' : 
                                             hasGoodReading ? 'good' : 
                                             allHighValues ? 'high' : 'warning';

                          return (
                            <tr key={date} className="hover:bg-muted/25">
                              <td className="border border-border px-3 py-2 font-medium">
                                {new Date(date).toLocaleDateString()}
                              </td>
                               {enabledDeltas.map(i => {
                                 const val = stats[`DELTA${i}`];
                                 const status = getConsumptionStatus(val, location);
                                 
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default NightlyConsumptionAnalysis;
