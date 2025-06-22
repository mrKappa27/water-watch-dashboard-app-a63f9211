
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, TrendingUp, Database } from 'lucide-react';
import { ParsedDataPoint, LocationStats } from "@/types/dataTypes";

interface StatsOverviewProps {
  data: ParsedDataPoint[];
  locationStats: LocationStats[];
}

const StatsOverview = ({ data, locationStats }: StatsOverviewProps) => {
  const totalDataPoints = data.length;
  const uniqueLocations = locationStats.length;
  const dateRange = data.length > 0 ? {
    start: new Date(Math.min(...data.map(d => d.datetime.getTime()))),
    end: new Date(Math.max(...data.map(d => d.datetime.getTime())))
  } : null;

  // Get all unique parameters across all data
  const allParameters = new Set<string>();
  data.forEach(point => {
    Object.keys(point.values).forEach(key => {
      if (typeof point.values[key] === 'number') {
        allParameters.add(key);
      }
    });
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Data Points</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDataPoints.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Across all locations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Locations</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueLocations}</div>
          <p className="text-xs text-muted-foreground">
            Unique monitoring sites
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Date Range</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dateRange ? Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) : 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Days of data
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Parameters</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{allParameters.size}</div>
          <p className="text-xs text-muted-foreground">
            Measured variables
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
          <CardDescription>Detailed statistics for each monitoring location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locationStats.map(stats => (
              <div key={stats.location} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{stats.location}</h3>
                  <Badge variant="secondary">{stats.totalRecords} records</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">First Record:</span>
                    <div className="font-medium">{stats.dateRange.start.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Record:</span>
                    <div className="font-medium">{stats.dateRange.end.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Parameters:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(stats.averageValues).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {typeof value === 'number' ? value.toFixed(2) : value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsOverview;
