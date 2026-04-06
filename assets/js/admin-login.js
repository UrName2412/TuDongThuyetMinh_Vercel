import { supabase } from "./supabase-client.js";

const form = document.getElementById("login-form");
const submitBtn = document.getElementById("btn-login");

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
  const errorBox = document.getElementById("error-box");

  errorBox.textContent = "";
  submitBtn.disabled = true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  submitBtn.disabled = false;

  if (error) {
    errorBox.textContent = error.message || "Dang nhap that bai.";
    return;
  }

  window.location.href = "dashboard.html";
});

ensureSignedOutRender();
