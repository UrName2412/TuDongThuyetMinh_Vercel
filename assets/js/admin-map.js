import { supabase } from "./supabase-client.js";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, TABLES } from "./supabase-config.js";
import { requireAdmin, renderSidebar, sanitizeText } from "./admin-common.js";
import { getImagesByPoiIds } from "./data-service.js";

async function initMapPage() {
  await requireAdmin();
  renderSidebar("map");

  const map = L.map("map").setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const { data, error } = await supabase
    .from(TABLES.POI)
    .select("id,name,latitude,longitude,radius")
    .order("id", { ascending: false });

  if (error) {
    alert(`Khong the tai map POI: ${error.message}`);
    return;
  }

  const markers = [];
  const imageMap = await getImagesByPoiIds((data || []).map((item) => item.id));
  for (const poi of data || []) {
    const marker = L.marker([poi.latitude, poi.longitude]).addTo(map);
    const imageUrl = imageMap.get(poi.id)?.image_url || "";
    const popup = imageUrl
      ? `<strong>${sanitizeText(poi.name)}</strong><br><img class="poi-popup-image" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name)}">`
      : `<strong>${sanitizeText(poi.name)}</strong>`;

    marker.bindPopup(popup);
    L.circle([poi.latitude, poi.longitude], {
      radius: Number(poi.radius || 0),
      color: "#e11d48",
      fillColor: "#fb7185",
      fillOpacity: 0.2,
      weight: 1.5
    }).addTo(map);
    markers.push(marker);
  }

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

initMapPage();
