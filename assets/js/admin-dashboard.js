import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";
import { requireAdmin, renderSidebar, formatNumber, sanitizeText } from "./admin-common.js";
import { getImagesByPoiIds, getPoiVisitStats } from "./data-service.js";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function loadDashboard() {
  await requireAdmin();
  renderSidebar("dashboard");

  const poiRes = await supabase.from(TABLES.POI).select("id,name,description,latitude,longitude,radius").order("id", { ascending: false });

  if (poiRes.error) {
    alert(`Khong the tai dashboard. ${poiRes.error?.message || ""}`);
    return;
  }

  const pois = poiRes.data || [];
  const imageMap = await getImagesByPoiIds(pois.map((item) => item.id));
  const visitStats = await getPoiVisitStats(pois.map((item) => item.id));

  document.getElementById("stat-poi-total").textContent = formatNumber(pois.length);
  document.getElementById("stat-qr-total").textContent = formatNumber(visitStats.total);

  const sortedPoisByVisits = pois
    .map(poi => ({
      ...poi,
      visitCount: visitStats.countByPoiId.get(Number(poi.id)) || 0
    }))
    .sort((a, b) => b.visitCount - a.visitCount);

  const topVisitedPoiBody = document.getElementById("top-visited-poi-body");
  topVisitedPoiBody.innerHTML = sortedPoisByVisits.slice(0, 5).map((poi) => {
    return `
      <tr>
        <td>${poi.id}</td>
        <td>${sanitizeText(poi.name)}</td>
        <td>${formatNumber(poi.visitCount)}</td>
      </tr>
    `;
  }).join("");

  const poiBody = document.getElementById("recent-poi-body");
  poiBody.innerHTML = pois.slice(0, 5).map((poi) => {
    const img = imageMap.get(poi.id)?.image_url || "";
    const imageCell = img
      ? `<a class="image-link" target="_blank" rel="noopener noreferrer" href="${sanitizeText(img)}"><img class="poi-thumbnail" src="${sanitizeText(img)}" alt="${sanitizeText(poi.name)}"></a>`
      : "-";
    const visitCount = visitStats.countByPoiId.get(Number(poi.id)) || 0;
    const latestVisit = visitStats.latestByPoiId.get(Number(poi.id));

    return `
      <tr>
        <td>${poi.id}</td>
        <td>${sanitizeText(poi.name)}</td>
        <td>${sanitizeText(poi.description || "")}</td>
        <td>${imageCell}</td>
        <td>${formatNumber(visitCount)}</td>
        <td>${sanitizeText(formatDateTime(latestVisit))}</td>
        <td>${poi.latitude}</td>
        <td>${poi.longitude}</td>
        <td>${poi.radius} m</td>
      </tr>
    `;
  }).join("");
}

supabase
  .channel('poi_visits')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLES.POI_VISIT }, loadDashboard)
  .subscribe();

loadDashboard();
