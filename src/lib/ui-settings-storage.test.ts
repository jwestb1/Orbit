import { afterEach, describe, expect, it, vi } from "vitest";
import { clearUiSettings, loadUiSettings, saveUiSettings } from "./ui-settings-storage";
import type { HomeAssistant } from "custom-card-helpers";
import type { UiSettingsOverride } from "../types";

const KEY = "shield-remote-card.ui-settings.remote.shield";

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

describe("ui-settings-storage", () => {
  it("returns null when nothing is stored for a given entity", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    expect(await loadUiSettings(fakeHass(), "remote.shield")).toBeNull();
  });

  it("round-trips a full settings override", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    const settings = { sensitivity: 14 };
    await saveUiSettings(hass, "remote.shield", settings);
    expect(await loadUiSettings(hass, "remote.shield")).toEqual(settings);
  });

  it("drops shape-invalid fields but keeps valid ones", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveUiSettings(hass, "remote.shield", {
      sensitivity: 14,
      buttonLayout: "not-an-array",
    } as unknown as UiSettingsOverride);
    expect(await loadUiSettings(hass, "remote.shield")).toEqual({ sensitivity: 14 });
  });

  it("round-trips a buttonLayout array", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    const settings = {
      buttonLayout: [
        { id: "trackpad", x: 0, y: 0, w: 4, h: 3 },
        { id: "dpad", x: 4, y: 0, w: 2, h: 3 },
      ],
    };
    await saveUiSettings(hass, "remote.shield", settings as UiSettingsOverride);
    expect(await loadUiSettings(hass, "remote.shield")).toEqual(settings);
  });

  it("drops individual malformed buttonLayout entries but keeps the rest", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveUiSettings(hass, "remote.shield", {
      buttonLayout: [
        { id: "trackpad", x: 0, y: 0, w: 4, h: 3 },
        { id: "not_a_real_button", x: 0, y: 0, w: 1, h: 1 },
        { id: "dpad", x: 4, y: "oops", w: 2, h: 3 },
      ],
    } as unknown as UiSettingsOverride);
    expect(await loadUiSettings(hass, "remote.shield")).toEqual({
      buttonLayout: [{ id: "trackpad", x: 0, y: 0, w: 4, h: 3 }],
    });
  });

  it("drops an empty or entirely-invalid buttonLayout array", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveUiSettings(hass, "remote.shield", {
      sensitivity: 14,
      buttonLayout: [],
    } as unknown as UiSettingsOverride);
    expect(await loadUiSettings(hass, "remote.shield")).toEqual({ sensitivity: 14 });
  });

  it("keeps distinct remote entities isolated under different keys", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveUiSettings(hass, "remote.shield_a", { sensitivity: 10 });
    await saveUiSettings(hass, "remote.shield_b", { sensitivity: 20 });
    expect(await loadUiSettings(hass, "remote.shield_a")).toEqual({ sensitivity: 10 });
    expect(await loadUiSettings(hass, "remote.shield_b")).toEqual({ sensitivity: 20 });
  });

  it("removes a stored override on clearUiSettings", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = fakeHass();
    await saveUiSettings(hass, "remote.shield", { sensitivity: 12 });
    await clearUiSettings(hass, "remote.shield");
    expect(await loadUiSettings(hass, "remote.shield")).toBeNull();
  });

  it("fails silently when the connection is unavailable", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const hass = throwingHass();
    expect(await loadUiSettings(hass, "remote.shield")).toBeNull();
    expect(await saveUiSettings(hass, "remote.shield", {})).toBe(false);
    expect(await clearUiSettings(hass, "remote.shield")).toBe(false);
  });

  it("migrates a legacy localStorage value up to the server when the server has none", async () => {
    const storage = fakeLocalStorage();
    storage.setItem(KEY, JSON.stringify({ sensitivity: 25 }));
    vi.stubGlobal("localStorage", storage);
    const hass = fakeHass();

    expect(await loadUiSettings(hass, "remote.shield")).toEqual({ sensitivity: 25 });
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "frontend/set_user_data",
      key: KEY,
      value: { data: { sensitivity: 25 } },
    });
  });

  it("does not resurrect legacy localStorage data after an explicit server-side reset", async () => {
    const storage = fakeLocalStorage();
    storage.setItem(KEY, JSON.stringify({ sensitivity: 25 }));
    vi.stubGlobal("localStorage", storage);
    const hass = fakeHass();

    await clearUiSettings(hass, "remote.shield"); // explicit reset -> { data: null } on the server
    (hass.callWS as ReturnType<typeof vi.fn>).mockClear();

    expect(await loadUiSettings(hass, "remote.shield")).toBeNull();
    expect(hass.callWS).toHaveBeenCalledTimes(1); // only the get — no migration write triggered
    expect(hass.callWS).not.toHaveBeenCalledWith(expect.objectContaining({ type: "frontend/set_user_data" }));
  });
});
