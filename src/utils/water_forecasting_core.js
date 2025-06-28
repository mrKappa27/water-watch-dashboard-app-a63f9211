// Water Consumption Forecasting Core Algorithms
// Enhanced with advanced time series forecasting methods

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
 * Enhanced seasonal pattern detection with multiple cycles
 * @param {Array} data - Time series data
 * @param {number} meterIndex - Which meter to analyze (0-3)
 * @returns {Object} Comprehensive seasonal patterns
 */
function detectAdvancedSeasonalPatterns(data, meterIndex = 0) {
  const hourlyPatterns = Array(24).fill(0).map(() => []);
  const dailyPatterns = Array(7).fill(0).map(() => []);
  const monthlyPatterns = Array(12).fill(0).map(() => []);
  
  data.forEach(point => {
    const hour = point.timestamp.getHours();
    const day = point.timestamp.getDay();
    const month = point.timestamp.getMonth();
    const value = point.deltas[meterIndex];
    
    hourlyPatterns[hour].push(value);
    dailyPatterns[day].push(value);
    monthlyPatterns[month].push(value);
  });
  
  // Calculate averages and detect patterns
  const hourlyAvg = hourlyPatterns.map(values => 
    values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  );
  
  const dailyAvg = dailyPatterns.map(values => 
    values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  );
  
  const monthlyAvg = monthlyPatterns.map(values => 
    values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  );
  
  // Detect peak hours and days
  const peakHour = hourlyAvg.indexOf(Math.max(...hourlyAvg));
  const peakDay = dailyAvg.indexOf(Math.max(...dailyAvg));
  
  return {
    hourlyAverages: hourlyAvg,
    dailyAverages: dailyAvg,
    monthlyAverages: monthlyAvg,
    peakHour,
    peakDay,
    seasonalStrength: calculateSeasonalStrength(hourlyAvg),
    trendStrength: calculateTrendStrength(data.map(d => d.deltas[meterIndex]))
  };
}

/**
 * Calculate seasonal strength coefficient
 * @param {Array} seasonalData - Seasonal averages
 * @returns {number} Strength of seasonality (0-1)
 */
function calculateSeasonalStrength(seasonalData) {
  if (seasonalData.length < 2) return 0;
  
  const mean = seasonalData.reduce((sum, val) => sum + val, 0) / seasonalData.length;
  const variance = seasonalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / seasonalData.length;
  const maxVariance = Math.pow(Math.max(...seasonalData) - Math.min(...seasonalData), 2) / 4;
  
  return maxVariance > 0 ? Math.min(variance / maxVariance, 1) : 0;
}

/**
 * Calculate trend strength
 * @param {Array} values - Time series values
 * @returns {number} Strength of trend (0-1)
 */
function calculateTrendStrength(values) {
  if (values.length < 3) return 0;
  
  const x = values.map((_, i) => i);
  const regression = linearRegression(x, values);
  const predictions = x.map(xi => regression.slope * xi + regression.intercept);
  
  const totalVariance = values.reduce((sum, val) => {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return sum + Math.pow(val - mean, 2);
  }, 0);
  
  const residualVariance = values.reduce((sum, val, i) => {
    return sum + Math.pow(val - predictions[i], 2);
  }, 0);
  
  return totalVariance > 0 ? Math.max(0, 1 - residualVariance / totalVariance) : 0;
}

/**
 * Holt-Winters exponential smoothing for seasonal data
 * @param {Array} values - Historical values
 * @param {number} seasonLength - Length of seasonal cycle (24 for hourly, 7 for daily)
 * @param {Object} params - Smoothing parameters
 * @param {number} steps - Number of steps to forecast
 * @returns {Array} Forecasted values with seasonality
 */
