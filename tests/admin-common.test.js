import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const ADMIN_COMMON_URL = pathToFileURL(`${REPO_ROOT}/assets/js/admin-common.js`).href;

const authState = {
  sessionResult: { data: { session: null }, error: null },
  signOutCalled: false
};

globalThis.__TEST_SUPABASE_CLIENT__ = {
  auth: {
    getSession: async () => authState.sessionResult,
    signOut: async () => {
      authState.signOutCalled = true;
    }
  }
};

const { parseQuery, formatNumber, safeGetValue, safeSetValue, requireAdmin, renderSidebar, showToast, sanitizeText } = await import(
  `${ADMIN_COMMON_URL}?suite=${Date.now()}`
);

function setupBasicDom() {
  const elements = new Map();
  globalThis.document = {
    body: { appendChild() {} },
    getElementById(id) {
      return elements.get(id) || null;
    }
  };
  globalThis.window = {
    location: {
      href: "https://example.com/admin/login.html",
      search: ""
    }
  };
  return elements;
}

test("parseQuery converts search params into an object", () => {
  setupBasicDom();
  globalThis.window.location.search = "?id=10&mode=edit";
  assert.deepEqual(parseQuery(), { id: "10", mode: "edit" });
});

test("formatNumber formats numeric values for vi-VN locale", () => {
  setupBasicDom();
  assert.equal(formatNumber(12000), "12.000");
});

test("safeGetValue and safeSetValue read/write existing input values safely", () => {
  const elements = setupBasicDom();
  elements.set("poi-name", { value: "  Bun Bo  " });

  assert.equal(safeGetValue("poi-name"), "Bun Bo");
  safeSetValue("poi-name", "Pho");
  assert.equal(elements.get("poi-name").value, "Pho");
  assert.equal(safeGetValue("missing"), "");
});

test("requireAdmin returns current user when session exists", async () => {
  setupBasicDom();
  authState.sessionResult = {
    data: { session: { user: { email: "admin@example.com" } } },
    error: null
  };

  const user = await requireAdmin();
  assert.equal(user.email, "admin@example.com");
});

test("requireAdmin redirects and throws when session is missing", async () => {
  setupBasicDom();
  authState.sessionResult = { data: { session: null }, error: null };

  await assert.rejects(() => requireAdmin(), /Unauthorized/);
  assert.equal(globalThis.window.location.href, "login.html");
});

test("renderSidebar marks active link and signs out on logout click", async () => {
  const elements = setupBasicDom();
  const sidebar = { innerHTML: "" };
  let clickHandler = null;
  elements.set("admin-sidebar", sidebar);
  elements.set("btn-logout", {
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    }
  });
  authState.signOutCalled = false;

  renderSidebar("map");

  assert.match(sidebar.innerHTML, /class="active" href="map_poi\.html"/);
  await clickHandler({ preventDefault() {} });
  assert.equal(authState.signOutCalled, true);
  assert.equal(globalThis.window.location.href, "login.html");
});

test("showToast appends styled toast and removes it after timeout", () => {
  const elements = setupBasicDom();
  const appended = [];
  const toast = {
    className: "",
    textContent: "",
    style: {},
    removed: false,
    remove() {
      this.removed = true;
    }
  };

  globalThis.document = {
    ...globalThis.document,
    createElement() {
      return toast;
    },
    body: {
      appendChild(node) {
        appended.push(node);
      }
    },
    getElementById(id) {
      return elements.get(id) || null;
    }
  };

  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 0;
  };

  showToast("Added", "add");

  assert.equal(appended.length, 1);
  assert.equal(toast.className, "toast toast-success");
  assert.equal(toast.removed, true);

  globalThis.setTimeout = originalSetTimeout;
});

test("sanitizeText transforms special characters", () => {
  assert.equal(sanitizeText(`A&B<>'"\\`), `A&amp;B&lt;&gt;&#39;&quot;&#92;`);
});
