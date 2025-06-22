
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
      
      // Find numeric values to chart
      const numericValues: Record<string, number> = {};
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number') {
          numericValues[key] = value;
        }
      });
      
      timeSeriesData[location].push({
        date: dateKey,
        datetime: point.datetime,
        ...numericValues
      });
    });

    // Prepare pie chart data
    const pieData = Object.entries(locationCounts).map(([location, count]) => ({
      name: location,
      value: count
    }));

    // Get all numeric parameters
    const numericParams = new Set<string>();
    data.forEach(point => {
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number') {
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

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available for charting</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <CardTitle>Time Series Data - {location}</CardTitle>
            <CardDescription>
              Trends over time for numeric parameters at {location}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  {chartData.numericParams.slice(0, 5).map((param, index) => (
                    <Line
                      key={param}
                      type="monotone"
                      dataKey={param}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DataCharts;