function holtWintersSmoothing(values, seasonLength = 24, params = {}, steps = 24) {
  const { alpha = 0.3, beta = 0.1, gamma = 0.2 } = params;
  
  if (values.length < seasonLength * 2) {
    // Not enough data for Holt-Winters, fall back to simple exponential smoothing
    return exponentialSmoothing(values, alpha, steps);
  }
  
  // Initialize components
  const level = values.slice(0, seasonLength).reduce((sum, val) => sum + val, 0) / seasonLength;
  let trend = 0;
  const seasonal = [];
  
  // Calculate initial seasonal indices
  for (let i = 0; i < seasonLength; i++) {
    const seasonValues = [];
    for (let j = i; j < values.length; j += seasonLength) {
      seasonValues.push(values[j]);
    }
    seasonal[i] = seasonValues.length > 0 ? 
      (seasonValues.reduce((sum, val) => sum + val, 0) / seasonValues.length) / level : 1;
  }
  
  // Smooth the data
  let currentLevel = level;
  let currentTrend = trend;
  const smoothedValues = [];
  
  for (let i = 0; i < values.length; i++) {
    const seasonIndex = i % seasonLength;
    const previousLevel = currentLevel;
    
    // Update level
    currentLevel = alpha * (values[i] / seasonal[seasonIndex]) + (1 - alpha) * (currentLevel + currentTrend);
    
    // Update trend
    currentTrend = beta * (currentLevel - previousLevel) + (1 - beta) * currentTrend;
    
    // Update seasonal
    seasonal[seasonIndex] = gamma * (values[i] / currentLevel) + (1 - gamma) * seasonal[seasonIndex];
    
    smoothedValues.push(currentLevel * seasonal[seasonIndex]);
  }
  
  // Generate forecast
  const forecast = [];
  for (let i = 0; i < steps; i++) {
    const seasonIndex = (values.length + i) % seasonLength;
    const forecastValue = (currentLevel + (i + 1) * currentTrend) * seasonal[seasonIndex];
    forecast.push(Math.max(0, forecastValue));
  }
  
  return forecast;
}

/**
 * Simple moving average forecast
 * @param {Array} values - Historical values
 * @param {number} window - Window size
 * @param {number} steps - Number of steps to forecast
 * @returns {Array} Forecasted values
 */
function movingAverageForecast(values, window = 7, steps = 24) {
  if (values.length < window) return Array(steps).fill(0);
  
  const recentAvg = values.slice(-window).reduce((sum, val) => sum + val, 0) / window;
  return Array(steps).fill(recentAvg);
}

/**
 * Linear regression forecast
 * @param {Array} values - Historical values
 * @param {number} steps - Number of steps to forecast
 * @returns {Array} Forecasted values
 */
function linearRegressionForecast(values, steps = 24) {
  const x = values.map((_, i) => i);
  const regression = linearRegression(x, values);
  
  const forecast = [];
  for (let i = 0; i < steps; i++) {
    const forecastValue = regression.slope * (values.length + i) + regression.intercept;
    forecast.push(Math.max(0, forecastValue));
  }
  
  return forecast;
}

/**
 * Enhanced forecasting with multiple models and selection
 * @param {Array} historicalData - Parsed historical data
 * @param {Object} options - Forecasting options
 * @returns {Object} Complete forecast results with model comparison
 */
