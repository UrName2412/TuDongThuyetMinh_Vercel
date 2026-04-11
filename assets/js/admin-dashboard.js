import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";
import { requireAdmin, renderSidebar, formatNumber, sanitizeText } from "./admin-common.js";
import { getImagesByPoiIds } from "./data-service.js";

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

  document.getElementById("stat-poi-total").textContent = formatNumber(pois.length);
  document.getElementById("stat-poi-latest").textContent = pois[0]?.name || "N/A";
  document.getElementById("stat-radius-max").textContent = `${formatNumber(Math.max(0, ...pois.map((p) => Number(p.radius || 0))))} m`;

  const poiBody = document.getElementById("recent-poi-body");
  poiBody.innerHTML = pois.slice(0, 5).map((poi) => {
    const img = imageMap.get(poi.id)?.image_url || "";
    const imageCell = img
      ? `<a class="image-link" target="_blank" rel="noopener noreferrer" href="${sanitizeText(img)}"><img class="poi-thumbnail" src="${sanitizeText(img)}" alt="${sanitizeText(poi.name)}"></a>`
      : "-";

    return `
      <tr>
        <td>${poi.id}</td>
        <td>${sanitizeText(poi.name)}</td>
        <td>${sanitizeText(poi.description || "")}</td>
        <td>${imageCell}</td>
        <td>${poi.latitude}</td>
        <td>${poi.longitude}</td>
        <td>${poi.radius} m</td>
      </tr>
    `;
  }).join("");
}

loadDashboard();
