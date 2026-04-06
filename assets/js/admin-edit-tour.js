import { requireAdmin, renderSidebar, showToast, sanitizeText } from "./admin-common.js";
import { buildRouteEditor, loadTourDataset, saveTour } from "./admin-tour-pages.js";

async function init() {
  await requireAdmin();
  renderSidebar("tour");

  const tourId = Number(new URLSearchParams(window.location.search).get("id") || "0");
  if (!tourId) {
    window.location.href = "manage_tour.html";
    return;
  }

  const { pois, tours, imageMap, tourPoiRows } = await loadTourDataset();
  const tour = tours.find((item) => Number(item.id) === tourId);

  if (!tour) {
    window.location.href = "manage_tour.html";
    return;
  }

  const poiMap = new Map(pois.map((item) => [item.id, item]));
  const selectedIds = tourPoiRows
    .filter((row) => Number(row.tour_id) === tourId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((row) => Number(row.poi_id));

  document.getElementById("tour-name").value = tour.name || "";
  document.getElementById("tour-description").value = tour.description || "";

  const list = document.getElementById("tour-poi-list");
  const editor = buildRouteEditor(list, selectedIds, poiMap, imageMap);
  editor.render();

  const poiSelect = document.getElementById("poi-select");
  poiSelect.innerHTML = `<option value="">-- Chọn POI --</option>${pois.map((poi) => `<option value="${poi.id}">${sanitizeText(poi.name)}</option>`).join("")}`;

  document.getElementById("add-poi-btn").addEventListener("click", () => {
    const id = Number(poiSelect.value);
    if (!id || selectedIds.includes(id)) return;
    selectedIds.push(id);
    editor.render();
  });

  const map = L.map("tour-map").setView([10.762622, 106.660172], 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  for (const poi of pois) {
    const marker = L.marker([poi.latitude, poi.longitude]).addTo(map);
    marker.bindPopup(`<strong>${sanitizeText(poi.name)}</strong><br><em>Click để thêm vào tour</em>`);
    marker.on("click", () => {
      if (!selectedIds.includes(poi.id)) selectedIds.push(poi.id);
      editor.render();
    });
  }

  document.getElementById("tour-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await saveTour(tourId, document.getElementById("tour-name").value.trim(), document.getElementById("tour-description").value.trim(), selectedIds);
      showToast("Tour đã được cập nhật.", "add");
      setTimeout(() => {
        window.location.href = "manage_tour.html?updated=1";
      }, 300);
    } catch (error) {
      showToast(error.message || "Không thể cập nhật tour", "delete");
    }
  });
}

init();