export function generateAdvancedForecast(historicalData, options = {}) {
  const {
    forecastHours = 24,
    meterIndex = 0,
    useTemperature = false,
    futureTemperatures = [],
    confidenceLevel = 0.9,
    modelSelection = 'auto' // 'auto', 'holt-winters', 'exponential', 'linear', 'moving-average'
  } = options;
  
  if (historicalData.length < 3) {
    throw new Error('Insufficient historical data for forecasting');
  }
  
  const consumptionValues = historicalData.map(d => d.deltas[meterIndex]);
  const timestamps = historicalData.map(d => d.timestamp);
  
  // Detect patterns
  const patterns = detectAdvancedSeasonalPatterns(historicalData, meterIndex);
  
  // Generate multiple forecasts
  const forecasts = {};
  
  // Holt-Winters (good for seasonal data)
  forecasts.holtWinters = holtWintersSmoothing(consumptionValues, 24, {}, forecastHours);
  
  // Exponential smoothing (good for trending data)
  forecasts.exponential = exponentialSmoothing(consumptionValues, 0.3, forecastHours);
  
  // Linear regression (good for strong trends)
  forecasts.linear = linearRegressionForecast(consumptionValues, forecastHours);
  
  // Moving average (good for stable data)
  forecasts.movingAverage = movingAverageForecast(consumptionValues, 7, forecastHours);
  
  // Select best model based on data characteristics
  let selectedModel = modelSelection;
  if (modelSelection === 'auto') {
    if (patterns.seasonalStrength > 0.6) {
      selectedModel = 'holtWinters';
    } else if (patterns.trendStrength > 0.7) {
      selectedModel = 'linear';
    } else if (patterns.trendStrength > 0.3) {
      selectedModel = 'exponential';
    } else {
      selectedModel = 'movingAverage';
    }
  }
  
  const selectedForecast = forecasts[selectedModel];
  
  // Calculate ensemble forecast (weighted average of all models)
  const ensembleForecast = selectedForecast.map((_, i) => {
    const weights = {
      holtWinters: patterns.seasonalStrength,
      exponential: patterns.trendStrength * 0.7,
      linear: patterns.trendStrength,
      movingAverage: 1 - Math.max(patterns.seasonalStrength, patterns.trendStrength)
    };
    
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    
    let weightedSum = 0;
    Object.entries(weights).forEach(([model, weight]) => {
      weightedSum += (forecasts[model][i] || 0) * weight;
    });
    
    return weightedSum / totalWeight;
  });
  
  // Calculate confidence intervals
  const recentValues = consumptionValues.slice(-Math.min(50, consumptionValues.length));
  const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
  const standardError = Math.sqrt(variance);
  
  const zScore = confidenceLevel === 0.8 ? 1.28 : confidenceLevel === 0.9 ? 1.64 : 1.96;
  
  const forecastWithConfidence = ensembleForecast.map((value, i) => {
    const uncertainty = standardError * Math.sqrt(i + 1) * (1 + patterns.seasonalStrength * 0.3);
    return {
      timestamp: new Date(timestamps[timestamps.length - 1].getTime() + (i + 1) * 30 * 60 * 1000),
      predicted: Math.max(0, value),
      upperBound: Math.max(0, value + zScore * uncertainty),
      lowerBound: Math.max(0, value - zScore * uncertainty),
      model: selectedModel
    };
  });
  
  return {
    forecast: forecastWithConfidence,
    models: {
      selected: selectedModel,
      forecasts: forecasts,
      ensemble: ensembleForecast
    },
    metadata: {
      meterIndex,
      forecastHours,
      lastDataPoint: {
        timestamp: timestamps[timestamps.length - 1],
        value: consumptionValues[consumptionValues.length - 1]
      },
      patterns: patterns,
      confidence: confidenceLevel,
      useTemperature,
      modelAccuracy: calculateModelAccuracy(consumptionValues, forecasts, patterns)
    }
  };
}

/**
 * Calculate model accuracy using cross-validation
 * @param {Array} values - Historical values
 * @param {Object} forecasts - Different model forecasts
 * @param {Object} patterns - Detected patterns
 * @returns {Object} Accuracy metrics for each model
 */
function calculateModelAccuracy(values, forecasts, patterns) {
  const testSize = Math.min(12, Math.floor(values.length * 0.2));
  if (testSize < 3) return {};
  
  const trainData = values.slice(0, -testSize);
  const testData = values.slice(-testSize);
  
  const accuracy = {};
  
  Object.entries(forecasts).forEach(([modelName, forecast]) => {
    // Generate forecast for test period
    let testForecast = [];
    
    switch (modelName) {
      case 'holtWinters':
        testForecast = holtWintersSmoothing(trainData, 24, {}, testSize);
        break;
      case 'exponential':
        testForecast = exponentialSmoothing(trainData, 0.3, testSize);
        break;
      case 'linear':
        testForecast = linearRegressionForecast(trainData, testSize);
        break;
      case 'movingAverage':
        testForecast = movingAverageForecast(trainData, 7, testSize);
        break;
    }
    
    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape = testData.reduce((sum, actual, i) => {
      const predicted = testForecast[i] || 0;
      return sum + (actual !== 0 ? Math.abs((actual - predicted) / actual) : 0);
    }, 0) / testData.length;
    
    accuracy[modelName] = {
      mape: mape * 100,
      rmse: Math.sqrt(testData.reduce((sum, actual, i) => {
        const predicted = testForecast[i] || 0;
        return sum + Math.pow(actual - predicted, 2);
      }, 0) / testData.length)
    };
  });
  
  return accuracy;
}

/**
 * Enhanced anomaly detection with multiple methods
 * @param {Array} data - Historical consumption data
 * @param {number} meterIndex - Meter to analyze
 * @param {Object} options - Detection options
 * @returns {Array} Detected anomalies with classifications
 */
