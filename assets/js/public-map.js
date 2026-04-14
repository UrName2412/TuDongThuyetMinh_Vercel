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
    marker.poiId = poi.id; // Gán ID vào marker để tìm kiếm sau này
    markers.push(marker);
  }

  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
  }

  // --- Xử lý POI được quét từ QR ---
  const scannedPoiId = localStorage.getItem("scannedPoiId");
  if (scannedPoiId) {
    console.log(`Found scanned POI ID: ${scannedPoiId}`);
    const poiId = parseInt(scannedPoiId, 10);
    const targetPoi = pois.find(p => p.id === poiId);
    const targetMarker = markers.find(m => m.poiId === poiId);

    if (targetPoi && targetMarker) {
      // Zoom vào marker và mở popup
      map.setView(targetMarker.getLatLng(), DEFAULT_MAP_ZOOM + 2);
      targetMarker.openPopup();
      console.log(`Focused on POI: ${targetPoi.name}`);
    } else {
      console.warn(`Scanned POI ID ${poiId} not found on the map.`);
    }

    // Xóa ID khỏi localStorage để không bị lặp lại khi tải lại trang
    localStorage.removeItem("scannedPoiId");
  }
}

initPublicMap().catch((error) => {
  console.error(error);
  alert("Khong the tai du lieu ban do tu Supabase.");
});
