
export interface ParsedDataPoint {
  id: string;
  location: string;
  datetime: Date;
  filename: string;
  values: Record<string, number | string>;
}

export interface LocationStats {
  location: string;
  totalRecords: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  averageValues: Record<string, number>;
  lastUpdate: Date;
}

export interface ForecastPoint {
  datetime: Date;
  value: number;
  confidence?: number;
}
