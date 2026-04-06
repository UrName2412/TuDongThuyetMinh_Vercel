import { requireAdmin, renderSidebar, showToast, sanitizeText } from "./admin-common.js";
import { buildRouteEditor, loadTourDataset, saveTour } from "./admin-tour-pages.js";

async function init() {
  await requireAdmin();
  renderSidebar("tour");

  const { pois, imageMap } = await loadTourDataset();
  const poiMap = new Map(pois.map((item) => [item.id, item]));
  const selectedIds = [];

  const poiSelect = document.getElementById("poi-select");
  const list = document.getElementById("tour-poi-list");
  const map = L.map("tour-map").setView([10.762622, 106.660172], 14);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  poiSelect.innerHTML = pois.map((poi) => `<option value="${poi.id}">${sanitizeText(poi.name)}</option>`).join("");

  const editor = buildRouteEditor(list, selectedIds, poiMap, imageMap);

  document.getElementById("add-poi-btn").addEventListener("click", () => {
    for (const option of Array.from(poiSelect.selectedOptions)) {
      const id = Number(option.value);
      if (!selectedIds.includes(id)) selectedIds.push(id);
    }
    editor.render();
  });

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
      await saveTour(null, document.getElementById("tour-name").value.trim(), document.getElementById("tour-description").value.trim(), selectedIds);
      showToast("Tour đã được tạo thành công.", "add");
      setTimeout(() => {
        window.location.href = "manage_tour.html?added=1";
      }, 300);
    } catch (error) {
      showToast(error.message || "Không thể tạo tour", "delete");
    }
  });
}

init();
