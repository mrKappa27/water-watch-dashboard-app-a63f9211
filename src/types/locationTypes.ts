export interface LocationCoordinates {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export interface LocationCoordinatesInsert {
  location_name: string;
  latitude: number;
  longitude: number;
  description?: string;
  created_by?: string;
}

export interface LocationCoordinatesUpdate {
  location_name?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}