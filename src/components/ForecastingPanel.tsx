import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calculator } from 'lucide-react';
import { ParsedDataPoint } from "@/types/dataTypes";
// Import core forecasting functions
import {
  generateWaterConsumptionForecast,
  detectAnomalies
} from "../utils/water_forecasting_core.js";

interface ForecastingPanelProps {
  data: ParsedDataPoint[];
}

const ForecastingPanel = ({ data }: ForecastingPanelProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [forecastHorizon, setForecastHorizon] = useState(24); // in hours
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get unique locations
  const locations = useMemo(() => {
    return Array.from(new Set(data.map(d => d.location)));
  }, [data]);

  // Get all numeric metrics/parameters from the parsed data
  const metrics = useMemo(() => {
    const set = new Set<string>();
    data.forEach(point => {
      Object.entries(point.values).forEach(([key, value]) => {
        if (typeof value === 'number' && !key.toLowerCase().includes('index')) {
          set.add(key);
        }
      });
    });
    return Array.from(set);
  }, [data]);

  // Prepare data for the selected location and metric
  const coreData = useMemo(() => {
    if (!selectedLocation || !selectedMetric) return [];
    return data
      .filter(d => d.location === selectedLocation)
      .map(d => ({
        timestamp: d.datetime,
        value: Number(d.values[selectedMetric]) || 0
      }));
  }, [data, selectedLocation, selectedMetric]);

  // Generate forecast using the core, adapting to generic metric
  const handleForecast = () => {
    if (coreData.length < 3) return;
    setIsGenerating(true);
    setTimeout(() => {
      try {
        // Adapt coreData to the expected format for the core
        const adaptedCoreData = coreData.map(d => ({
          timestamp: d.timestamp,
          deltas: [d.value], // single metric as first meter
          totals: [0]
        }));
        const result = generateWaterConsumptionForecast(adaptedCoreData, {
          forecastHours: forecastHorizon,
          meterIndex: 0,
          useTemperature: false,
          confidenceLevel: 0.9
        });
        setForecastResult(result);
        setAnomalies(detectAnomalies(adaptedCoreData, 0, 2.5));
      } catch (e) {
        setForecastResult(null);
        setAnomalies([]);
      }
      setIsGenerating(false);
    }, 300);
  };

  // Prepare chart data
  const combinedChartData = useMemo(() => {
    if (!forecastResult) return [];
    // Historical
    const historical = coreData.map(d => ({
      datetime: d.timestamp.getTime(),
      value: d.value,
      type: "historical",
      date: d.timestamp.toLocaleString()
    }));
    // Forecast
    const forecast = forecastResult.forecast.map((f: any) => ({
      datetime: f.timestamp.getTime(),
      value: f.predicted,
      upper: f.upperBound,
      lower: f.lowerBound,
      type: "forecast",
      date: f.timestamp.toLocaleString()
    }));
    return [...historical, ...forecast].sort((a, b) => a.datetime - b.datetime);
  }, [coreData, forecastResult]);

  const chartConfig = {
    value: { label: "Value", color: "#0088FE" },
    upper: { label: "Upper Bound", color: "#82CA9D" },
    lower: { label: "Lower Bound", color: "#FFBB28" }
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
            Forecast any numeric metric for each location, with confidence intervals and anomaly detection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              <label className="text-sm font-medium mb-2 block">Metric</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map(metric => (
                    <SelectItem key={metric} value={metric}>
                      {metric}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Forecast Horizon (hours)</label>
              <Select value={forecastHorizon.toString()} onValueChange={v => setForecastHorizon(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Forecast horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">1 Day</SelectItem>
                  <SelectItem value="48">2 Days</SelectItem>
                  <SelectItem value="72">3 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleForecast}
                disabled={!selectedLocation || !selectedMetric || coreData.length < 3 || isGenerating}
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
          {coreData.length < 3 && selectedLocation && selectedMetric && (
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded">
              Need at least 3 data points to generate a forecast. Currently have {coreData.length} points.
            </div>
          )}
        </CardContent>
      </Card>

      {combinedChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Data & Forecast</CardTitle>
            <CardDescription>
              {selectedMetric} at {selectedLocation} with {forecastHorizon}-hour forecast
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
                    tickFormatter={(value) => value}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0088FE"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="upper"
                    stroke="#82CA9D"
                    strokeWidth={1}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lower"
                    stroke="#FFBB28"
                    strokeWidth={1}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {forecastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Forecast Details</CardTitle>
            <CardDescription>
              {forecastHorizon}-hour forecast with confidence levels and trend: <b>{forecastResult.metadata.trend.direction}</b>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forecastResult.forecast.map((point: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <span className="font-medium">{point.timestamp.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{point.predicted.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {((forecastResult.metadata.confidence || 0) * 100).toFixed(0)}% confidence
                      &nbsp;| Range: {point.lowerBound.toFixed(2)} - {point.upperBound.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Detection</CardTitle>
            <CardDescription>
              Detected {anomalies.length} anomalies for {selectedMetric} at {selectedLocation}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded bg-red-50">
                  <div>
                    <span className="font-medium">{a.timestamp.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{a.value}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {a.type} (z={a.zScore.toFixed(2)})
                    </span>
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
