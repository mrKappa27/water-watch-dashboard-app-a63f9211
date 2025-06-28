
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Calculator, Brain, AlertTriangle, BarChart3 } from 'lucide-react';
import { ParsedDataPoint } from "@/types/dataTypes";
import {
  generateAdvancedForecast,
  detectAdvancedAnomalies
} from "../utils/water_forecasting_core.js";

interface ForecastingPanelProps {
  data: ParsedDataPoint[];
}

const ForecastingPanel = ({ data }: ForecastingPanelProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [forecastHorizon, setForecastHorizon] = useState(24);
  const [modelSelection, setModelSelection] = useState<string>('auto');
  const [confidenceLevel, setConfidenceLevel] = useState(0.9);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get unique locations
  const locations = useMemo(() => {
    return Array.from(new Set(data.map(d => d.location)));
  }, [data]);

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

  const coreData = useMemo(() => {
    if (!selectedLocation || !selectedMetric) return [];
    return data
      .filter(d => d.location === selectedLocation)
      .map(d => ({
        timestamp: d.datetime,
        value: Number(d.values[selectedMetric]) || 0
      }));
  }, [data, selectedLocation, selectedMetric]);

  const handleForecast = () => {
    if (coreData.length < 3) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      try {
        const adaptedCoreData = coreData.map(d => ({
          timestamp: d.timestamp,
          deltas: [d.value],
          totals: [0]
        }));
        
        const result = generateAdvancedForecast(adaptedCoreData, {
          forecastHours: forecastHorizon,
          meterIndex: 0,
          modelSelection,
          confidenceLevel,
          useTemperature: false
        });
        
        setForecastResult(result);
        
        const detectedAnomalies = detectAdvancedAnomalies(adaptedCoreData, 0, {
          threshold: 2.5,
          methods: ['statistical', 'seasonal', 'trend']
        });
        
        setAnomalies(detectedAnomalies);
      } catch (e) {
        console.error('Forecasting error:', e);
        setForecastResult(null);
        setAnomalies([]);
      }
      setIsGenerating(false);
    }, 500);
  };

  const combinedChartData = useMemo(() => {
    if (!forecastResult) return [];
    
    const historical = coreData.map(d => ({
      datetime: d.timestamp.getTime(),
      value: d.value,
      type: "historical",
      date: d.timestamp.toLocaleString()
    }));
    
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
    value: { label: "Actual", color: "#0088FE" },
    upper: { label: "Upper Bound", color: "#82CA9D" },
    lower: { label: "Lower Bound", color: "#FFBB28" }
  };

  const getModelBadgeColor = (model: string) => {
    switch (model) {
      case 'holtWinters': return 'bg-blue-100 text-blue-800';
      case 'exponential': return 'bg-green-100 text-green-800';
      case 'linear': return 'bg-purple-100 text-purple-800';
      case 'movingAverage': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Advanced Forecasting Panel
          </CardTitle>
          <CardDescription>
            Intelligent forecasting with multiple algorithms, model selection, and comprehensive anomaly detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
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
              <label className="text-sm font-medium mb-2 block">Forecast Horizon</label>
              <Select value={forecastHorizon.toString()} onValueChange={v => setForecastHorizon(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 Hours</SelectItem>
                  <SelectItem value="24">1 Day</SelectItem>
                  <SelectItem value="48">2 Days</SelectItem>
                  <SelectItem value="72">3 Days</SelectItem>
                  <SelectItem value="168">1 Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Model</label>
              <Select value={modelSelection} onValueChange={setModelSelection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Select</SelectItem>
                  <SelectItem value="holtWinters">Holt-Winters</SelectItem>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="linear">Linear Trend</SelectItem>
                  <SelectItem value="movingAverage">Moving Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Confidence</label>
              <Select value={confidenceLevel.toString()} onValueChange={v => setConfidenceLevel(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.8">80%</SelectItem>
                  <SelectItem value="0.9">90%</SelectItem>
                  <SelectItem value="0.95">95%</SelectItem>
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
                    Forecast
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

      {forecastResult && (
        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Forecast Results</span>
                  <div className="flex gap-2">
                    <Badge className={getModelBadgeColor(forecastResult.models.selected)}>
                      {forecastResult.models.selected}
                    </Badge>
                    <Badge variant="outline">
                      {(confidenceLevel * 100).toFixed(0)}% Confidence
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  {selectedMetric} at {selectedLocation} • {forecastHorizon}-hour forecast • 
                  Trend: <strong>{forecastResult.metadata.patterns.trendStrength > 0.5 ? 'Strong' : 'Weak'}</strong>
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
                        interval="preserveStartEnd"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ReferenceLine 
                        x={coreData[coreData.length - 1]?.timestamp.getTime()} 
                        stroke="#ff7300" 
                        strokeDasharray="5 5"
                        label="Forecast Start"
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#0088FE"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="upper"
                        stroke="#82CA9D"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="lower"
                        stroke="#FFBB28"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Model Comparison
                </CardTitle>
                <CardDescription>
                  Performance comparison of different forecasting models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(forecastResult.metadata.modelAccuracy || {}).map(([model, accuracy]: [string, any]) => (
                    <div key={model} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge className={getModelBadgeColor(model)}>
                          {model}
                        </Badge>
                        {model === forecastResult.models.selected && (
                          <Badge variant="outline">Selected</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          MAPE: {accuracy.mape?.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          RMSE: {accuracy.rmse?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns">
            <Card>
              <CardHeader>
                <CardTitle>Pattern Analysis</CardTitle>
                <CardDescription>
                  Seasonal and trend patterns detected in the data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Seasonal Patterns</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Seasonal Strength:</span>
                        <Badge variant="outline">
                          {(forecastResult.metadata.patterns.seasonalStrength * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Peak Hour:</span>
                        <span>{forecastResult.metadata.patterns.peakHour}:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peak Day:</span>
                        <span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][forecastResult.metadata.patterns.peakDay]}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Trend Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Trend Strength:</span>
                        <Badge variant="outline">
                          {(forecastResult.metadata.patterns.trendStrength * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Direction:</span>
                        <span className="capitalize">
                          {forecastResult.metadata.patterns.trendStrength > 0.1 ? 
                            (forecastResult.metadata.patterns.trendStrength > 0 ? 'Increasing' : 'Decreasing') : 
                            'Stable'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Anomaly Detection
                </CardTitle>
                <CardDescription>
                  Detected {anomalies.length} anomalies using multiple detection methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                {anomalies.length > 0 ? (
                  <div className="space-y-3">
                    {anomalies.map((anomaly, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border rounded">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">
                              {anomaly.timestamp.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {anomaly.method} • {anomaly.type}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity}
                          </Badge>
                          <div className="text-right">
                            <div className="font-medium">{anomaly.value.toFixed(2)}</div>
                            {anomaly.zScore && (
                              <div className="text-xs text-muted-foreground">
                                z-score: {anomaly.zScore.toFixed(2)}
                              </div>
                            )}
                            {anomaly.deviation && (
                              <div className="text-xs text-muted-foreground">
                                deviation: {(anomaly.deviation * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No anomalies detected in the current dataset
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ForecastingPanel;
