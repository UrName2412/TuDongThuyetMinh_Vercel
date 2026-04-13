import { supabase } from "./supabase-client.js";
import { POI_IMAGE_BUCKET, TABLES, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./supabase-config.js";
import { sanitizeText, showToast, safeGetValue } from "./admin-common.js";
import { getImagesByPoiIds, getImageRowsByPoiIds, getPois } from "./data-service.js";

export async function loadPoiDataset() {
  const pois = await getPois();
  const imageMap = await getImagesByPoiIds(pois.map((item) => item.id));
  const imageRowsMap = await getImageRowsByPoiIds(pois.map((item) => item.id));
  return { pois, imageMap, imageRowsMap };
}

//render hàng poi
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
  return true;
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

export async function deletePoi(id) {
  console.log(`[DELETE POI] Starting deletion for POI ID: ${id}`);

  const { data: imageRows, error: imageFetchError } = await supabase
    .from(TABLES.IMAGE)
    .select("id,image_url")
    .eq("poi_id", id);
  if (imageFetchError) throw imageFetchError;

  if (imageRows && imageRows.length > 0) {
    for (const row of imageRows) {
      if (row?.image_url) {
        await removeImageObjectIfAny(row.image_url);
      }
    }

    const { error: deleteImageRowsError } = await supabase.from(TABLES.IMAGE).delete().eq("poi_id", id);
    if (deleteImageRowsError) throw deleteImageRowsError;
  }

  // Now, delete the POI record itself.
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

  function setMarker(newLat, newLng) {
    if (marker) {
      marker.setLatLng([newLat, newLng]);
    } else {
      marker = L.marker([newLat, newLng]).addTo(map);
    }
    map.setView([newLat, newLng], 15);
  }

  // Nếu có initial → set marker
  if (initialLat && initialLng) {
    setMarker(lat, lng);
  }

  // ✅ CLICK MAP → UPDATE INPUT
  map.on("click", (event) => {
    const pickedLat = event.latlng.lat;
    const pickedLng = event.latlng.lng;

    document.getElementById(latInputId).value = pickedLat;
    document.getElementById(lngInputId).value = pickedLng;

    setMarker(pickedLat, pickedLng);
  });

  // ✅ INPUT → UPDATE MAP
  function updateFromInput() {
    const latVal = parseFloat(document.getElementById(latInputId).value);
    const lngVal = parseFloat(document.getElementById(lngInputId).value);

    if (!isNaN(latVal) && !isNaN(lngVal)) {
      setMarker(latVal, lngVal);
    }
  }

  document.getElementById(latInputId).addEventListener("change", updateFromInput);
  document.getElementById(lngInputId).addEventListener("change", updateFromInput);

  return map;
}

async function uploadImagesIfAny(files, poiId) {
  if (!files || files.length === 0) return [];

  const uploadedUrls = [];
  for (const [index, file] of files.entries()) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File ảnh quá lớn (tối đa 5MB)");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Chỉ chấp nhận file ảnh");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `poi/${poiId}/${Date.now()}-${index}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(POI_IMAGE_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg"
      });

    if (uploadError) {
      throw new Error(`Upload ảnh thất bại: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(POI_IMAGE_BUCKET).getPublicUrl(path);
    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

async function saveImageRows(poiId, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;
  const rows = imageUrls.map((url) => ({ poi_id: poiId, image_url: url }));
  const { error } = await supabase.from(TABLES.IMAGE).insert(rows);
  if (error) {
    throw new Error(`Lưu ảnh thất bại: ${error.message}`);
  }
}

export async function createPoiFromForm() {
  console.log("[CREATE POI] Starting...");

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession();
  console.log("[SESSION]", session ? "Active" : "No session!");
  if (!session) {
    throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
  }

  const latRaw = safeGetValue("poi-lat");
  const lngRaw = safeGetValue("poi-lng");
  const radiusRaw = safeGetValue("poi-radius") || "50";

  if (!safeGetValue("poi-name")) {
    throw new Error("Vui lòng nhập tên POI");
  }

  if (latRaw === "" || lngRaw === "") {
    throw new Error("Vui lòng nhập hoặc chọn vị trí");
  }

  if (isNaN(latRaw) || isNaN(lngRaw)) {
    throw new Error("Latitude và Longitude phải là số");
  }

  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);

  if (lat < -90 || lat > 90) {
    throw new Error("Latitude phải trong khoảng -90 đến 90");
  }

  if (lng < -500 || lng > 500) {
    throw new Error("Longitude phải trong khoảng -500 đến 500");
  }

  if (isNaN(radiusRaw)) {
    throw new Error("Radius phải là số");
  }

  const payload = {
    name: safeGetValue("poi-name"),
    description: safeGetValue("poi-description"),
    latitude: lat,
    longitude: lng,
    radius: Number(radiusRaw),
    map_link: safeGetValue("poi-map-link") || null
  };

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

  const files = Array.from(document.getElementById("poi-image").files || []);
  const imageUrls = await uploadImagesIfAny(files, data.id);
  await saveImageRows(data.id, imageUrls);

  console.log("[CREATE POI] COMPLETED");
  return data.id;
}

export async function updatePoiFromForm(poiId) {
  const payload = {
    name: safeGetValue("poi-name"),
    description: safeGetValue("poi-description"),
    latitude: Number(safeGetValue("poi-lat")),
    longitude: Number(safeGetValue("poi-lng")),
    radius: Number(safeGetValue("poi-radius")),
    map_link: safeGetValue("poi-map-link") || null
  };

  if (!payload.name || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude) || Number.isNaN(payload.radius)) {
    throw new Error("Vui lòng nhập đủ thông tin và chọn vị trí trên bản đồ!");
  }

  const { error } = await supabase.from(TABLES.POI).update(payload).eq("id", poiId);
  if (error) throw error;

  const files = Array.from(document.getElementById("poi-image").files || []);
  const imageUrls = await uploadImagesIfAny(files, poiId);
  await saveImageRows(poiId, imageUrls);
}
