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

function getStoragePathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const urlObject = new URL(url);
    // The path in Supabase Storage is the part of the pathname after the bucket name.
    // e.g., /storage/v1/object/public/images/poi/123/thumb.jpg -> poi/123/thumb.jpg
    const pathSegments = urlObject.pathname.split('/');
    const bucketNameIndex = pathSegments.indexOf(POI_IMAGE_BUCKET);
    
    if (bucketNameIndex === -1 || bucketNameIndex + 1 >= pathSegments.length) {
      console.warn(`[DELETE] Could not find bucket '${POI_IMAGE_BUCKET}' in URL path: ${urlObject.pathname}`);
      return null;
    }
    
    // Join the parts of the path *after* the bucket name
    const storagePath = pathSegments.slice(bucketNameIndex + 1).join('/');
    const decodedPath = decodeURIComponent(storagePath);
    console.log(`[DELETE] Extracted storage path: ${decodedPath}`);
    return decodedPath;
  } catch (e) {
    console.error(`[DELETE] Invalid URL provided to getStoragePathFromPublicUrl: ${url}`, e);
    return null;
  }
}

async function removeImageObjectIfAny(imageUrl) {
  const storagePath = getStoragePathFromPublicUrl(imageUrl);
  if (!storagePath) return;

  const { error } = await supabase.storage.from(POI_IMAGE_BUCKET).remove([storagePath]);
  if (error) {
    throw new Error(`Không thể xóa file ảnh trên Storage: ${error.message}`);
  }
}

export async function deletePoi(id, imageMap) {
  console.log(`[DELETE POI] Starting deletion for POI ID: ${id}`);
  const canDelete = await ensureCanDeletePoi(id);
  if (!canDelete) {
    const message = "Không thể xóa POI vì nó đang được sử dụng trong một hoặc nhiều tour.";
    console.warn(`[DELETE POI] Aborted: ${message}`);
    showToast(message, "delete");
    return false;
  }

  const imageRow = imageMap.get(id);
  if (imageRow?.image_url) {
    console.log(`[DELETE POI] Found associated image: ${imageRow.image_url}`);
    try {
      await removeImageObjectIfAny(imageRow.image_url);
      console.log(`[DELETE POI] Successfully removed image from Storage.`);
    } catch (storageError) {
      console.error("[DELETE POI] Error removing image from storage:", storageError);
      // Decide if you want to stop the process or just log the error and continue
      // For now, we'll throw to make it visible that something went wrong.
      throw storageError;
    }
  } else {
    console.log(`[DELETE POI] No associated image found for POI ID: ${id}`);
  }

  // Now, delete the POI record itself.
  // The 'image' table has a foreign key with cascade delete, 
  // so the image record will be deleted automatically when the POI is deleted.
  console.log(`[DELETE POI] Deleting POI record from table '${TABLES.POI}'...`);
  const { error } = await supabase.from(TABLES.POI).delete().eq("id", id);
  if (error) {
    console.error("[DELETE POI] Error deleting POI record:", error);
    throw error;
  }

  console.log(`[DELETE POI] Successfully deleted POI ID: ${id}`);
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
  
  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File ảnh quá lớn (tối đa 5MB)");
  }
  if (!file.type.startsWith('image/')) {
    throw new Error("Chỉ chấp nhận file ảnh");
  }
  
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `poi/${poiId}/${Date.now()}.${ext}`;

  console.log(`[UPLOAD] Starting upload to ${POI_IMAGE_BUCKET}/${path}, size: ${file.size}, type: ${file.type}`);
  
  const { error: uploadError } = await supabase.storage
    .from(POI_IMAGE_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg"
    });
    
  if (uploadError) {
    console.error("[UPLOAD ERROR]", uploadError);
    throw new Error(`Upload ảnh thất bại: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(POI_IMAGE_BUCKET).getPublicUrl(path);
  console.log("[UPLOAD SUCCESS]", data.publicUrl);
  return data.publicUrl;
}

export async function createPoiFromForm() {
  console.log("[CREATE POI] Starting...");
  
  // Refresh session
  const { data: { session } } = await supabase.auth.getSession();
  console.log("[SESSION]", session ? "Active" : "No session!");
  if (!session) {
    throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
  }

  const payload = {
    name: safeGetValue("poi-name"),
    description: safeGetValue("poi-description"),
    latitude: Number(safeGetValue("poi-lat")),
    longitude: Number(safeGetValue("poi-lng")),
    radius: Number(safeGetValue("poi-radius"))
  };

  if (!payload.name || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude) || Number.isNaN(payload.radius)) {
    throw new Error("Vui lòng nhập đủ thông tin và chọn vị trí trên bản đồ!");
  }

  console.log("[POI INSERT]", payload);
  const { data, error: poiError } = await supabase
    .from(TABLES.POI)
    .insert(payload)
    .select("id")
    .single();
    
  if (poiError) {
    console.error("[POI INSERT ERROR]", poiError);
    throw new Error(`Tạo POI thất bại: ${poiError.message}`);
  }
  console.log("[POI CREATED]", data.id);

  const file = document.getElementById("poi-image").files[0];
  if (file) {
    const imageUrl = await uploadImageIfAny(file, data.id);
    console.log("[IMAGE INSERT]", { poi_id: data.id, image_url: imageUrl });
    const { error: imageError } = await supabase
      .from(TABLES.IMAGE)
      .insert({ poi_id: data.id, image_url: imageUrl });
      
    if (imageError) {
      console.error("[IMAGE INSERT ERROR]", imageError);
      throw new Error(`Lưu ảnh thất bại: ${imageError.message}`);
    }
    console.log("[IMAGE SAVED SUCCESS]");
  }

  console.log("[CREATE POI] COMPLETED");
  return data.id;
}

export async function updatePoiFromForm(poiId, existingImageRow) {
  const payload = {
    name: safeGetValue("poi-name"),
    description: safeGetValue("poi-description"),
    latitude: Number(safeGetValue("poi-lat")),
    longitude: Number(safeGetValue("poi-lng")),
    radius: Number(safeGetValue("poi-radius"))
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
