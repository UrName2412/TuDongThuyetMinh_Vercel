import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";
import { sanitizeText } from "./admin-common.js";
import { getImagesByPoiIds, getPois, getTourPoiRows, getTours } from "./data-service.js";

export async function loadTourDataset() {
  const [pois, tours] = await Promise.all([getPois(), getTours()]);
  const [imageMap, tourPoiRows] = await Promise.all([
    getImagesByPoiIds(pois.map((item) => item.id)),
    getTourPoiRows(tours.map((item) => item.id))
  ]);

  return { pois, tours, imageMap, tourPoiRows };
}

export function renderManageTourRows(tours) {
  return tours.map((tour) => `
    <tr>
      <td>${tour.id}</td>
      <td>${sanitizeText(tour.name || "")}</td>
      <td>${sanitizeText(tour.description || "")}</td>
      <td>
        <a class="btn edit" href="edit_tour.html?id=${tour.id}">Sửa</a>
        <button class="btn delete" data-delete-id="${tour.id}">Xóa</button>
      </td>
    </tr>
  `).join("");
}

export async function deleteTour(tourId) {
  const { error: relError } = await supabase.from(TABLES.TOUR_POI).delete().eq("tour_id", tourId);
  if (relError) throw relError;

  const { error } = await supabase.from(TABLES.TOUR).delete().eq("id", tourId);
  if (error) throw error;
}

export function buildRouteEditor(listElement, selectedIds, poiMap, imageMap) {
  const render = () => {
    listElement.innerHTML = selectedIds.map((id) => {
      const poi = poiMap.get(id);
      if (!poi) return "";
      const imageUrl = imageMap.get(id)?.image_url || "";
      return `
        <li data-id="${id}">
          <span>
            ${imageUrl ? `<img class="tour-poi-thumbnail" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name)}">` : ""}
            ${sanitizeText(poi.name)}
          </span>
          <span class="actions">
            <button type="button" data-action="up">↑</button>
            <button type="button" data-action="down">↓</button>
            <button type="button" data-action="remove">×</button>
            <input type="hidden" name="poi_ids[]" value="${id}">
          </span>
        </li>
      `;
    }).join("");
  };

  listElement.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const li = event.target.closest("li[data-id]");
    if (!li) return;

    const id = Number(li.dataset.id);
    const index = selectedIds.findIndex((value) => value === id);
    if (index < 0) return;

    if (button.dataset.action === "remove") {
      selectedIds.splice(index, 1);
      render();
      return;
    }

    if (button.dataset.action === "up" && index > 0) {
      [selectedIds[index - 1], selectedIds[index]] = [selectedIds[index], selectedIds[index - 1]];
      render();
      return;
    }

    if (button.dataset.action === "down" && index < selectedIds.length - 1) {
      [selectedIds[index + 1], selectedIds[index]] = [selectedIds[index], selectedIds[index + 1]];
      render();
    }
  });

  return { render };
}

export async function saveTour(tourId, name, description, selectedPoiIds) {
  if (!name || selectedPoiIds.length < 2) {
    throw new Error("Tên tour và ít nhất 2 POI là bắt buộc.");
  }

  let effectiveTourId = tourId;
  if (!effectiveTourId) {
    const { data, error } = await supabase.from(TABLES.TOUR).insert({ name, description }).select("id").single();
    if (error) throw error;
    effectiveTourId = data.id;
  } else {
    const { error } = await supabase.from(TABLES.TOUR).update({ name, description }).eq("id", effectiveTourId);
    if (error) throw error;

    const { error: clearError } = await supabase.from(TABLES.TOUR_POI).delete().eq("tour_id", effectiveTourId);
    if (clearError) throw clearError;
  }

  const rows = selectedPoiIds.map((poiId, index) => ({
    tour_id: effectiveTourId,
    poi_id: poiId,
    order: index + 1
  }));

  const { error: rowError } = await supabase.from(TABLES.TOUR_POI).insert(rows);
  if (rowError) throw rowError;
  return effectiveTourId;
}
