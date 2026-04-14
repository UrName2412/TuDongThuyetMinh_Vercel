import { requireAdmin, renderSidebar, showToast } from "./admin-common.js";
import { createPoiFromForm, initDraggablePickerMap } from "./admin-poi-pages.js";

async function init() {
  await requireAdmin();
  renderSidebar("list");

  initDraggablePickerMap("map", "poi-lat", "poi-lng");

  document.getElementById("poi-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await createPoiFromForm();
      showToast("Thêm POI thành công", "add");
      setTimeout(() => {
        window.location.href = "list_poi.html?added=1";
      }, 300);
    } catch (error) {
      showToast(error.message || "Không thể thêm POI", "delete");
    }
  });
}

init();
