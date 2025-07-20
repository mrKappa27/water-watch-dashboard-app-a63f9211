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
  dateFrom: Date;
  dateTo: Date;
}

const DataDashboard = ({ data, onClearData, dateFrom, dateTo }: DataDashboardProps) => {
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
        const stats = await getLocationStats(user.id, dateFrom, dateTo);
        setActualLocationStats(stats);
      } catch (error) {
        console.error('Error fetching location stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchLocationStats();
  }, [user, data, dateFrom, dateTo]); // Re-fetch when data or date range changes

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              No data found for the selected date range. Try adjusting the date filter or upload some CSV files.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayStats = actualLocationStats.length > 0 ? actualLocationStats : locationStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {data.length} points • {displayStats.length} locations
          </div>
          <Button variant="water" size="sm" onClick={onClearData}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {!isLoadingStats && displayStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {displayStats.slice(0, 3).map(stats => (
            <Card key={stats.location} className="water-card water-shadow p-4 hover:water-glow transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-primary">{stats.location}</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.totalRecords.toLocaleString()} records
                  </p>
                </div>
                <Badge variant="outline" className="text-xs border-primary/50">
                  {Object.keys(stats.averageValues).length} metrics
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <StatsOverview data={data} locationStats={displayStats} dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <DataCharts data={data} />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <DataTable data={data} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default DataDashboard;
