import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Plus, MapPin } from "lucide-react";
import { LocationCoordinates } from "@/types/locationTypes";
import { getLocationCoordinates, createLocationCoordinates, updateLocationCoordinates, deleteLocationCoordinates } from "@/utils/locationCoordinates";
import { useToast } from "@/hooks/use-toast";

interface LocationCoordinatesManagerProps {
  onLocationSelect?: (location: LocationCoordinates) => void;
}

const LocationCoordinatesManager: React.FC<LocationCoordinatesManagerProps> = ({ onLocationSelect }) => {
  const [locations, setLocations] = useState<LocationCoordinates[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationCoordinates | null>(null);
  const [formData, setFormData] = useState({
    location_name: "",
    latitude: "",
    longitude: "",
    description: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await getLocationCoordinates();
      setLocations(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load location coordinates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.location_name.trim() || !formData.latitude || !formData.longitude) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const coordinatesData = {
        location_name: formData.location_name.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        description: formData.description.trim() || undefined,
      };

      if (editingLocation) {
        await updateLocationCoordinates(editingLocation.id, coordinatesData);
        toast({
          title: "Success",
          description: "Location coordinates updated successfully",
        });
      } else {
        await createLocationCoordinates(coordinatesData);
        toast({
          title: "Success",
          description: "Location coordinates added successfully",
        });
      }

      await loadLocations();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save location coordinates",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (location: LocationCoordinates) => {
    setEditingLocation(location);
    setFormData({
      location_name: location.location_name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      description: location.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      await deleteLocationCoordinates(id);
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      await loadLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    setFormData({ location_name: "", latitude: "", longitude: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Location Coordinates</h2>
          <p className="text-muted-foreground">Manage GPS coordinates for your locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Edit Location" : "Add New Location"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="location_name">Location Name *</Label>
                <Input
                  id="location_name"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="Enter location name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., 40.7128"
                  required
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., -74.0060"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingLocation ? "Update" : "Add"} Location
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Configured Locations
          </CardTitle>
          <CardDescription>
            {locations.length} location{locations.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No locations configured yet. Add your first location to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Name</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow
                    key={location.id}
                    className={onLocationSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onLocationSelect?.(location)}
                  >
                    <TableCell className="font-medium">{location.location_name}</TableCell>
                    <TableCell>{location.latitude.toFixed(6)}</TableCell>
                    <TableCell>{location.longitude.toFixed(6)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {location.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(location);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(location.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationCoordinatesManager;