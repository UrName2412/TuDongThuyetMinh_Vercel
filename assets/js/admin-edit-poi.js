import { requireAdmin, renderSidebar, showToast, sanitizeText, safeSetValue } from "./admin-common.js";
import { initPickerMap, loadPoiDataset, updatePoiFromForm } from "./admin-poi-pages.js";

async function init() {
  await requireAdmin();
  renderSidebar("list");

  const id = Number(new URLSearchParams(window.location.search).get("id") || "0");
  if (!id) {
    window.location.href = "list_poi.html";
    return;
  }

  const { pois, imageMap, imageRowsMap } = await loadPoiDataset();
  const poi = pois.find((item) => Number(item.id) === id);
  const imageRow = imageMap.get(id);
  const imageRows = imageRowsMap.get(id) || [];

  if (!poi) {
    window.location.href = "list_poi.html";
    return;
  }

  safeSetValue("poi-name", poi.name);
  safeSetValue("poi-description", poi.description);
  safeSetValue("poi-lat", poi.latitude);
  safeSetValue("poi-lng", poi.longitude);
  safeSetValue("poi-radius", poi.radius);

  document.getElementById("current-image").innerHTML = imageRows.length > 0
    ? imageRows
        .map((row) => `<a class="image-link" target="_blank" rel="noopener noreferrer" href="${sanitizeText(row.image_url || "")}"><img class="poi-thumbnail" src="${sanitizeText(row.image_url || "")}" alt="Ảnh POI"></a>`)
        .join(" ")
    : (imageRow?.image_url ? `<img class="poi-thumbnail" src="${sanitizeText(imageRow.image_url)}" alt="Ảnh POI">` : "Chưa có ảnh.");

  // Đảm bảo DOM ready cho map
  await new Promise(resolve => {
    if (document.getElementById('map')) {
      resolve();
    } else {
      window.addEventListener('DOMContentLoaded', resolve);
    }
  });

  initPickerMap("map", "poi-lat", "poi-lng", poi.latitude, poi.longitude);

  document.getElementById("poi-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updatePoiFromForm(id);
      showToast("Cập nhật POI thành công", "add");
      setTimeout(() => {
        window.location.href = "list_poi.html?updated=1";
      }, 300);
    } catch (error) {
      showToast(error.message || "Không thể cập nhật POI", "delete");
    }
  });
}

init();
