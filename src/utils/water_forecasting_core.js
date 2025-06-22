// Water Consumption Forecasting Core Algorithms
// Designed for rural water consumption data with multiple meters

import _ from 'lodash';

/**
 * Parse CSV data into structured format
 * @param {string} csvData - Raw CSV string
 * @param {string} type - 'deposito' or 'dante'
 * @returns {Array} Parsed consumption data
 */
export function parseWaterConsumptionData(csvData, type = 'deposito') {
  const lines = csvData.trim().split('\n');
  const header = lines[0].split(';');
  
  const data = lines.slice(1).map(line => {
    const values = line.split(';');
    const timestamp = new Date(values[type === 'deposito' ? 2 : 2].replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    
    if (type === 'deposito') {
      return {
        timestamp,
        index: parseInt(values[0]),
        deltas: [
          parseFloat(values[13]) || 0, // DELTA1
          parseFloat(values[16]) || 0, // DELTA2
          parseFloat(values[19]) || 0, // DELTA3
          parseFloat(values[22]) || 0  // DELTA4
        ],
        totals: [
          parseFloat(values[11]) || 0, // TOT1
          parseFloat(values[14]) || 0, // TOT2
          parseFloat(values[17]) || 0, // TOT3
          parseFloat(values[20]) || 0  // TOT4
        ]
      };
    } else { // dante
      return {
        timestamp,
        index: parseInt(values[0]),
        deltas: [
          parseFloat(values[13]) || 0, // DELTA1
          parseFloat(values[16]) || 0, // DELTA2
          parseFloat(values[19]) || 0, // DELTA3
          parseFloat(values[22]) || 0  // DELTA4
        ],
        totals: [
          parseFloat(values[11]) || 0, // TOT1
          parseFloat(values[14]) || 0, // TOT2
          parseFloat(values[17]) || 0, // TOT3
          parseFloat(values[20]) || 0  // TOT4
        ],
        temperature: parseFloat(values[24]?.replace(',', '.')) || null
      };
    }
  });
  
  return data.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculate moving averages for smoothing
 * @param {Array} values - Array of numbers
 * @param {number} window - Window size for moving average
 * @returns {Array} Moving averages
 */
function calculateMovingAverage(values, window = 3) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const subset = values.slice(start, i + 1);
    const avg = subset.reduce((sum, val) => sum + val, 0) / subset.length;
    result.push(avg);
  }
  return result;
}

/**
 * Detect seasonal patterns in consumption data
 * @param {Array} data - Time series data
 * @param {number} meterIndex - Which meter to analyze (0-3)
 * @returns {Object} Seasonal patterns
 */
function detectSeasonalPatterns(data, meterIndex = 0) {
  const hourlyPatterns = {};
  const dailyTotals = {};
  
  data.forEach(point => {
    const hour = point.timestamp.getHours();
    const dayKey = point.timestamp.toISOString().split('T')[0];
    
    if (!hourlyPatterns[hour]) hourlyPatterns[hour] = [];
    if (!dailyTotals[dayKey]) dailyTotals[dayKey] = 0;
    
    hourlyPatterns[hour].push(point.deltas[meterIndex]);
    dailyTotals[dayKey] += point.deltas[meterIndex];
  });
  
  // Calculate average consumption by hour
  const hourlyAverages = {};
  Object.keys(hourlyPatterns).forEach(hour => {
    hourlyAverages[hour] = hourlyPatterns[hour].reduce((sum, val) => sum + val, 0) / hourlyPatterns[hour].length;
  });
  
  return {
    hourlyAverages,
    dailyTotals: Object.values(dailyTotals),
    avgDailyConsumption: Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) / Object.keys(dailyTotals).length
  };
}

/**
 * Simple linear regression for trend analysis
 * @param {Array} x - Time values (as numbers)
 * @param {Array} y - Consumption values
 * @returns {Object} Regression coefficients
 */
function linearRegression(x, y) {
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

/**
 * Exponential smoothing forecast
 * @param {Array} values - Historical values
 * @param {number} alpha - Smoothing factor (0-1)
 * @param {number} steps - Number of steps to forecast
 * @returns {Array} Forecasted values
 */
function exponentialSmoothing(values, alpha = 0.3, steps = 24) {
  if (values.length === 0) return [];
  
  let smoothed = values[0];
  const forecast = [];
  
  // Calculate smoothed values
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }
  
  // Generate forecast
  for (let i = 0; i < steps; i++) {
    forecast.push(smoothed);
  }
  
  return forecast;
}

/**
 * Temperature-adjusted forecasting (for Dante data)
 * @param {Array} data - Historical data with temperature
 * @param {number} meterIndex - Meter to forecast
 * @param {Array} futureTemperatures - Predicted temperatures
 * @returns {Array} Temperature-adjusted forecast
 */
function temperatureAdjustedForecast(data, meterIndex, futureTemperatures = []) {
  const validData = data.filter(d => d.temperature !== null && d.deltas[meterIndex] > 0);
  
  if (validData.length < 5) {
    // Not enough temperature data, fall back to simple forecast
    return exponentialSmoothing(data.map(d => d.deltas[meterIndex]));
  }
  
  // Calculate temperature correlation
  const temps = validData.map(d => d.temperature);
  const consumptions = validData.map(d => d.deltas[meterIndex]);
  const tempCorrelation = linearRegression(temps, consumptions);
  
  // If no future temperatures provided, use recent average
  if (futureTemperatures.length === 0) {
    const recentTemp = temps.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
    futureTemperatures = Array(24).fill(recentTemp);
  }
  
  // Base forecast
  const baseForecast = exponentialSmoothing(consumptions);
  
  // Adjust based on temperature
  const adjustedForecast = baseForecast.map((value, i) => {
    if (i < futureTemperatures.length) {
      const tempAdjustment = tempCorrelation.slope * (futureTemperatures[i] - temps[temps.length - 1]);
      return Math.max(0, value + tempAdjustment);
    }
    return value;
  });
  
  return adjustedForecast;
}

