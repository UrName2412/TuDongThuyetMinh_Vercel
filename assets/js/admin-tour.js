import { supabase } from "./supabase-client.js";
import { TABLES, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./supabase-config.js";
import { requireAdmin, renderSidebar, showToast, sanitizeText } from "./admin-common.js";
import { getPois, getImagesByPoiIds, getTours, getTourPoiRows } from "./data-service.js";

const state = {
  pois: [],
  imageMap: new Map(),
  tours: [],
  tourPoiRows: [],
  editingTourId: null,
  selectedPoiIds: [],
  map: null,
  baseMarkers: [],
  selectedCircles: []
};

function getPoiMap() {
  const map = new Map();
  for (const poi of state.pois) map.set(poi.id, poi);
  return map;
}

function renderTourList() {
  const body = document.getElementById("tour-table-body");
  const poiMap = getPoiMap();

  body.innerHTML = state.tours
    .map((tour) => {
      const route = state.tourPoiRows
        .filter((row) => row.tour_id === tour.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((row) => poiMap.get(row.poi_id)?.name)
        .filter(Boolean)
        .join(" -> ");

      return `
        <tr>
          <td>${tour.id}</td>
          <td>${sanitizeText(tour.name || "")}</td>
          <td>${sanitizeText(tour.description || "")}</td>
          <td>${sanitizeText(route || "-")}</td>
          <td>
            <button class="btn edit" data-action="edit" data-id="${tour.id}">Sửa</button>
            <button class="btn delete" data-action="delete" data-id="${tour.id}">Xóa</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSelectedPoiList() {
  const poiMap = getPoiMap();
  const list = document.getElementById("tour-poi-list");

  list.innerHTML = state.selectedPoiIds
    .map((id, index) => {
      const poi = poiMap.get(id);
      if (!poi) return "";
      const imageUrl = state.imageMap.get(poi.id)?.image_url || "";
      return `
        <li data-id="${id}">
          <span>
            ${imageUrl ? `<img class="tour-poi-thumbnail" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name)}">` : ""}
            ${index + 1}. ${sanitizeText(poi.name)}
          </span>
          <span class="actions">
            <button type="button" data-action="up">↑</button>
            <button type="button" data-action="down">↓</button>
            <button type="button" data-action="remove">x</button>
            <input type="hidden" name="poi_ids[]" value="${id}">
          </span>
        </li>
      `;
    })
    .join("");

  refreshSelectedOnMap();
}

function refreshSelectedOnMap() {
  state.selectedCircles.forEach((layer) => state.map.removeLayer(layer));
  state.selectedCircles = [];

  const poiMap = getPoiMap();

  for (const id of state.selectedPoiIds) {
    const poi = poiMap.get(id);
    if (!poi) continue;

    const circle = L.circle([poi.latitude, poi.longitude], {
      radius: 40,
      color: "#2563eb",
      fillColor: "#93c5fd",
      fillOpacity: 0.35,
      weight: 2
    }).addTo(state.map);

    state.selectedCircles.push(circle);
  }
}

function addPoiToTour(id) {
  const poiId = Number(id);
  if (!poiId || state.selectedPoiIds.includes(poiId)) return;
  state.selectedPoiIds.push(poiId);
  renderSelectedPoiList();
}

function openTourForm(title, tour = null) {
  document.getElementById("tour-form-panel").classList.remove("hidden");
  document.getElementById("tour-form-title").textContent = title;

  state.editingTourId = tour?.id || null;
  safeSetValue("tour-name", tour?.name);
  safeSetValue("tour-description", tour?.description);

  if (!tour) {
    state.selectedPoiIds = [];
  } else {
    state.selectedPoiIds = state.tourPoiRows
      .filter((row) => row.tour_id === tour.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((row) => row.poi_id);
  }

  renderSelectedPoiList();
}

function closeTourForm() {
  document.getElementById("tour-form-panel").classList.add("hidden");
  document.getElementById("tour-form").reset();
  state.editingTourId = null;
  state.selectedPoiIds = [];
  renderSelectedPoiList();
}

async function saveTour(event) {
  event.preventDefault();

  const name = safeGetValue("tour-name");
  const description = safeGetValue("tour-description");

  if (!name || state.selectedPoiIds.length < 2) {
    showToast("Tên tour và ít nhất 2 POI là bắt buộc.", "delete");
    return;
  }

  try {
    let tourId = state.editingTourId;

    if (!tourId) {
      const { data, error } = await supabase.from(TABLES.TOUR).insert({ name, description }).select("id").single();
      if (error) throw error;
      tourId = data.id;
    } else {
      const { error } = await supabase.from(TABLES.TOUR).update({ name, description }).eq("id", tourId);
      if (error) throw error;

      const { error: clearError } = await supabase.from(TABLES.TOUR_POI).delete().eq("tour_id", tourId);
      if (clearError) throw clearError;
    }

    const rows = state.selectedPoiIds.map((poiId, index) => ({
      tour_id: tourId,
      poi_id: poiId,
      order: index + 1
    }));

    const { error: rowError } = await supabase.from(TABLES.TOUR_POI).insert(rows);
    if (rowError) throw rowError;

    showToast(state.editingTourId ? "Cập nhật tour thành công" : "Tạo tour thành công", "add");
    closeTourForm();
    await loadTourData();
  } catch (error) {
    showToast(error.message || "Không thể lưu tour", "delete");
  }
}

async function removeTour(tourId) {
  if (!confirm("Xác nhận xóa tour này?")) return;

  try {
    const { error: relError } = await supabase.from(TABLES.TOUR_POI).delete().eq("tour_id", tourId);
    if (relError) throw relError;

    const { error } = await supabase.from(TABLES.TOUR).delete().eq("id", tourId);
    if (error) throw error;

    showToast("Xóa tour thành công", "add");
    await loadTourData();
  } catch (error) {
    showToast(error.message || "Không thể xóa tour", "delete");
  }
}

async function loadTourData() {
  state.tours = await getTours();
  state.tourPoiRows = await getTourPoiRows(state.tours.map((item) => item.id));
  renderTourList();
}

function initMapPicker() {
  state.map = L.map("tour-map").setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(state.map);

  for (const poi of state.pois) {
    const marker = L.marker([poi.latitude, poi.longitude]).addTo(state.map);
    const imageUrl = state.imageMap.get(poi.id)?.image_url || "";

    let popup = `<strong>${sanitizeText(poi.name)}</strong><br><em>Click de them vao tour</em>`;
    if (imageUrl) {
      popup = `<strong>${sanitizeText(poi.name)}</strong><br><img class="poi-popup-image" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name)}"><br><em>Click de them vao tour</em>`;
    }

    marker.bindPopup(popup);
    marker.on("click", () => addPoiToTour(poi.id));
    state.baseMarkers.push(marker);
  }

  if (state.baseMarkers.length > 0) {
    const group = L.featureGroup(state.baseMarkers);
    state.map.fitBounds(group.getBounds().pad(0.2));
  }
}

