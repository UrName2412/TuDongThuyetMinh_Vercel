import { supabase } from "./supabase-client.js";
import { POI_IMAGE_BUCKET, TABLES, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./supabase-config.js";
import { sanitizeText, showToast } from "./admin-common.js";
import { getImagesByPoiIds, getPois } from "./data-service.js";

export async function loadPoiDataset() {
  const pois = await getPois();
  const imageMap = await getImagesByPoiIds(pois.map((item) => item.id));
  return { pois, imageMap };
}

export function renderPoiRows(pois, imageMap) {
  return pois.map((poi) => {
    const imageUrl = imageMap.get(poi.id)?.image_url || "";
    return `
      <tr>
        <td>${poi.id}</td>
        <td>${sanitizeText(poi.name || "")}</td>
        <td>${imageUrl ? `<a class="image-link" target="_blank" rel="noopener noreferrer" href="${sanitizeText(imageUrl)}"><img class="poi-thumbnail" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name || "")}"></a>` : "-"}</td>
        <td>${sanitizeText(poi.description || "")}</td>
        <td>${poi.latitude ?? ""}</td>
        <td>${poi.longitude ?? ""}</td>
        <td>${poi.radius ?? 0} m</td>
        <td>${poi.classification === "minor" ? "Phụ" : "Chính"}</td>
        <td>${sanitizeText(poi.minor_category || "")}</td>
        <td>
          <a class="btn edit" href="edit_poi.html?id=${poi.id}">Sửa</a>
          <button class="btn delete" data-delete-id="${poi.id}">Xóa</button>
        </td>
      </tr>
    `;
  }).join("");
}

export async function ensureCanDeletePoi(id) {
  const { data, error } = await supabase.from(TABLES.TOUR_POI).select("tour_id").eq("poi_id", id).limit(1);
  if (error) throw error;
  return !(data && data.length > 0);
}

export async function deletePoi(id, imageMap) {
  const canDelete = await ensureCanDeletePoi(id);
  if (!canDelete) {
    showToast("Không thể xóa POI vì nó đang được sử dụng trong tour", "delete");
    return false;
  }

  const imageRow = imageMap.get(id);
  if (imageRow?.id) {
    const { error: imgError } = await supabase.from(TABLES.IMAGE).delete().eq("id", imageRow.id);
    if (imgError) throw imgError;
  }

  const { error } = await supabase.from(TABLES.POI).delete().eq("id", id);
  if (error) throw error;
  return true;
}

export function initPickerMap(mapId, latInputId, lngInputId, initialLat = null, initialLng = null) {
  const lat = Number(initialLat || DEFAULT_MAP_CENTER[0]);
  const lng = Number(initialLng || DEFAULT_MAP_CENTER[1]);

  const map = L.map(mapId).setView([lat, lng], DEFAULT_MAP_ZOOM + 1);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  let marker = null;
  if (initialLat && initialLng) {
    marker = L.marker([lat, lng]).addTo(map);
  }

  map.on("click", (event) => {
    const pickedLat = event.latlng.lat;
    const pickedLng = event.latlng.lng;
    document.getElementById(latInputId).value = pickedLat;
    document.getElementById(lngInputId).value = pickedLng;

    if (marker) {
      marker.setLatLng([pickedLat, pickedLng]);
    } else {
      marker = L.marker([pickedLat, pickedLng]).addTo(map);
    }
  });

  return map;
}

async function uploadImageIfAny(file, poiId) {
  if (!file) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `poi/${poiId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(POI_IMAGE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg"
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(POI_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createPoiFromForm() {
  const payload = {
    name: document.getElementById("poi-name").value.trim(),
    description: document.getElementById("poi-description").value.trim(),
    latitude: Number(document.getElementById("poi-lat").value),
    longitude: Number(document.getElementById("poi-lng").value),
    radius: Number(document.getElementById("poi-radius").value),
    classification: document.getElementById("poi-classification").value,
    minor_category: document.getElementById("poi-minor-category").value || null
  };

  if (!payload.name || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude) || Number.isNaN(payload.radius)) {
    throw new Error("Vui lòng nhập đủ thông tin và chọn vị trí trên bản đồ!");
  }

  const { data, error } = await supabase.from(TABLES.POI).insert(payload).select("id").single();
  if (error) throw error;

  const file = document.getElementById("poi-image").files[0];
  if (file) {
    const imageUrl = await uploadImageIfAny(file, data.id);
    const { error: imageError } = await supabase.from(TABLES.IMAGE).insert({ poi_id: data.id, image_url: imageUrl });
    if (imageError) throw imageError;
  }

  return data.id;
}

export async function updatePoiFromForm(poiId, existingImageRow) {
  const payload = {
    name: document.getElementById("poi-name").value.trim(),
    description: document.getElementById("poi-description").value.trim(),
    latitude: Number(document.getElementById("poi-lat").value),
    longitude: Number(document.getElementById("poi-lng").value),
    radius: Number(document.getElementById("poi-radius").value),
    classification: document.getElementById("poi-classification").value,
    minor_category: document.getElementById("poi-minor-category").value || null
  };

  if (!payload.name || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude) || Number.isNaN(payload.radius)) {
    throw new Error("Vui lòng nhập đủ thông tin và chọn vị trí trên bản đồ!");
  }

  const { error } = await supabase.from(TABLES.POI).update(payload).eq("id", poiId);
  if (error) throw error;

  const file = document.getElementById("poi-image").files[0];
  if (file) {
    const imageUrl = await uploadImageIfAny(file, poiId);
    if (existingImageRow?.id) {
      const { error: imageError } = await supabase.from(TABLES.IMAGE).update({ image_url: imageUrl }).eq("id", existingImageRow.id);
      if (imageError) throw imageError;
    } else {
      const { error: imageError } = await supabase.from(TABLES.IMAGE).insert({ poi_id: poiId, image_url: imageUrl });
      if (imageError) throw imageError;
    }
  }
}
