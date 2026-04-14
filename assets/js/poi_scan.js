import { sanitizeText } from "./admin-common.js";
import { getPoiById, recordPoiVisit } from "./data-service.js";

async function initPoiScanPage() {
    const statusEl = document.getElementById("scan-status");
    const nameEl = document.getElementById("scan-poi-name");
    const mapLinkEl = document.getElementById("scan-map-link");

    const poiId = Number(new URLSearchParams(window.location.search).get("poi") || "0");
    if (!poiId) {
        statusEl.textContent = "QR khong hop le: thieu ma POI.";
        return;
    }

    const poi = await getPoiById(poiId);
    if (!poi) {
        statusEl.textContent = "POI khong ton tai hoac da bi xoa.";
        return;
    }

    nameEl.innerHTML = `<strong>${sanitizeText(poi.name || "POI")}</strong>`;
    await recordPoiVisit(poiId, "qr_web");
    statusEl.textContent = `Da ghi nhan luot truy cap QR cho ${sanitizeText(poi.name || "POI")}.`;

    if (poi.map_link) {
        mapLinkEl.href = poi.map_link;
        mapLinkEl.style.display = "inline-block";
    }
}

initPoiScanPage().catch((error) => {
    console.error(error);
    const statusEl = document.getElementById("scan-status");
    if (statusEl) {
        statusEl.textContent = `Khong the ghi nhan luot quet: ${error.message || "Loi he thong"}`;
    }
});
