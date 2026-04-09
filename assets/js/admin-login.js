import { supabase } from "./supabase-client.js";

const form = document.getElementById("login-form");
const submitBtn = document.getElementById("btn-login");

function showLoginError(message) {
  const existing = document.getElementById("toast-container");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.id = "toast-container";
  toast.className = "toast toast-error";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

async function ensureSignedOutRender() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.href = "dashboard.html";
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  submitBtn.disabled = false;

  if (error) {
    showLoginError(error.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
    return;
  }

  window.location.href = "dashboard.html";
});

ensureSignedOutRender();
