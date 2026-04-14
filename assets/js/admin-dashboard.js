import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";
import { requireAdmin, renderSidebar, formatNumber, sanitizeText } from "./admin-common.js";

function getPoiVisitValue(poi) {
  const field = Object.keys(poi).find((key) => key.toLowerCase() === "poivisit");
  return Number((field && poi[field]) || 0);
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
  document.getElementById("stat-poi-total").textContent = formatNumber(pois.length);
  const totalQrVisits = pois.reduce((sum, poi) => sum + getPoiVisitValue(poi), 0);
  document.getElementById("stat-qr-total").textContent = formatNumber(totalQrVisits);

  const sortedPoisByVisits = pois
    .map(poi => ({
      ...poi,
      visitCount: getPoiVisitValue(poi)
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
}

supabase
  .channel('poi_visits')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLES.POI }, loadDashboard)
  .subscribe();

loadDashboard();
