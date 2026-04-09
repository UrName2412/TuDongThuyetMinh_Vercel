import { supabase } from "./supabase-client.js";
import { POI_IMAGE_BUCKET, TABLES, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./supabase-config.js";
import { requireAdmin, renderSidebar, showToast, sanitizeText } from "./admin-common.js";
import { getPois, getImagesByPoiIds } from "./data-service.js";

const state = {
  pois: [],
  imageMap: new Map(),
  editingPoiId: null,
  map: null,
  marker: null
};

function getMinorCategoryOptions(selected = "") {
  const items = ["", "WC", "Ban ve", "Gui xe", "Ben thuyen"];
  return items
    .map((item) => `<option value="${item}" ${selected === item ? "selected" : ""}>${item || "-- Chọn --"}</option>`)
    .join("");
}

function toPublicImage(url) {
  return url || "";
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
    console.log(`[DELETE] Extracted storage path from admin-poi.js: ${decodedPath}`);
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

function renderTable() {
  const search = document.getElementById("search-poi").value.trim().toLowerCase();
  const body = document.getElementById("poi-table-body");
  const rows = state.pois.filter((poi) => poi.name?.toLowerCase().includes(search));

  body.innerHTML = rows
    .map((poi) => {
      const imageRow = state.imageMap.get(poi.id);
      const imageUrl = toPublicImage(imageRow?.image_url);
      return `
        <tr>
          <td>${poi.id}</td>
          <td>${sanitizeText(poi.name || "")}</td>
          <td>${imageUrl ? `<a target="_blank" rel="noopener noreferrer" href="${sanitizeText(imageUrl)}"><img class="poi-thumbnail" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name || "")}"></a>` : "-"}</td>
          <td>${sanitizeText(poi.description || "")}</td>
          <td>${poi.latitude ?? ""}</td>
          <td>${poi.longitude ?? ""}</td>
          <td>${poi.radius ?? 0} m</td>
          <td>${poi.classification === "minor" ? "Phụ" : "Chính"}</td>
          <td>${sanitizeText(poi.minor_category || "")}</td>
          <td>
            <button class="btn edit" data-action="edit" data-id="${poi.id}">Sửa</button>
            <button class="btn delete" data-action="delete" data-id="${poi.id}">Xóa</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function openForm(title, poi = null) {
  const panel = document.getElementById("poi-form-panel");
  panel.classList.remove("hidden");
  document.getElementById("poi-form-title").textContent = title;

  state.editingPoiId = poi?.id || null;

  document.getElementById("poi-name").value = poi?.name || "";
  document.getElementById("poi-description").value = poi?.description || "";
  document.getElementById("poi-lat").value = poi?.latitude || "";
  document.getElementById("poi-lng").value = poi?.longitude || "";
  document.getElementById("poi-radius").value = poi?.radius || "";
  document.getElementById("poi-classification").value = poi?.classification || "major";
  document.getElementById("poi-minor-category").innerHTML = getMinorCategoryOptions(poi?.minor_category || "");

  const currentImage = document.getElementById("current-image");
  const imageUrl = state.imageMap.get(poi?.id)?.image_url || "";
  currentImage.innerHTML = imageUrl
    ? `<a target="_blank" rel="noopener noreferrer" href="${sanitizeText(imageUrl)}"><img class="poi-thumbnail" src="${sanitizeText(imageUrl)}" alt="Current"></a>`
    : "-";

  const lat = Number(poi?.latitude || DEFAULT_MAP_CENTER[0]);
  const lng = Number(poi?.longitude || DEFAULT_MAP_CENTER[1]);

  if (!state.map) {
    state.map = L.map("add-map").setView([lat, lng], DEFAULT_MAP_ZOOM + 1);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(state.map);

    state.map.on("click", (event) => {
      const pickedLat = event.latlng.lat;
      const pickedLng = event.latlng.lng;
      document.getElementById("poi-lat").value = pickedLat;
      document.getElementById("poi-lng").value = pickedLng;

      if (state.marker) {
        state.marker.setLatLng([pickedLat, pickedLng]);
      } else {
        state.marker = L.marker([pickedLat, pickedLng]).addTo(state.map);
      }
    });
  } else {
    state.map.setView([lat, lng], DEFAULT_MAP_ZOOM + 1);
  }

  if (poi?.latitude && poi?.longitude) {
    if (state.marker) {
      state.marker.setLatLng([lat, lng]);
    } else {
      state.marker = L.marker([lat, lng]).addTo(state.map);
    }
  }
}

function closeForm() {
  document.getElementById("poi-form-panel").classList.add("hidden");
  document.getElementById("poi-form").reset();
  state.editingPoiId = null;
}

async function uploadImageIfNeeded(file, poiId) {
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

async function savePoi(event) {
  event.preventDefault();

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
    showToast("Vui lòng nhập đủ thông tin và chọn vị trí trên bản đồ.", "delete");
    return;
  }

  try {
    let poiId = state.editingPoiId;

    if (!poiId) {
      const { data, error } = await supabase.from(TABLES.POI).insert(payload).select("id").single();
      if (error) throw error;
      poiId = data.id;
    } else {
      const { error } = await supabase.from(TABLES.POI).update(payload).eq("id", poiId);
      if (error) throw error;
    }

    const file = document.getElementById("poi-image").files[0];
    if (file) {
      const imageUrl = await uploadImageIfNeeded(file, poiId);
      const existingImage = state.imageMap.get(poiId);

      if (existingImage?.id) {
        const { error } = await supabase.from(TABLES.IMAGE).update({ image_url: imageUrl }).eq("id", existingImage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.IMAGE).insert({ poi_id: poiId, image_url: imageUrl });
        if (error) throw error;
      }
    }

    showToast(state.editingPoiId ? "Cập nhật POI thành công" : "Thêm POI thành công", "add");
    closeForm();
    await loadPois();
  } catch (error) {
    showToast(error.message || "Không thể lưu POI", "delete");
  }
}

async function removePoi(id) {
  const yes = confirm("Xác nhận xóa POI này?");
  if (!yes) return;

  try {
    const { data: links, error: linkError } = await supabase
      .from(TABLES.TOUR_POI)
      .select("tour_id")
      .eq("poi_id", id)
      .limit(1);

    if (linkError) throw linkError;
    if (links && links.length > 0) {
      showToast("Không thể xóa POI vì nó đang được sử dụng trong tour", "delete");
      return;
    }

    const imageRow = state.imageMap.get(id);
    if (imageRow?.id) {
      await removeImageObjectIfAny(imageRow.image_url);
      const { error: imageDeleteError } = await supabase.from(TABLES.IMAGE).delete().eq("id", imageRow.id);
      if (imageDeleteError) throw imageDeleteError;
    }

    const { error } = await supabase.from(TABLES.POI).delete().eq("id", id);
    if (error) throw error;

    showToast("Xóa POI thành công", "add");
    await loadPois();
  } catch (error) {
    showToast(error.message || "Không thể xóa POI", "delete");
  }
}

async function loadPois() {
  state.pois = await getPois();
  state.imageMap = await getImagesByPoiIds(state.pois.map((item) => item.id));
  renderTable();
}

async function initPoiPage() {
  await requireAdmin();
  renderSidebar("poi");

  await loadPois();

  document.getElementById("search-poi").addEventListener("input", renderTable);
  document.getElementById("btn-open-add").addEventListener("click", () => openForm("Thêm POI"));
  document.getElementById("btn-cancel-poi").addEventListener("click", closeForm);
  document.getElementById("poi-form").addEventListener("submit", savePoi);

  document.getElementById("poi-table-body").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const id = Number(button.dataset.id);
    if (button.dataset.action === "edit") {
      const poi = state.pois.find((item) => item.id === id);
      openForm("Sửa POI", poi);
    }

    if (button.dataset.action === "delete") {
      removePoi(id);
    }
  });
}

initPoiPage();
