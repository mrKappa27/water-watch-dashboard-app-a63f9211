
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getLeakDetectionThresholds, saveLeakDetectionThresholds } from "@/utils/leakDetectionThresholds";
import { getLocationStats } from "@/utils/supabaseSync";
import { LocationStats } from "@/types/dataTypes";

const LeakDetectionSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<LocationStats[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [goodThreshold, setGoodThreshold] = useState<number>(0.5);
  const [warningThreshold, setWarningThreshold] = useState<number>(2.0);
  const [highThreshold, setHighThreshold] = useState<number>(5.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadLocations = async () => {
      if (!user) return;
      
      try {
        const locationStats = await getLocationStats(user.id);
        setLocations(locationStats);
        if (locationStats.length > 0 && !selectedLocation) {
          setSelectedLocation(locationStats[0].location);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };

    loadLocations();
  }, [user]);

  useEffect(() => {
    const loadThresholds = async () => {
      if (!user || !selectedLocation) return;
      
      setIsLoading(true);
      try {
        const thresholds = await getLeakDetectionThresholds(user.id, selectedLocation);
        if (thresholds) {
          setGoodThreshold(Number(thresholds.good_threshold));
          setWarningThreshold(Number(thresholds.warning_threshold));
          setHighThreshold(Number(thresholds.high_threshold));
        } else {
          // Reset to defaults if no thresholds found
          setGoodThreshold(0.5);
          setWarningThreshold(2.0);
          setHighThreshold(5.0);
        }
      } catch (error) {
        console.error('Error loading thresholds:', error);
        toast({
          title: "Error",
          description: "Failed to load threshold settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadThresholds();
  }, [user, selectedLocation, toast]);

  const handleSave = async () => {
    if (!user || !selectedLocation) return;

    // Validate thresholds
    if (goodThreshold >= warningThreshold || warningThreshold >= highThreshold) {
      toast({
        title: "Invalid Thresholds",
        description: "Thresholds must be in ascending order: Good < Warning < High",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveLeakDetectionThresholds({
        user_id: user.id,
        location: selectedLocation,
        good_threshold: goodThreshold,
        warning_threshold: warningThreshold,
        high_threshold: highThreshold,
      });

      if (success) {
        toast({
          title: "Success",
          description: "Leak detection thresholds saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save threshold settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving thresholds:', error);
      toast({
        title: "Error",
        description: "Failed to save threshold settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please log in to configure leak detection settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leak Detection Thresholds</CardTitle>
        <CardDescription>
          Configure thresholds for leak detection analysis. These apply to delta parameters (DELTA1-4) only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.location} value={location.location}>
                  {location.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="good-threshold">Good Threshold</Label>
            <Input
              id="good-threshold"
              type="number"
              step="0.1"
              min="0"
              value={goodThreshold}
              onChange={(e) => setGoodThreshold(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Values below this are considered normal</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warning-threshold">Warning Threshold</Label>
            <Input
              id="warning-threshold"
              type="number"
              step="0.1"
              min="0"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Values above this trigger warnings</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="high-threshold">High Threshold</Label>
            <Input
              id="high-threshold"
              type="number"
              step="0.1"
              min="0"
              value={highThreshold}
              onChange={(e) => setHighThreshold(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Values above this indicate potential leaks</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isSaving || !selectedLocation}
          >
            {isSaving ? 'Saving...' : 'Save Thresholds'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeakDetectionSettings;
