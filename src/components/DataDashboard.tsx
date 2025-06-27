import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart, Trash2, TrendingUp, Table } from 'lucide-react';
import { ParsedDataPoint, LocationStats } from "@/types/dataTypes";
import StatsOverview from "@/components/StatsOverview";
import DataCharts from "@/components/DataCharts";
import DataTable from "@/components/DataTable";
import ForecastingPanel from "@/components/ForecastingPanel";
import { getLocationStats } from "@/utils/supabaseSync";
import { useAuth } from "@/hooks/useAuth";

interface DataDashboardProps {
  data: ParsedDataPoint[];
  onClearData: () => void;
}

const DataDashboard = ({ data, onClearData }: DataDashboardProps) => {
  const { user } = useAuth();
  const [actualLocationStats, setActualLocationStats] = useState<LocationStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Keep the original locationStats for compatibility with existing code that might need it
  const locationStats = useMemo((): LocationStats[] => {
    const statsMap = new Map<string, LocationStats>();

    data.forEach(point => {
      if (!statsMap.has(point.location)) {
        statsMap.set(point.location, {
          location: point.location,
          totalRecords: 0,
          dateRange: { start: point.datetime, end: point.datetime },
          averageValues: {},
          lastUpdate: point.datetime
        });
      }

      const stats = statsMap.get(point.location)!;
      stats.totalRecords++;
      
      if (point.datetime < stats.dateRange.start) {
        stats.dateRange.start = point.datetime;
      }
      if (point.datetime > stats.dateRange.end) {
        stats.dateRange.end = point.datetime;
      }
      if (point.datetime > stats.lastUpdate) {
        stats.lastUpdate = point.datetime;
      }

      // Calculate averages for numeric values
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!stats.averageValues[key]) {
            stats.averageValues[key] = value;
          } else {
            stats.averageValues[key] = (stats.averageValues[key] + value) / 2;
          }
        }
      });
    });

    return Array.from(statsMap.values());
  }, [data]);

  useEffect(() => {
    const fetchLocationStats = async () => {
      if (!user) return;
      
      setIsLoadingStats(true);
      try {
        const stats = await getLocationStats(user.id);
        setActualLocationStats(stats);
      } catch (error) {
        console.error('Error fetching location stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchLocationStats();
  }, [user, data]); // Re-fetch when data changes (after upload)

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Upload some CSV files to see your dashboard analytics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayStats = actualLocationStats.length > 0 ? actualLocationStats : locationStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Analytics</h2>
          <p className="text-muted-foreground">
            {data.length} data points from {displayStats.length} locations
          </p>
        </div>
        <Button variant="outline" onClick={onClearData}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoadingStats ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Loading...</CardTitle>
                <CardDescription>-- records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Update:</span>
                    <span>--</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          displayStats.map(stats => (
            <Card key={stats.location}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{stats.location}</CardTitle>
                <CardDescription>
                  {stats.totalRecords.toLocaleString()} records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Update:</span>
                    <span>{stats.lastUpdate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(stats.averageValues).slice(0, 3).map(key => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                    {Object.keys(stats.averageValues).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{Object.keys(stats.averageValues).length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <StatsOverview data={data} locationStats={displayStats} />
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <DataCharts data={data} />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <DataTable data={data} />
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6">
          <ForecastingPanel data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataDashboard;
