import { afterEach, describe, expect, it, vi } from "vitest";
import { clearOverride, loadOverride, saveOverride } from "./app-shortcuts-storage";
import type { HomeAssistant } from "custom-card-helpers";
import type { AppShortcut } from "../types";

const KEY = "shield-remote-card.apps.remote.shield";

function fakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

// A minimal in-memory stand-in for HA's frontend/get_user_data and
// frontend/set_user_data websocket commands.
function fakeHass(): HomeAssistant {
  const store = new Map<string, { data: unknown } | null>();
  const callWS = vi.fn(async (msg: Record<string, unknown>) => {
    const key = msg.key as string;
    if (msg.type === "frontend/get_user_data") {
      return { value: store.has(key) ? store.get(key) : null };
    }
    if (msg.type === "frontend/set_user_data") {
      store.set(key, msg.value as { data: unknown });
      return {};
    }
    throw new Error(`unexpected callWS type: ${String(msg.type)}`);
  });
  return { callWS } as unknown as HomeAssistant;
}

function throwingHass(): HomeAssistant {
  return { callWS: vi.fn().mockRejectedValue(new Error("not connected")) } as unknown as HomeAssistant;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("app-shortcuts-storage", () => {
  it("returns null when nothing is stored for a given entity", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    expect(await loadOverride(fakeHass(), "remote.shield")).toBeNull();
  });

  it("round-trips package-based shortcuts", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    const apps: AppShortcut[] = [
      { name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" },
      { name: "Kodi", icon: "mdi:kodi", package: "org.xbmc.kodi" },
    ];
    await saveOverride(hass, "remote.shield", apps);
    expect(await loadOverride(hass, "remote.shield")).toEqual(apps);
  });

  it("filters out shape-invalid entries from an otherwise-valid array", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveOverride(hass, "remote.shield", [
      { name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" },
      { name: "Missing package", icon: "mdi:apps" },
      { icon: "mdi:apps", package: "com.example" },
      "not an object",
    ] as unknown as AppShortcut[]);
    expect(await loadOverride(hass, "remote.shield")).toEqual([
      { name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" },
    ]);
  });

  it("keeps distinct remote entities isolated under different keys", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveOverride(hass, "remote.shield_a", [{ name: "A", icon: "mdi:apps", package: "com.a" }]);
    await saveOverride(hass, "remote.shield_b", [{ name: "B", icon: "mdi:apps", package: "com.b" }]);
    expect(await loadOverride(hass, "remote.shield_a")).toEqual([
      { name: "A", icon: "mdi:apps", package: "com.a" },
    ]);
    expect(await loadOverride(hass, "remote.shield_b")).toEqual([
      { name: "B", icon: "mdi:apps", package: "com.b" },
    ]);
  });

  it("removes a stored override on clearOverride", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveOverride(hass, "remote.shield", [{ name: "A", icon: "mdi:apps", package: "com.a" }]);
    await clearOverride(hass, "remote.shield");
    expect(await loadOverride(hass, "remote.shield")).toBeNull();
  });

  it("fails silently when the connection is unavailable", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = throwingHass();
    expect(await loadOverride(hass, "remote.shield")).toBeNull();
    expect(await saveOverride(hass, "remote.shield", [])).toBe(false);
    expect(await clearOverride(hass, "remote.shield")).toBe(false);
  });

  it("migrates a legacy localStorage value up to the server when the server has none", async () => {
    const legacy: AppShortcut[] = [{ name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" }];
    const storage = fakeLocalStorage();
    storage.setItem(KEY, JSON.stringify(legacy));
    vi.stubGlobal("localStorage", storage);
    const hass = fakeHass();

    expect(await loadOverride(hass, "remote.shield")).toEqual(legacy);
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "frontend/set_user_data",
      key: KEY,
      value: { data: legacy },
    });
  });

  it("does not resurrect legacy localStorage data after an explicit server-side reset", async () => {
    const legacy: AppShortcut[] = [{ name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" }];
    const storage = fakeLocalStorage();
    storage.setItem(KEY, JSON.stringify(legacy));
    vi.stubGlobal("localStorage", storage);
    const hass = fakeHass();

    await clearOverride(hass, "remote.shield"); // explicit reset -> { data: null } on the server
    (hass.callWS as ReturnType<typeof vi.fn>).mockClear();

    expect(await loadOverride(hass, "remote.shield")).toBeNull();
    expect(hass.callWS).toHaveBeenCalledTimes(1); // only the get — no migration write triggered
    expect(hass.callWS).not.toHaveBeenCalledWith(expect.objectContaining({ type: "frontend/set_user_data" }));
  });
});
