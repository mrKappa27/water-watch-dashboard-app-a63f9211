import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Settings } from "lucide-react";
import LocationCoordinatesManager from "./LocationCoordinatesManager";
import LocationMap from "./LocationMap";
import { LocationCoordinates } from "@/types/locationTypes";

const LocationsPanel: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationCoordinates | null>(null);
  const [activeTab, setActiveTab] = useState("map");

  const handleLocationSelect = (location: LocationCoordinates) => {
    setSelectedLocation(location);
    setActiveTab("map");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map" className="gap-2">
            <MapPin className="h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="h-4 w-4" />
            Manage Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <LocationMap selectedLocation={selectedLocation} />
        </TabsContent>

        <TabsContent value="manage">
          <LocationCoordinatesManager onLocationSelect={handleLocationSelect} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LocationsPanel;