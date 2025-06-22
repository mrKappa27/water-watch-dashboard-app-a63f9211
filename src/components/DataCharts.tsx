import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from 'lucide-react';
import { ParsedDataPoint } from "@/types/dataTypes";

interface DataChartsProps {
  data: ParsedDataPoint[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const DataCharts = ({ data }: DataChartsProps) => {
  const chartData = useMemo(() => {
    // Group data by location and date for time series
    const timeSeriesData: Record<string, any[]> = {};
    const locationCounts: Record<string, number> = {};
    
    data.forEach(point => {
      const dateKey = point.datetime.toISOString().split('T')[0];
      const location = point.location;
      
      // Count by location
      locationCounts[location] = (locationCounts[location] || 0) + 1;
      
      // Group by location for time series
      if (!timeSeriesData[location]) {
        timeSeriesData[location] = [];
      }
      
      // Find numeric values to chart (exclude timestamp-related fields)
      const numericValues: Record<string, number> = {};
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number' && !key.toLowerCase().includes('time') && !key.toLowerCase().includes('index')) {
          numericValues[key] = value;
        }
      });
      
      timeSeriesData[location].push({
        date: dateKey,
        datetime: point.datetime,
        fullTimestamp: point.datetime.toLocaleString(),
        ...numericValues
      });
    });

    // Prepare pie chart data
    const pieData = Object.entries(locationCounts).map(([location, count]) => ({
      name: location,
      value: count
    }));

    // Get all numeric parameters (excluding timestamp-related fields)
    const numericParams = new Set<string>();
    data.forEach(point => {
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number' && !key.toLowerCase().includes('time') && !key.toLowerCase().includes('index')) {
          numericParams.add(key);
        }
      });
    });

    return {
      timeSeriesData,
      pieData,
      numericParams: Array.from(numericParams)
    };
  }, [data]);

  // State to track which parameters are visible for each location
  const [visibleParams, setVisibleParams] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    Object.keys(chartData.timeSeriesData).forEach(location => {
      initial[location] = {};
      chartData.numericParams.forEach(param => {
        initial[location][param] = true; // All visible by default
      });
    });
    return initial;
  });

  // State for column aliases per location
  const [columnAliases, setColumnAliases] = useState<Record<string, Record<string, string>>>({});
  const [showAliasSettings, setShowAliasSettings] = useState<Record<string, boolean>>({});

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    chartData.numericParams.forEach((param, index) => {
      config[param] = {
        label: param,
        color: COLORS[index % COLORS.length]
      };
    });
    return config;
  }, [chartData.numericParams]);

  const toggleParam = (location: string, param: string) => {
    setVisibleParams(prev => ({
      ...prev,
      [location]: {
        ...prev[location],
        [param]: !prev[location]?.[param]
      }
    }));
  };

  // Add function to toggle all params for a location
  const toggleAllParams = (location: string, show: boolean) => {
    setVisibleParams(prev => ({
      ...prev,
      [location]: chartData.numericParams.reduce((acc, param) => {
        acc[param] = show;
        return acc;
      }, {} as Record<string, boolean>)
    }));
  };

  const getColumnDisplayName = (location: string, column: string) => {
    return columnAliases[location]?.[column] || column;
  };

  const setColumnAlias = (location: string, column: string, alias: string) => {
    setColumnAliases(prev => ({
      ...prev,
      [location]: {
        ...prev[location],
        [column]: alias
      }
    }));
  };

  const toggleAliasSettings = (location: string) => {
    setShowAliasSettings(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  // Custom tooltip component with dynamic timestamp
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    // Get the actual data point from payload to access the full timestamp
    const dataPoint = payload[0]?.payload;
    const timestamp = dataPoint?.fullTimestamp || new Date(label).toLocaleString();

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">
          {timestamp}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name}:
              </span>
              <span className="font-medium">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Compute daily minimum for DELTA1-4 per location, focusing on 2AM-5AM
  const dailyNightMinStats = useMemo(() => {
    // { [location]: { [date]: { delta1: min, delta2: min, ... } } }
    const stats: Record<string, Record<string, Record<string, number | null>>> = {};
    data.forEach(point => {
      const location = point.location;
      const dateKey = point.datetime.toISOString().split('T')[0];
      const hour = point.datetime.getHours();
      if (hour < 2 || hour > 5) return; // Only consider 2AM-5AM

      if (!stats[location]) stats[location] = {};
      if (!stats[location][dateKey]) stats[location][dateKey] = {};

      for (let i = 1; i <= 4; i++) {
        const key = `DELTA${i}`;
        const val = point.values[key];
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
    // Fill missing with null for consistent table rendering
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

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available for charting</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ... keep existing code (pie chart and bar chart sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Distribution by Location</CardTitle>
            <CardDescription>Number of data points per location</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Records per Location</CardTitle>
            <CardDescription>Bar chart showing data volume by location</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.pieData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time series charts for each location */}
      {Object.entries(chartData.timeSeriesData).map(([location, locationData]) => (
        <Card key={location}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Time Series Data - {location}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAliasSettings(location)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Column Settings
              </Button>
            </CardTitle>
            <CardDescription>
              Trends over time for numeric parameters at {location}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Column alias settings */}
              {showAliasSettings[location] && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="text-sm font-medium mb-3">Column Aliases:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chartData.numericParams.map((param) => (
                      <div key={param} className="space-y-1">
                        <Label htmlFor={`alias-${location}-${param}`} className="text-xs">
                          {param}
                        </Label>
                        <Input
                          id={`alias-${location}-${param}`}
                          placeholder={param}
                          value={columnAliases[location]?.[param] || ''}
                          onChange={(e) => setColumnAlias(location, param, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parameter toggles */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Toggle Data Series:</h4>
                  {/* Toggle all params button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const allVisible = chartData.numericParams.every(
                        param => visibleParams[location]?.[param] ?? true
                      );
                      toggleAllParams(location, !allVisible);
                    }}
                  >
                    {chartData.numericParams.every(
                      param => visibleParams[location]?.[param] ?? true
                    ) ? "Hide All" : "Show All"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {chartData.numericParams.map((param) => (
                    <div key={param} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${location}-${param}`}
                        checked={visibleParams[location]?.[param] ?? true}
                        onCheckedChange={() => toggleParam(location, param)}
                      />
                      <label
                        htmlFor={`${location}-${param}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        style={{ color: COLORS[chartData.numericParams.indexOf(param) % COLORS.length] }}
                      >
                        {getColumnDisplayName(location, param)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <ChartContainer config={chartConfig} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={locationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      type="category"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <ChartTooltip content={<CustomTooltip />} />
                    {chartData.numericParams.map((param, index) => {
                      const isVisible = visibleParams[location]?.[param] ?? true;
                      return isVisible ? (
                        <Line
                          key={param}
                          type="monotone"
                          dataKey={param}
                          name={getColumnDisplayName(location, param)}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                      ) : null;
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Nightly minimum DELTA1-4 per day per location */}
      <Card>
        <CardHeader>
          <CardTitle>Nightly Minimum Water Consumption (2AM-5AM, DELTA1-4)</CardTitle>
          <CardDescription>
            Shows the lowest value per day for each DELTA channel between 2AM and 5AM (should approach zero if no leaks).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(dailyNightMinStats).length === 0 ? (
            <div className="text-muted-foreground">No DELTA1-4 data available in the 2AM-5AM window.</div>
          ) : (
            Object.entries(dailyNightMinStats).map(([location, days]) => (
              <div key={location} className="mb-8">
                <h4 className="font-semibold mb-2">{location}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Date</th>
                        {[1,2,3,4].map(i => (
                          <th key={i} className="border px-2 py-1">DELTA{i} Min (2-5AM)</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(days)
                        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                        .map(([date, stats]) => (
                          <tr key={date}>
                            <td className="border px-2 py-1">{new Date(date).toLocaleDateString()}</td>
                            {[1,2,3,4].map(i => {
                              const val = stats[`DELTA${i}`];
                              return (
                                <td key={i} className="border px-2 py-1 text-center">
                                  {val === null || val === undefined ? (
                                    <span className="text-muted-foreground">No data</span>
                                  ) : (
                                    val.toFixed(2)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataCharts;
