import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const DATA_SERVICE_URL = pathToFileURL(`${REPO_ROOT}/assets/js/data-service.js`).href;

function createSupabaseMock() {
  const calls = [];
  const control = {
    resolver: () => ({ data: null, error: null })
  };

  const supabase = {
    from(table) {
      const state = { table };
      const builder = {
        select(value) {
          state.select = value;
          return builder;
        },
        order(field, options) {
          state.order = { field, options };
          return finalize("order");
        },
        in(field, values) {
          state.in = { field, values };
          return builder;
        },
        eq(field, value) {
          state.eq ||= [];
          state.eq.push({ field, value });
          return builder;
        },
        update(payload) {
          state.update = payload;
          return builder;
        },
        maybeSingle() {
          return finalize("maybeSingle");
        }
      };

      function finalize(kind) {
        const snapshot = {
          kind,
          table: state.table,
          select: state.select,
          order: state.order,
          in: state.in,
          eq: state.eq,
          update: state.update
        };
        calls.push(snapshot);
        return Promise.resolve(control.resolver(snapshot) || { data: null, error: null });
      }

      return builder;
    }
  };

  return { supabase, calls, control };
}

const mock = createSupabaseMock();
globalThis.__TEST_SUPABASE_CLIENT__ = mock.supabase;

const {
  getImagesByPoiIds,
  getImageRowsByPoiIds,
  recordPoiVisit,
  getPoiVisitStats
} = await import(`${DATA_SERVICE_URL}?suite=${Date.now()}`);

test("getImagesByPoiIds returns empty map and skips queries for empty input", async () => {
  mock.calls.length = 0;
  const map = await getImagesByPoiIds([]);
  assert.equal(map.size, 0);
  assert.equal(mock.calls.length, 0);
});

test("getImagesByPoiIds keeps first image row for each POI", async () => {
  mock.calls.length = 0;
  mock.control.resolver = () => ({
    data: [
      { id: 1, poi_id: 10, image_url: "first-10" },
      { id: 2, poi_id: 10, image_url: "second-10" },
      { id: 3, poi_id: 11, image_url: "first-11" }
    ],
    error: null
  });

  const map = await getImagesByPoiIds([10, 11]);
  assert.equal(map.get(10).image_url, "first-10");
  assert.equal(map.get(11).image_url, "first-11");
});

test("getImageRowsByPoiIds groups all image rows by POI ID", async () => {
  mock.calls.length = 0;
  mock.control.resolver = () => ({
    data: [
      { id: 1, poi_id: 5, image_url: "a" },
      { id: 2, poi_id: 5, image_url: "b" },
      { id: 3, poi_id: 6, image_url: "c" }
    ],
    error: null
  });

  const map = await getImageRowsByPoiIds([5, 6]);
  assert.deepEqual(
    map.get(5).map((item) => item.image_url),
    ["a", "b"]
  );
  assert.deepEqual(
    map.get(6).map((item) => item.image_url),
    ["c"]
  );
});

test("recordPoiVisit rejects invalid POI id before querying", async () => {
  mock.calls.length = 0;
  await assert.rejects(() => recordPoiVisit("abc"), /POI ID khong hop le/);
  assert.equal(mock.calls.length, 0);
});

test("recordPoiVisit increments visit counter using detected PoiVisit field", async () => {
  mock.calls.length = 0;
  mock.control.resolver = (call) => {
    if (call.kind === "maybeSingle" && call.update) {
      return { data: { id: 3, PoiVisit: 8 }, error: null };
    }
    if (call.kind === "maybeSingle") {
      return { data: { id: 3, PoiVisit: 7 }, error: null };
    }
    return { data: null, error: null };
  };

  await recordPoiVisit(3);
  const updateCall = mock.calls.find((item) => item.kind === "maybeSingle" && item.update);
  assert.deepEqual(updateCall.update, { PoiVisit: 8 });
});

test("recordPoiVisit throws when POI does not exist", async () => {
  mock.calls.length = 0;
  mock.control.resolver = () => ({ data: null, error: null });
  await assert.rejects(() => recordPoiVisit(999), /POI khong ton tai/);
});

test("getPoiVisitStats returns aggregated totals", async () => {
  mock.calls.length = 0;
  mock.control.resolver = () => ({
    data: [
      { id: 1, PoiVisit: 2 },
      { id: 2, PoiVisit: 5 }
    ],
    error: null
  });

  const stats = await getPoiVisitStats([1, 2]);
  assert.equal(stats.total, 7);
  assert.equal(stats.countByPoiId.get(1), 2);
  assert.equal(stats.countByPoiId.get(2), 5);
  assert.equal(stats.latestByPoiId.size, 0);
});
