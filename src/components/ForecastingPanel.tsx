
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calculator } from 'lucide-react';
import { ParsedDataPoint, ForecastPoint } from "@/types/dataTypes";

interface ForecastingPanelProps {
  data: ParsedDataPoint[];
}

const ForecastingPanel = ({ data }: ForecastingPanelProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedParameter, setSelectedParameter] = useState<string>('');
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const locations = useMemo(() => {
    return Array.from(new Set(data.map(d => d.location)));
  }, [data]);

  const parameters = useMemo(() => {
    const params = new Set<string>();
    data.forEach(point => {
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number') {
          params.add(key);
        }
      });
    });
    return Array.from(params);
  }, [data]);

  const historicalData = useMemo(() => {
    if (!selectedLocation || !selectedParameter) return [];

    return data
      .filter(d => d.location === selectedLocation)
      .map(d => ({
        datetime: d.datetime,
        value: d.values[selectedParameter] as number
      }))
      .filter(d => typeof d.value === 'number')
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  }, [data, selectedLocation, selectedParameter]);

  const generateSimpleForecast = () => {
    if (historicalData.length < 3) return [];

    setIsGenerating(true);
    
    // Simple linear regression forecast
    const n = historicalData.length;
    const lastDate = historicalData[n - 1].datetime;
    
    // Calculate trend
    const xValues = historicalData.map((_, i) => i);
    const yValues = historicalData.map(d => d.value);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate forecast points (next 7 days)
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      const forecastValue = slope * (n + i - 1) + intercept;
      
      forecast.push({
        datetime: forecastDate,
        value: Math.max(0, forecastValue), // Ensure non-negative
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Decreasing confidence
      });
    }
    
    setTimeout(() => {
      setForecastData(forecast);
      setIsGenerating(false);
    }, 1000);
  };

  const combinedChartData = useMemo(() => {
    const historical = historicalData.map(d => ({
      datetime: d.datetime.getTime(),
      historical: d.value,
      forecast: null,
      date: d.datetime.toLocaleDateString()
    }));

    const forecast = forecastData.map(d => ({
      datetime: d.datetime.getTime(),
      historical: null,
      forecast: d.value,
      date: d.datetime.toLocaleDateString(),
      confidence: d.confidence
    }));

    return [...historical, ...forecast].sort((a, b) => a.datetime - b.datetime);
  }, [historicalData, forecastData]);

  const chartConfig = {
    historical: { label: "Historical", color: "#0088FE" },
    forecast: { label: "Forecast", color: "#FF8042" }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Forecasting Panel
          </CardTitle>
          <CardDescription>
            Generate simple forecasts based on historical trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Parameter</label>
              <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parameter" />
                </SelectTrigger>
                <SelectContent>
                  {parameters.map(param => (
                    <SelectItem key={param} value={param}>
                      {param}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateSimpleForecast}
                disabled={!selectedLocation || !selectedParameter || historicalData.length < 3 || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>
          </div>

          {historicalData.length < 3 && selectedLocation && selectedParameter && (
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded">
              Need at least 3 data points to generate a forecast. Currently have {historicalData.length} points.
            </div>
          )}
        </CardContent>
      </Card>

      {combinedChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Data & Forecast</CardTitle>
            <CardDescription>
              {selectedParameter} at {selectedLocation} with 7-day forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    type="category"
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#0088FE"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#FF8042"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {forecastData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast Details</CardTitle>
            <CardDescription>7-day forecast with confidence levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forecastData.map((point, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <span className="font-medium">{point.datetime.toLocaleDateString()}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {point.datetime.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{point.value.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((point.confidence || 0) * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ForecastingPanel;
