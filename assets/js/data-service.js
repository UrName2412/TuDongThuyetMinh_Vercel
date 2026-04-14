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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (poiReadError) throw poiReadError;
  if (!poiRow) throw new Error("POI khong ton tai");

  const visitField = Object.keys(poiRow).find((key) => key.toLowerCase() === "poivisit");
  if (!visitField) {
    throw new Error("Bang POI chua co cot PoiVisit/poivisit");
  }

  const currentVisit = Number(poiRow[visitField] || 0);
  const nextVisit = Number.isFinite(currentVisit) ? currentVisit + 1 : 1;
  const { data: updatedPoiRow, error: poiUpdateError } = await supabase
    .from(TABLES.POI)
    .update({ [visitField]: nextVisit })
    .eq("id", id)
    .select(`id,${visitField}`)
    .maybeSingle();

  if (poiUpdateError) throw poiUpdateError;
  if (!updatedPoiRow) {
    throw new Error("Khong cap nhat duoc bo dem PoiVisit. Kiem tra RLS/policy UPDATE cho bang poi.");
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

  const countByPoiId = new Map();
  const latestByPoiId = new Map();

  const { data: poiRows, error: poiError } = await supabase
    .from(TABLES.POI)
    .select("id,PoiVisit")
    .in("id", poiIds)
    .order("id", { ascending: false });

  if (poiError) throw poiError;

  for (const row of poiRows || []) {
    const poiId = Number(row.id);
    countByPoiId.set(poiId, Number(row.PoiVisit || 0));
  }

  return {
    total: Array.from(countByPoiId.values()).reduce((sum, value) => sum + value, 0),
    countByPoiId,
    latestByPoiId
  };
}
