import { sanitizeText } from "./admin-common.js";
import { getPoiById } from "./data-service.js";

async function initPoiScanPage() {
    const statusEl = document.getElementById("scan-status");
    const nameEl = document.getElementById("scan-poi-name");
    const mapLinkEl = document.getElementById("scan-map-link");

    const poiParam = new URLSearchParams(window.location.search).get("poi");
    const poiId = Number(poiParam);
    if (!poiParam || !Number.isInteger(poiId) || poiId <= 0) {
        statusEl.textContent = "QR khong hop le: thieu ma POI.";
        return;
    }

    const poi = await getPoiById(poiId);
    if (!poi) {
        statusEl.textContent = "POI khong ton tai hoac da bi xoa.";
        return;
    }

    nameEl.innerHTML = `<strong>${sanitizeText(poi.name || "POI")}</strong>`;
    statusEl.textContent = `Scan QR thanh cong cho ${sanitizeText(poi.name || "POI")}.`;

    const fallbackMapUrl = `${window.location.origin}/map/map.html`;
    mapLinkEl.href = poi.map_link || fallbackMapUrl;
    mapLinkEl.style.display = "inline-block";
}

initPoiScanPage().catch((error) => {
    console.error(error);
    const statusEl = document.getElementById("scan-status");
    if (statusEl) {
        statusEl.textContent = `Khong the ghi nhan luot quet: ${error.message || "Loi he thong"}`;
    }
});
