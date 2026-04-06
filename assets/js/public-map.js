import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./supabase-config.js";
import { sanitizeText } from "./admin-common.js";
import { getPois, getImagesByPoiIds } from "./data-service.js";

async function initPublicMap() {
  const map = L.map("public-map").setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const pois = await getPois();
  const imageMap = await getImagesByPoiIds(pois.map((item) => item.id));
  const markers = [];

  for (const poi of pois) {
    const marker = L.marker([poi.latitude, poi.longitude]).addTo(map);
    const imageUrl = imageMap.get(poi.id)?.image_url || "";

    const popup = imageUrl
      ? `<strong>${sanitizeText(poi.name)}</strong><br><img class="poi-popup-image" src="${sanitizeText(imageUrl)}" alt="${sanitizeText(poi.name)}">`
      : `<strong>${sanitizeText(poi.name)}</strong>`;

    marker.bindPopup(popup);
    L.circle([poi.latitude, poi.longitude], {
      radius: Number(poi.radius || 0),
      color: "#ef4444",
      fillColor: "#fca5a5",
      fillOpacity: 0.2
    }).addTo(map);
    markers.push(marker);
  }

  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
  }
}

initPublicMap().catch((error) => {
  console.error(error);
  alert("Khong the tai du lieu ban do tu Supabase.");
});