export function detectAdvancedAnomalies(data, meterIndex = 0, options = {}) {
  const { threshold = 2.5, windowSize = 24, methods = ['statistical', 'seasonal', 'trend'] } = options;
  
  const values = data.map(d => d.deltas[meterIndex]);
  const anomalies = [];
  
  // Statistical anomaly detection (Z-score)
  if (methods.includes('statistical')) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    data.forEach((point, i) => {
      const value = point.deltas[meterIndex];
      const zScore = Math.abs(value - mean) / stdDev;
      
      if (zScore > threshold) {
        anomalies.push({
          timestamp: point.timestamp,
          value,
          zScore,
          type: value > mean ? 'spike' : 'drop',
          method: 'statistical',
          severity: zScore > threshold * 1.5 ? 'high' : 'medium'
        });
      }
    });
  }
  
  // Seasonal anomaly detection
  if (methods.includes('seasonal')) {
    const patterns = detectAdvancedSeasonalPatterns(data, meterIndex);
    
    data.forEach((point, i) => {
      const hour = point.timestamp.getHours();
      const expectedValue = patterns.hourlyAverages[hour];
      const value = point.deltas[meterIndex];
      
      if (expectedValue > 0) {
        const deviation = Math.abs(value - expectedValue) / expectedValue;
        
        if (deviation > 0.5) { // 50% deviation from seasonal norm
          anomalies.push({
            timestamp: point.timestamp,
            value,
            expectedValue,
            deviation,
            type: value > expectedValue ? 'seasonal-spike' : 'seasonal-drop',
            method: 'seasonal',
            severity: deviation > 1.0 ? 'high' : 'medium'
          });
        }
      }
    });
  }
  
  // Trend-based anomaly detection
  if (methods.includes('trend') && values.length > windowSize) {
    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i);
      const x = window.map((_, idx) => idx);
      const regression = linearRegression(x, window);
      
      const expectedValue = regression.slope * windowSize + regression.intercept;
      const actualValue = values[i];
      const residual = Math.abs(actualValue - expectedValue);
      
      // Calculate residual threshold
      const residuals = window.map((val, idx) => 
        Math.abs(val - (regression.slope * idx + regression.intercept))
      );
      const residualMean = residuals.reduce((sum, val) => sum + val, 0) / residuals.length;
      const residualStd = Math.sqrt(
        residuals.reduce((sum, val) => sum + Math.pow(val - residualMean, 2), 0) / residuals.length
      );
      
      if (residual > residualMean + threshold * residualStd) {
        anomalies.push({
          timestamp: data[i].timestamp,
          value: actualValue,
          expectedValue,
          residual,
          type: actualValue > expectedValue ? 'trend-spike' : 'trend-drop',
          method: 'trend',
          severity: residual > residualMean + threshold * 1.5 * residualStd ? 'high' : 'medium'
        });
      }
    }
  }
  
  // Remove duplicates and sort by timestamp
  const uniqueAnomalies = anomalies.filter((anomaly, index, self) => 
    index === self.findIndex(a => 
      Math.abs(a.timestamp.getTime() - anomaly.timestamp.getTime()) < 60000 // within 1 minute
    )
  );
  
  return uniqueAnomalies.sort((a, b) => a.timestamp - b.timestamp);
}

// Keep existing functions for backward compatibility
export const generateWaterConsumptionForecast = generateAdvancedForecast;
export const detectAnomalies = detectAdvancedAnomalies;

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
 * Anomaly detection for unusual consumption patterns
 * @param {Array} data - Historical consumption data
 * @param {number} meterIndex - Meter to analyze
 * @param {number} threshold - Standard deviations for anomaly threshold
 * @returns {Array} Detected anomalies
 */
function detectAnomaliesOld(data, meterIndex = 0, threshold = 2) {
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
export function testAdvancedForecasting() {
  const exampleUsage = `
  // 1. Parse your CSV data
  const data = parseWaterConsumptionData(csvString, 'deposito');
  
  // 2. Generate advanced forecast with model selection
  const forecast = generateAdvancedForecast(data, {
    forecastHours: 48,
    meterIndex: 0,
    modelSelection: 'auto', // or 'holt-winters', 'exponential', 'linear'
    confidenceLevel: 0.9
  });
  
  // 3. Detect anomalies with multiple methods
  const anomalies = detectAdvancedAnomalies(data, 0, {
    threshold: 2.5,
    methods: ['statistical', 'seasonal', 'trend']
  });
  
  // 4. Access results
  console.log('Selected model:', forecast.models.selected);
  console.log('Model accuracy:', forecast.metadata.modelAccuracy);
  console.log('Seasonal strength:', forecast.metadata.patterns.seasonalStrength);
  console.log('Trend strength:', forecast.metadata.patterns.trendStrength);
  console.log('Detected anomalies:', anomalies);
  `;
  
  return exampleUsage;
}
