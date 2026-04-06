import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";

export async function getPois() {
  const { data, error } = await supabase.from(TABLES.POI).select("*").order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getImagesByPoiIds(poiIds) {
  if (!poiIds || poiIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from(TABLES.IMAGE)
    .select("id,poi_id,image_url")
    .in("poi_id", poiIds)
    .order("id", { ascending: true });

  if (error) throw error;

  const map = new Map();
  for (const row of data || []) {
    if (!map.has(row.poi_id)) map.set(row.poi_id, row);
  }
  return map;
}

export async function getTours() {
  const { data, error } = await supabase.from(TABLES.TOUR).select("*").order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getTourPoiRows(tourIds) {
  if (!tourIds || tourIds.length === 0) return [];
  const { data, error } = await supabase
    .from(TABLES.TOUR_POI)
    .select("tour_id,poi_id,order")
    .in("tour_id", tourIds)
    .order("order", { ascending: true });
  if (error) throw error;
  return data || [];
}