/**
 * Comprehensive forecasting function
 * @param {Array} historicalData - Parsed historical data
 * @param {Object} options - Forecasting options
 * @returns {Object} Complete forecast results
 */
export function generateWaterConsumptionForecast(historicalData, options = {}) {
  const {
    forecastHours = 24,
    meterIndex = 0,
    useTemperature = false,
    futureTemperatures = [],
    confidenceLevel = 0.8
  } = options;
  
  if (historicalData.length < 3) {
    throw new Error('Insufficient historical data for forecasting');
  }
  
  // Extract consumption values for the specified meter
  const consumptionValues = historicalData.map(d => d.deltas[meterIndex]);
  const timestamps = historicalData.map(d => d.timestamp);
  
  // Generate base forecast
  let forecast;
  if (useTemperature && historicalData[0].temperature !== undefined) {
    forecast = temperatureAdjustedForecast(historicalData, meterIndex, futureTemperatures);
  } else {
    forecast = exponentialSmoothing(consumptionValues, 0.3, forecastHours);
  }
  
  // Detect patterns for improved accuracy
  const patterns = detectSeasonalPatterns(historicalData, meterIndex);
  
  // Apply seasonal adjustments
  const seasonallyAdjustedForecast = forecast.map((value, i) => {
    const futureTimestamp = new Date(timestamps[timestamps.length - 1].getTime() + (i + 1) * 30 * 60 * 1000);
    const hour = futureTimestamp.getHours();
    const hourlyMultiplier = patterns.hourlyAverages[hour] ? 
      patterns.hourlyAverages[hour] / patterns.avgDailyConsumption * 24 : 1;
    return value * hourlyMultiplier;
  });
  
  // Calculate confidence intervals
  const recentValues = consumptionValues.slice(-Math.min(20, consumptionValues.length));
  const variance = recentValues.reduce((sum, val) => {
    const mean = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;
    return sum + Math.pow(val - mean, 2);
  }, 0) / recentValues.length;
  
  const standardError = Math.sqrt(variance);
  const zScore = confidenceLevel === 0.8 ? 1.28 : confidenceLevel === 0.9 ? 1.64 : 1.96;
  
  const forecastWithConfidence = seasonallyAdjustedForecast.map((value, i) => {
    const uncertainty = standardError * Math.sqrt(i + 1); // Uncertainty increases with time
    return {
      timestamp: new Date(timestamps[timestamps.length - 1].getTime() + (i + 1) * 30 * 60 * 1000),
      predicted: Math.max(0, value),
      upperBound: Math.max(0, value + zScore * uncertainty),
      lowerBound: Math.max(0, value - zScore * uncertainty)
    };
  });
  
  // Calculate trend
  const timeNumbers = timestamps.map(t => t.getTime());
  const trend = linearRegression(timeNumbers.slice(-10), consumptionValues.slice(-10));
  
  return {
    forecast: forecastWithConfidence,
    metadata: {
      meterIndex,
      forecastHours,
      lastDataPoint: {
        timestamp: timestamps[timestamps.length - 1],
        value: consumptionValues[consumptionValues.length - 1]
      },
      trend: {
        slope: trend.slope,
        direction: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable'
      },
      patterns: patterns,
      confidence: confidenceLevel,
      useTemperature
    }
  };
}

/**
 * Anomaly detection for unusual consumption patterns
 * @param {Array} data - Historical consumption data
 * @param {number} meterIndex - Meter to analyze
 * @param {number} threshold - Standard deviations for anomaly threshold
 * @returns {Array} Detected anomalies
 */
export function detectAnomalies(data, meterIndex = 0, threshold = 2) {
  const values = data.map(d => d.deltas[meterIndex]);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const anomalies = [];
  data.forEach((point, i) => {
    const value = point.deltas[meterIndex];
    const zScore = Math.abs(value - mean) / stdDev;
    
    if (zScore > threshold) {
      anomalies.push({
        timestamp: point.timestamp,
        value,
        zScore,
        type: value > mean ? 'spike' : 'drop'
      });
    }
  });
  
  return anomalies;
}

/**
 * Usage example and test function
 */
export function testForecasting() {
  // Example usage:
  const exampleUsage = `
  // 1. Parse your CSV data
  const data = parseWaterConsumptionData(csvString, 'deposito');
  
  // 2. Generate forecast for meter 0 (first meter)
  const forecast = generateWaterConsumptionForecast(data, {
    forecastHours: 48,
    meterIndex: 0,
    useTemperature: false,
    confidenceLevel: 0.9
  });
  
  // 3. Detect anomalies
  const anomalies = detectAnomalies(data, 0, 2.5);
  
  // 4. Access results
  console.log('Next 48 hours forecast:', forecast.forecast);
  console.log('Trend direction:', forecast.metadata.trend.direction);
  console.log('Detected anomalies:', anomalies);
  `;
  
  return exampleUsage;
}