import { requireAdmin, renderSidebar, showToast } from "./admin-common.js";
import { deleteTour, loadTourDataset, renderManageTourRows } from "./admin-tour-pages.js";

async function init() {
  await requireAdmin();
  renderSidebar("tour");

  let { tours } = await loadTourDataset();

  const table = document.getElementById("tour-table");
  const emptyState = document.getElementById("empty-state");
  const body = document.getElementById("tour-table-body");

  const render = () => {
    emptyState.style.display = tours.length === 0 ? "block" : "none";
    table.style.display = tours.length === 0 ? "none" : "table";
    body.innerHTML = renderManageTourRows(tours);
  };

  body.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-delete-id]");
    if (!btn) return;

    if (!confirm("Xóa tour này?")) return;

    try {
      await deleteTour(Number(btn.dataset.deleteId));
      tours = tours.filter((item) => Number(item.id) !== Number(btn.dataset.deleteId));
      showToast("Tour đã được xóa.", "add");
      render();
    } catch (error) {
      showToast(error.message || "Không thể xóa tour", "delete");
    }
  });

  render();
}

init();
