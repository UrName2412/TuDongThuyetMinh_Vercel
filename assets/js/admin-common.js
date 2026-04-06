import { supabase } from "./supabase-client.js";
import { ADMIN_EMAIL_WHITELIST } from "./supabase-config.js";

export function renderSidebar(activePage) {
  const nav = document.getElementById("admin-sidebar");
  if (!nav) return;

  const links = [
    { key: "dashboard", label: "Dashboard", href: "dashboard.html" },
    { key: "poi", label: "Danh sách POI", href: "poi.html" },
    { key: "map", label: "Map POI", href: "map_poi.html" },
    { key: "tour", label: "Quản lý Tours", href: "tour.html" }
  ];

  nav.innerHTML = `
    <a href="poi.html"><h2>🍜 FoodGuide</h2></a>
    ${links
      .map(
        (item) =>
          `<a class="${activePage === item.key ? "active" : ""}" href="${item.href}">${item.label}</a>`
      )
      .join("")}
    <hr style="margin: 1rem 0; border-color: rgba(255,255,255,0.2);">
    <a id="btn-logout" href="#">Đăng xuất</a>
  `;

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }
}

export function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 2200);
}

export async function requireAdmin() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.href = "login.html";
    throw new Error("Unauthorized");
  }

  if (ADMIN_EMAIL_WHITELIST.length > 0) {
    const email = (data.user.email || "").toLowerCase();
    const isAllowed = ADMIN_EMAIL_WHITELIST.map((item) => item.toLowerCase()).includes(email);
    if (!isAllowed) {
      await supabase.auth.signOut();
      alert("Tai khoan nay khong co quyen admin.");
      window.location.href = "login.html";
      throw new Error("Forbidden");
    }
  }

  return data.user;
}

export function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params.entries());
}

export function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

export function sanitizeText(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (ch) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '\"': "&quot;",
      "'": "&#39;"
    };
    return map[ch];
  });
}
