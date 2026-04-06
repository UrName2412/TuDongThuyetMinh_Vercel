import { requireAdmin, renderSidebar, showToast } from "./admin-common.js";
import { loadPoiDataset, renderPoiRows, deletePoi } from "./admin-poi-pages.js";

const PAGE_SIZE = 5;

async function init() {
  await requireAdmin();
  renderSidebar("list");

  let { pois, imageMap } = await loadPoiDataset();
  let currentPage = Number(new URLSearchParams(window.location.search).get("page") || 1);

  const searchInput = document.getElementById("search-poi");
  const table = document.getElementById("poi-table");
  const emptyState = document.getElementById("empty-state");
  const body = document.getElementById("poi-table-body");
  const pagination = document.getElementById("pagination");

  const render = () => {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = pois.filter((poi) => poi.name?.toLowerCase().includes(query));

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);

    emptyState.style.display = filtered.length === 0 ? "block" : "none";
    table.style.display = filtered.length === 0 ? "none" : "table";

    body.innerHTML = renderPoiRows(pageRows, imageMap);

    pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map((i) => `<a href="#" data-page="${i}" class="${i === currentPage ? "active-page" : ""}">${i}</a>`)
      .join("");
  };

  searchInput.addEventListener("input", () => {
    currentPage = 1;
    render();
  });

  pagination.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[data-page]");
    if (!anchor) return;
    event.preventDefault();
    currentPage = Number(anchor.dataset.page);
    render();
  });

  body.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-delete-id]");
    if (!btn) return;
    const id = Number(btn.dataset.deleteId);

    if (!confirm("Xác nhận xóa POI này?")) return;

    try {
      const ok = await deletePoi(id, imageMap);
      if (!ok) return;
      showToast("Xóa POI thành công", "add");
      ({ pois, imageMap } = await loadPoiDataset());
      render();
    } catch (error) {
      showToast(error.message || "Không thể xóa POI", "delete");
    }
  });

  render();
}

init();
