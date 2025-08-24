import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, AlertCircle } from "lucide-react";
import { LocationCoordinates } from "@/types/locationTypes";
import { getLocationCoordinates } from "@/utils/locationCoordinates";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface LocationMapProps {
  selectedLocation?: LocationCoordinates | null;
}

const LocationMap: React.FC<LocationMapProps> = ({ selectedLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [locations, setLocations] = useState<LocationCoordinates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState(() => {
    return localStorage.getItem('mapbox-token') || "";
  });
  const [showTokenInput, setShowTokenInput] = useState(() => {
    return !localStorage.getItem('mapbox-token');
  });
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const summaryPopupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    // Auto-initialize map if we have a saved token and locations are loaded
    if (mapboxToken && !map.current && !isLoading && !showTokenInput) {
      initializeMap();
    }
  }, [mapboxToken, isLoading]);

  useEffect(() => {
    if (selectedLocation && map.current) {
      flyToLocation(selectedLocation);
    }
  }, [selectedLocation]);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await getLocationCoordinates();
      setLocations(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = async () => {
    if (!mapboxToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Mapbox access token",
        variant: "destructive",
      });
      return;
    }

    if (!mapContainer.current) return;

    setIsLoadingMap(true);
    
    try {
      mapboxgl.accessToken = mapboxToken.trim();
      
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [0, 20],
        zoom: 2
      });

      newMap.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      newMap.on('load', () => {
        map.current = newMap;
        addLocationMarkers();
        setShowTokenInput(false);
        setIsLoadingMap(false);
        
        // Save token to localStorage on successful initialization
        localStorage.setItem('mapbox-token', mapboxToken.trim());
        
        if (locations.length > 0) {
          fitMapToLocations();
        }
      });

      newMap.on('error', (e) => {
        console.error('Mapbox error:', e);
        toast({
          title: "Map Error",
          description: "Failed to load the map. Please check your Mapbox token.",
          variant: "destructive",
        });
        setIsLoadingMap(false);
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize the map",
        variant: "destructive",
      });
      setIsLoadingMap(false);
    }
  };

  const addLocationMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    locations.forEach(location => {
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.innerHTML = `
        <div style="
          background: hsl(var(--primary));
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          ${location.location_name.charAt(0).toUpperCase()}
        </div>
      `;

      // Add hover effect
      el.addEventListener('mouseenter', () => {
        if (el.firstElementChild) {
          (el.firstElementChild as HTMLElement).style.transform = 'scale(1.2)';
        }
      });
      
      el.addEventListener('mouseleave', () => {
        if (el.firstElementChild) {
          (el.firstElementChild as HTMLElement).style.transform = 'scale(1)';
        }
      });

      // Add click handler to show data summary
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showLocationSummary(location);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  const fitMapToLocations = () => {
    if (!map.current || locations.length === 0) return;

    if (locations.length === 1) {
      const location = locations[0];
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 12
      });
    } else {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach(location => {
        bounds.extend([location.longitude, location.latitude]);
      });

      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 }
      });
    }
  };

  const flyToLocation = (location: LocationCoordinates) => {
    if (!map.current) return;
    
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 2000
    });
  };

  const resetMapView = () => {
    fitMapToLocations();
  };

  const showLocationSummary = async (location: LocationCoordinates) => {
    if (!user) return;

    // Close any existing popup
    if (summaryPopupRef.current) {
      summaryPopupRef.current.remove();
    }

    try {
      // Fetch location data summary
      const { getLocationDataSummary } = await import("@/utils/locationDataSummary");
      const summary = await getLocationDataSummary(user.id, location.location_name);

      if (!summary) {
        // Show "no data" popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '350px'
        }).setHTML(`
          <div style="padding: 16px; font-family: system-ui;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #ef4444;"></div>
              <h3 style="margin: 0; font-weight: 600; color: hsl(var(--foreground));">
                ${location.location_name}
              </h3>
            </div>
            <p style="margin: 0; color: hsl(var(--muted-foreground)); font-size: 14px;">
              No monitoring data available for this location.
            </p>
            ${location.description ? `
              <p style="margin: 8px 0 0 0; color: hsl(var(--foreground)); font-size: 14px;">
                ${location.description}
              </p>
            ` : ''}
          </div>
        `)
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

        summaryPopupRef.current = popup;
        return;
      }

      // Show data summary popup
      const statusColor = 
        summary.status === 'active' ? '#10b981' : 
        summary.status === 'warning' ? '#f59e0b' : '#ef4444';

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '350px'
      }).setHTML(`
        <div style="padding: 16px; font-family: system-ui;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColor};"></div>
            <h3 style="margin: 0; font-weight: 600; color: hsl(var(--foreground));">
              ${location.location_name}
            </h3>
          </div>
          
          <div style="margin-bottom: 12px; font-size: 13px; color: hsl(var(--muted-foreground));">
            Last update: ${summary.latestReading.datetime.toLocaleDateString()}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 2px;">Records</div>
              <div style="font-weight: 600; color: hsl(var(--foreground));">${summary.totalRecords.toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 2px;">Days Active</div>
              <div style="font-weight: 600; color: hsl(var(--foreground));">
                ${Math.ceil((summary.dateRange.end.getTime() - summary.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))}
              </div>
            </div>
          </div>

          ${summary.latestReading.temp !== undefined || summary.latestReading.vbat !== undefined || 
            summary.latestReading.totalConsumption !== undefined ? `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 8px; font-weight: 500;">Latest Readings</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
                ${summary.latestReading.temp !== undefined ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: hsl(var(--muted-foreground));">🌡️ Temp</span>
                    <span style="font-weight: 500; color: hsl(var(--foreground));">${summary.latestReading.temp.toFixed(1)}°C</span>
                  </div>
                ` : ''}
                ${summary.latestReading.vbat !== undefined ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: hsl(var(--muted-foreground));">🔋 Battery</span>
                    <span style="font-weight: 500; color: hsl(var(--foreground));">${summary.latestReading.vbat.toFixed(2)}V</span>
                  </div>
                ` : ''}
                ${summary.latestReading.totalConsumption !== undefined ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: hsl(var(--muted-foreground));">💧 Total</span>
                    <span style="font-weight: 500; color: hsl(var(--foreground));">${summary.latestReading.totalConsumption.toFixed(0)}L</span>
                  </div>
                ` : ''}
                ${summary.latestReading.flowRate !== undefined ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: hsl(var(--muted-foreground));">⚡ Flow</span>
                    <span style="font-weight: 500; color: hsl(var(--foreground));">${summary.latestReading.flowRate.toFixed(1)}L/h</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <div style="padding: 8px; background: hsl(var(--muted)); border-radius: 6px; text-align: center;">
            <span style="font-size: 12px; font-weight: 500; color: hsl(var(--foreground)); text-transform: capitalize;">
              Status: ${summary.status}
            </span>
          </div>
        </div>
      `)
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current!);

      summaryPopupRef.current = popup;

      // Clean up when popup closes
      popup.on('close', () => {
        summaryPopupRef.current = null;
      });

    } catch (error) {
      console.error('Error loading location summary:', error);
      toast({
        title: "Error",
        description: "Failed to load location data",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading locations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Location Map</h2>
          <p className="text-muted-foreground">
            View {locations.length} location{locations.length !== 1 ? "s" : ""} on the map
          </p>
        </div>
        {map.current && (
          <Button onClick={resetMapView} variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            View All Locations
          </Button>
        )}
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground">No Locations Found</h3>
              <p className="text-muted-foreground">
                Add location coordinates first to display them on the map.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {showTokenInput && (
              <div className="p-6 border-b">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Mapbox Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your Mapbox access token to display the map.{" "}
                      <a
                        href="https://account.mapbox.com/access-tokens/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Get your token here
                      </a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mapbox-token">Mapbox Access Token</Label>
                    <Input
                      id="mapbox-token"
                      type="password"
                      placeholder="pk.eyJ1IjoibXl1c2VyIiwiYSI6ImFiYzEyMyJ9..."
                      value={mapboxToken}
                      onChange={(e) => setMapboxToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && initializeMap()}
                    />
                  </div>
                  <Button 
                    onClick={initializeMap} 
                    disabled={!mapboxToken.trim() || isLoadingMap}
                    className="w-full"
                  >
                    {isLoadingMap ? "Loading Map..." : "Load Map"}
                  </Button>
                </div>
              </div>
            )}
            <div 
              ref={mapContainer} 
              className="w-full h-[600px] rounded-b-lg"
              style={{ display: showTokenInput ? 'none' : 'block' }}
            />
          </CardContent>
        </Card>
      )}

      {/* No longer need the hidden container */}
    </div>
  );
};

export default LocationMap;