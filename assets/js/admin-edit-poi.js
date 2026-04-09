import { requireAdmin, renderSidebar, showToast, sanitizeText } from "./admin-common.js";
import { initPickerMap, loadPoiDataset, updatePoiFromForm } from "./admin-poi-pages.js";

async function init() {
  await requireAdmin();
  renderSidebar("list");

  const id = Number(new URLSearchParams(window.location.search).get("id") || "0");
  if (!id) {
    window.location.href = "list_poi.html";
    return;
  }

  const { pois, imageMap } = await loadPoiDataset();
  const poi = pois.find((item) => Number(item.id) === id);
  const imageRow = imageMap.get(id);

  if (!poi) {
    window.location.href = "list_poi.html";
    return;
  }

  document.getElementById("poi-name").value = poi.name || "";
  document.getElementById("poi-description").value = poi.description || "";
  document.getElementById("poi-lat").value = poi.latitude || "";
  document.getElementById("poi-lng").value = poi.longitude || "";
  document.getElementById("poi-radius").value = poi.radius || "";

  document.getElementById("current-image").innerHTML = imageRow?.image_url
    ? `<img class="poi-thumbnail" src="${sanitizeText(imageRow.image_url)}" alt="Ảnh POI">`
    : "Chưa có ảnh.";

  initPickerMap("map", "poi-lat", "poi-lng", poi.latitude, poi.longitude);

  document.getElementById("poi-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updatePoiFromForm(id, imageRow);
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