function bindEvents() {
  document.getElementById("btn-open-add-tour").addEventListener("click", () => openTourForm("Tạo Tour"));
  document.getElementById("btn-cancel-tour").addEventListener("click", closeTourForm);
  document.getElementById("tour-form").addEventListener("submit", saveTour);

  document.getElementById("tour-table-body").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    const id = Number(button.dataset.id);

    if (button.dataset.action === "edit") {
      const tour = state.tours.find((item) => item.id === id);
      openTourForm("Chỉnh sửa Tour", tour);
    }

    if (button.dataset.action === "delete") {
      removeTour(id);
    }
  });

  document.getElementById("tour-poi-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const li = event.target.closest("li[data-id]");
    if (!li) return;

    const poiId = Number(li.dataset.id);
    const index = state.selectedPoiIds.findIndex((id) => id === poiId);
    if (index < 0) return;

    if (button.dataset.action === "remove") {
      state.selectedPoiIds.splice(index, 1);
      renderSelectedPoiList();
      return;
    }

    if (button.dataset.action === "up" && index > 0) {
      [state.selectedPoiIds[index - 1], state.selectedPoiIds[index]] = [state.selectedPoiIds[index], state.selectedPoiIds[index - 1]];
      renderSelectedPoiList();
      return;
    }

    if (button.dataset.action === "down" && index < state.selectedPoiIds.length - 1) {
      [state.selectedPoiIds[index + 1], state.selectedPoiIds[index]] = [state.selectedPoiIds[index], state.selectedPoiIds[index + 1]];
      renderSelectedPoiList();
    }
  });

  document.getElementById("add-poi-btn").addEventListener("click", () => {
    const value = Number(safeGetValue("poi-select"));
    addPoiToTour(value);
  });
}

async function initTourPage() {
  await requireAdmin();
  renderSidebar("tour");

  state.pois = await getPois();
  state.imageMap = await getImagesByPoiIds(state.pois.map((item) => item.id));

  document.getElementById("poi-select").innerHTML = `
    <option value="">-- Chọn POI --</option>
    ${state.pois.map((poi) => `<option value="${poi.id}">${sanitizeText(poi.name)}</option>`).join("")}
  `;

  initMapPicker();
  bindEvents();
  await loadTourData();
}

initTourPage();
