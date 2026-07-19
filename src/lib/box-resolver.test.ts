import { describe, expect, it } from "vitest";
import { resolveActiveBox, resolveBoxes } from "./box-resolver";
import type { OrbitRemoteCardConfig } from "../types";

function config(overrides: Partial<OrbitRemoteCardConfig> = {}): OrbitRemoteCardConfig {
  return { type: "custom:orbit-remote-card", ...overrides };
}

describe("resolveBoxes", () => {
  it("resolves a single synthetic box from the top-level fields when boxes is absent", () => {
    const boxes = resolveBoxes(
      config({ remote_entity: "remote.living_room", media_player_entity: "media_player.living_room" })
    );
    expect(boxes).toEqual([
      {
        id: "remote.living_room",
        name: "remote.living_room",
        remote_entity: "remote.living_room",
        media_player_entity: "media_player.living_room",
        apps: undefined,
      },
    ]);
  });

  it("returns an empty list when neither remote_entity nor boxes is set", () => {
    expect(resolveBoxes(config())).toEqual([]);
  });

  it("resolves each entry in boxes, defaulting id/name to remote_entity", () => {
    const boxes = resolveBoxes(
      config({
        boxes: [
          { remote_entity: "remote.living_room" },
          { id: "bedroom", name: "Bedroom", remote_entity: "remote.bedroom_box" },
        ],
      })
    );
    expect(boxes).toEqual([
      {
        id: "remote.living_room",
        name: "remote.living_room",
        remote_entity: "remote.living_room",
        media_player_entity: undefined,
        apps: undefined,
      },
      {
        id: "bedroom",
        name: "Bedroom",
        remote_entity: "remote.bedroom_box",
        media_player_entity: undefined,
        apps: undefined,
      },
    ]);
  });

  it("filters out box entries without a remote_entity yet (e.g. a row just added in the editor)", () => {
    const boxes = resolveBoxes(
      config({
        boxes: [{ remote_entity: "remote.living_room" }, { remote_entity: "" }],
      })
    );
    expect(boxes).toEqual([
      {
        id: "remote.living_room",
        name: "remote.living_room",
        remote_entity: "remote.living_room",
        media_player_entity: undefined,
        apps: undefined,
      },
    ]);
  });

  it("prefers boxes over the top-level single-box fields when both are present", () => {
    const boxes = resolveBoxes(
      config({
        remote_entity: "remote.ignored",
        boxes: [{ remote_entity: "remote.living_room" }],
      })
    );
    expect(boxes).toEqual([
      {
        id: "remote.living_room",
        name: "remote.living_room",
        remote_entity: "remote.living_room",
        media_player_entity: undefined,
        apps: undefined,
      },
    ]);
  });
});

describe("resolveActiveBox", () => {
  const boxes = resolveBoxes(
    config({
      boxes: [
        { id: "living_room", remote_entity: "remote.living_room" },
        { id: "bedroom", remote_entity: "remote.bedroom" },
      ],
    })
  );

  it("returns the box matching preferredId when it exists", () => {
    expect(resolveActiveBox(boxes, config(), "bedroom")?.id).toBe("bedroom");
  });

  it("falls back to default_box when preferredId is absent or stale", () => {
    expect(resolveActiveBox(boxes, config({ default_box: "bedroom" }))?.id).toBe("bedroom");
    expect(resolveActiveBox(boxes, config({ default_box: "bedroom" }), "removed_box")?.id).toBe(
      "bedroom"
    );
  });

  it("falls back to the first box when neither preferredId nor default_box match", () => {
    expect(resolveActiveBox(boxes, config())?.id).toBe("living_room");
  });

  it("returns undefined when there are no boxes", () => {
    expect(resolveActiveBox([], config())).toBeUndefined();
  });
});
