import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserData, readLegacyLocalStorage, setUserData } from "./user-data-storage";
import type { HomeAssistant } from "custom-card-helpers";

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

function fakeHass(callWS: (msg: Record<string, unknown>) => unknown): HomeAssistant {
  return { callWS: vi.fn(callWS) } as unknown as HomeAssistant;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getUserData", () => {
  it("returns found: false when the server has no value for the key", async () => {
    const hass = fakeHass(() => ({ value: null }));
    expect(await getUserData(hass, "some.key")).toEqual({ found: false });
  });

  it("returns found: true with the unwrapped data when the server has a value", async () => {
    const hass = fakeHass(() => ({ value: { data: { trackpadHeight: 220 } } }));
    expect(await getUserData(hass, "some.key")).toEqual({ found: true, data: { trackpadHeight: 220 } });
  });

  it("returns found: false (does not throw) when callWS rejects", async () => {
    const hass = fakeHass(() => {
      throw new Error("not connected");
    });
    expect(await getUserData(hass, "some.key")).toEqual({ found: false });
  });
});

describe("setUserData", () => {
  it("calls callWS with the envelope-wrapped value and resolves true", async () => {
    const hass = fakeHass(() => ({}));
    const ok = await setUserData(hass, "some.key", { trackpadHeight: 220 });
    expect(ok).toBe(true);
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "frontend/set_user_data",
      key: "some.key",
      value: { data: { trackpadHeight: 220 } },
    });
  });

  it("resolves false (does not throw) when callWS rejects", async () => {
    const hass = fakeHass(() => {
      throw new Error("not connected");
    });
    expect(await setUserData(hass, "some.key", { trackpadHeight: 220 })).toBe(false);
  });
});

describe("readLegacyLocalStorage", () => {
  it("returns null when nothing is stored", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    expect(readLegacyLocalStorage("some.key")).toBeNull();
  });

  it("returns the parsed value when present", () => {
    const storage = fakeLocalStorage();
    storage.setItem("some.key", JSON.stringify({ trackpadHeight: 220 }));
    vi.stubGlobal("localStorage", storage);
    expect(readLegacyLocalStorage("some.key")).toEqual({ trackpadHeight: 220 });
  });

  it("returns null on malformed JSON", () => {
    const storage = fakeLocalStorage();
    storage.setItem("some.key", "{not json");
    vi.stubGlobal("localStorage", storage);
    expect(readLegacyLocalStorage("some.key")).toBeNull();
  });

  it("returns null when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readLegacyLocalStorage("some.key")).toBeNull();
  });
});
