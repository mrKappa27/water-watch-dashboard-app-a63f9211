import { supabase } from "@/integrations/supabase/client";
import { LocationCoordinates, LocationCoordinatesInsert, LocationCoordinatesUpdate } from "@/types/locationTypes";

export async function getLocationCoordinates(): Promise<LocationCoordinates[]> {
  const { data, error } = await supabase
    .from('location_coordinates')
    .select('*')
    .order('location_name');

  if (error) {
    throw error;
  }

  return data?.map(coord => ({
    ...coord,
    created_at: new Date(coord.created_at),
    updated_at: new Date(coord.updated_at),
  })) || [];
}

export async function createLocationCoordinates(coordinates: LocationCoordinatesInsert): Promise<LocationCoordinates> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('location_coordinates')
    .insert([{
      ...coordinates,
      created_by: user?.id
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  };
}

export async function updateLocationCoordinates(id: string, updates: LocationCoordinatesUpdate): Promise<LocationCoordinates> {
  const { data, error } = await supabase
    .from('location_coordinates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  };
}

export async function deleteLocationCoordinates(id: string): Promise<void> {
  const { error } = await supabase
    .from('location_coordinates')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function getLocationCoordinate(locationName: string): Promise<LocationCoordinates | null> {
  const { data, error } = await supabase
    .from('location_coordinates')
    .select('*')
    .eq('location_name', locationName)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  };
}