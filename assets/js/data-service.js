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
  const id = Number(poiId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("POI ID khong hop le");
  }

  const { data: poiRow, error: poiReadError } = await supabase
    .from(TABLES.POI)
    .select("id,PoiVisit")
    .eq("id", id)
    .maybeSingle();

  if (poiReadError) throw poiReadError;
  if (!poiRow) throw new Error("POI khong ton tai");

  const currentVisit = Number(poiRow.PoiVisit || 0);
  const { error: poiUpdateError } = await supabase
    .from(TABLES.POI)
    .update({ PoiVisit: currentVisit + 1 })
    .eq("id", id);

  if (poiUpdateError) throw poiUpdateError;

  // Keep detailed visit log when table exists, but do not block check-in if this step fails.
  const payload = {
    poi_id: id,
    source
  };
  const { error: logInsertError } = await supabase.from(TABLES.POI_VISIT).insert(payload);
  if (logInsertError) {
    console.warn("[recordPoiVisit] Insert PoiVisit log failed:", logInsertError.message || logInsertError);
  }
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
