import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const APP_QR_SCAN_URL = pathToFileURL(`${REPO_ROOT}/assets/js/app-qr-scan.js`).href;

const scanner = {
  clearCallCount: 0,
  onSuccess: null,
  onFailure: null,
  clear() {
    this.clearCallCount += 1;
  },
  render(success, failure) {
    this.onSuccess = success;
    this.onFailure = failure;
  }
};

globalThis.Html5QrcodeScanner = class {
  constructor() {
    return scanner;
  }
};

function setupQrEnvironment() {
  const resultsDiv = { innerHTML: "", style: {} };
  const localStore = new Map();

  globalThis.document = {
    getElementById(id) {
      if (id === "qr-reader-results") return resultsDiv;
      return null;
    }
  };

  globalThis.localStorage = {
    getItem(key) {
      return localStore.has(key) ? localStore.get(key) : null;
    },
    setItem(key, value) {
      localStore.set(key, String(value));
    }
  };

  globalThis.window = {
    location: { href: "https://example.com/map/scan_app.html" }
  };

  scanner.clearCallCount = 0;
  return { resultsDiv, localStore };
}

setupQrEnvironment();
await import(`${APP_QR_SCAN_URL}?suite=${Date.now()}`);

test("valid scan stores POI id and redirects to map", () => {
  const { resultsDiv, localStore } = setupQrEnvironment();
  scanner.onSuccess("https://example.com/map/scan.html?poi=99", {});

  assert.equal(resultsDiv.style.color, "green");
  assert.equal(localStore.get("scannedPoiId"), "99");
  assert.equal(globalThis.window.location.href, "../map/map.html");
  assert.equal(scanner.clearCallCount, 1);
});

test("scan with missing poi param shows invalid QR message", () => {
  const { resultsDiv } = setupQrEnvironment();
  scanner.onSuccess("https://example.com/map/scan.html", {});

  assert.match(resultsDiv.innerHTML, /không hợp lệ/i);
  assert.equal(resultsDiv.style.color, "red");
  assert.equal(scanner.clearCallCount, 1);
});

test("non-URL scan payload shows parse error", () => {
  const { resultsDiv } = setupQrEnvironment();
  scanner.onSuccess("not-a-url", {});

  assert.match(resultsDiv.innerHTML, /Lỗi khi xử lý mã QR/);
  assert.equal(resultsDiv.style.color, "red");
});

test("scan failure ignores QR-not-found noise but reports real errors", () => {
  const { resultsDiv } = setupQrEnvironment();
  scanner.onFailure("QR code not found");
  assert.equal(resultsDiv.innerHTML, "");

  scanner.onFailure("Camera permission denied");
  assert.match(resultsDiv.innerHTML, /Lỗi quét: Camera permission denied/);
  assert.equal(resultsDiv.style.color, "red");
});
