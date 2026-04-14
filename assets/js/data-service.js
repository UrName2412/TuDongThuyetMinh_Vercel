import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";

export async function getPois() {
  const { data, error } = await supabase.from(TABLES.POI).select("*").order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPoiById(poiId) {
  const { data, error } = await supabase.from(TABLES.POI).select("*").eq("id", Number(poiId)).maybeSingle();
  if (error) throw error;
  return data || null;
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

export async function getImageRowsByPoiIds(poiIds) {
  if (!poiIds || poiIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from(TABLES.IMAGE)
    .select("id,poi_id,image_url")
    .in("poi_id", poiIds)
    .order("id", { ascending: true });

  if (error) throw error;

  const map = new Map();
  for (const row of data || []) {
    if (!map.has(row.poi_id)) {
      map.set(row.poi_id, []);
    }
    map.get(row.poi_id).push(row);
  }
  return map;
}

export async function recordPoiVisit(poiId, source = "qr") {
  const payload = {
    poi_id: Number(poiId),
    source
  };

  const { error } = await supabase.from(TABLES.POI_VISIT).insert(payload);
  if (error) throw error;
}

export async function getPoiVisitStats(poiIds) {
  if (!poiIds || poiIds.length === 0) {
    return {
      total: 0,
      countByPoiId: new Map(),
      latestByPoiId: new Map()
    };
  }

  const { data, error } = await supabase
    .from(TABLES.POI_VISIT)
    .select("poi_id,created_at")
    .in("poi_id", poiIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const countByPoiId = new Map();
  const latestByPoiId = new Map();

  for (const row of data || []) {
    const poiId = Number(row.poi_id);
    countByPoiId.set(poiId, (countByPoiId.get(poiId) || 0) + 1);
    if (!latestByPoiId.has(poiId)) {
      latestByPoiId.set(poiId, row.created_at || null);
    }
  }

  return {
    total: (data || []).length,
    countByPoiId,
    latestByPoiId
  };
}
