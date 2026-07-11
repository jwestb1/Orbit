# Nvidia Shield TV Remote for Home Assistant
## Engineering Design Document & Build Plan

**Author:** Engineering design pass (for hand-off to Claude Code)
**Target:** A fast, responsive Home Assistant "app" (custom Lovelace card, HACS-distributable) that replaces a physical Shield remote — trackpad, D-pad, power/home/back, volume, and one-tap app shortcuts.
**Status:** Ready for implementation

---

## 1. Executive Summary

Home Assistant already ships an **official, Platinum-quality integration called `androidtv_remote`** that speaks Google's real **Android TV Remote Protocol v2** — the same protocol the Google TV mobile app and Google Home app use. It runs entirely on the local network (Local Push class — the Shield pushes state changes to HA immediately, no polling), and it is pre-installed and supported on the Shield out of the box.

**This means we do not need to reinvent device pairing, ADB, or protobuf transport.** The right architecture is:

- **Backend:** the existing `androidtv_remote` core integration, already installed on the user's HA instance, exposing a `remote.<shield>` entity and a `media_player.<shield>` entity.
- **Frontend:** a purpose-built **custom Lovelace card** ("Shield Remote Card") written in LitElement/TypeScript, distributed via HACS, that gives the polished trackpad/button UI the stock dashboard-builder can't produce, and calls the existing `remote.send_command`, `remote.turn_on`, and `media_player.play_media` services over HA's WebSocket connection for minimum latency.

This keeps the project small, maintainable, and aligned with how HA wants third-party UI built — no custom Python backend, no reverse-engineering the Shield's protocol, no fighting HA's update cycle.

---

## 2. Goals & Non-Goals

**Goals**
- Trackpad surface for cursor-free spatial navigation (swipe → D-pad motion, tap → select)
- Hardware-remote parity: Power, Home, Back, D-pad, OK/Center, Volume ±, Mute, Menu/Assist
- One-tap app shortcuts grid (YouTube, Netflix, Plex, Steam Link, etc.), user-configurable
- Feels instant: sub-100ms perceived response on button press, no visible jank on trackpad drag
- Matches Home Assistant's visual language (`ha-card`, theme variables, Material-ish HA design system) and respects Google's Android TV D-pad/focus navigation conventions on the receiving end
- Installable/updatable via HACS like any other community card

**Non-goals (v1)**
- No custom ADB backend — no need, `androidtv_remote` already covers Shield
- No voice input/mic streaming in v1 (protocol supports it, but scope it out for phase 2)
- No support for Fire TV (irrelevant — Shield runs real Android TV Remote Service)
- No pixel-accurate mouse cursor — the protocol has no raw pointer/mouse XY message (see §3.2), so "trackpad" means gesture-to-D-pad translation, not a literal OS cursor

---

## 3. Protocol & SDK Research (current as of build time)

### 3.1 Home Assistant integration options — comparison

| Integration | Protocol | Works on Shield? | IoT Class | Notes |
|---|---|---|---|---|
| **`androidtv_remote`** (recommended) | Google's official Android TV Remote Protocol v2 (protobuf over TLS) | ✅ Yes — Shield has Android TV Remote Service pre-installed | Local Push (instant state updates) | 🏆 Platinum quality core integration; auto-discovers via mDNS; exposes `remote.*` and `media_player.*` entities |
| `androidtv` (ADB) | Android Debug Bridge | ✅ Yes, but requires enabling Developer Options + ADB debugging | Local Polling | Older/more fragile approach; more granular shell-level control but higher latency and more setup friction |
| `cast` (Google Cast) | Cast protocol | ✅ Yes (Shield supports Cast) | Local Push | Good for *media metadata* (title, art, play state) but weak on power state; pair with `androidtv_remote` via a Universal Media Player if you want both |

**Decision: build on `androidtv_remote`.** It's the modern, Google-sanctioned path, it's what the Google Home/Google TV apps themselves use, and HA's own docs explicitly recommend pairing it with Cast (not ADB) for full media metadata.

### 3.2 The underlying protocol (what the integration wraps)

`androidtv_remote` is built on the Python library `androidtvremote2` (protobuf + TLS, mDNS service type `_androidtvremote2._tcp`), itself a clean-room implementation of Google's real Android TV Remote Protocol v2 (the same one `com.google.android.tv.remote.service` on the Shield speaks). Key facts that shape the UI design:

- **Pairing** is a one-time TLS cert exchange with an on-screen PIN confirmation — already handled entirely by the HA config flow. Our card never touches pairing.
- **Input is key-code based**, not pointer-based. The core message is:
  ```protobuf
  message RemoteKeyInject {
    RemoteKeyCode key_code = 1;   // e.g. KEYCODE_DPAD_UP, KEYCODE_HOME, KEYCODE_A...
    RemoteDirection direction = 2; // SHORT | START_LONG | END_LONG
  }
  ```
- **There is no raw mouse/pointer-delta message in the protocol.** The `KEYCODE_DPAD_*` codes are documented as "may also be synthesized from trackball motions" — meaning Google's own apps build touchpad gestures by converting swipe deltas into a stream of discrete D-pad key events, not by sending literal (x,y) coordinates. **Our trackpad component must do the same** (see §5.3). This is an important constraint to design around, not a bug to work around.
- App launching does **not** need raw key injection at all — it uses a separate `RemoteAppLinkLaunchRequest` message (exposed in HA as `media_player.play_media` / `remote.turn_on` with an `activity` deep link or package ID). This is much cheaper and more reliable than simulating navigation keypresses to open an app.
- Long-press is a first-class concept (`START_LONG`/`END_LONG`), surfaced in HA as the `hold_secs` parameter on `remote.send_command` — use it for press-and-hold semantics (e.g., long-press D-pad-center, long-press Home for recents) instead of hand-rolling timers against repeated SHORT sends.

### 3.3 Home Assistant service/entity contract we build against

Exposed by `androidtv_remote` once configured:

- `remote.<shield_name>` — entity with `current_activity` attribute (foreground package name)
  - `remote.send_command` — `data: { command: "<KEYCODE or text:...>", hold_secs?: float, num_repeats?: int }`
  - `remote.turn_on` — `data: { activity: "<package_id_or_deeplink>" }` → launches an app
  - `remote.turn_off`
- `media_player.<shield_name>` — volume, mute, basic playback, `play_media` (media_content_type: `app` | `url` | `channel`)

Confirmed working command vocabulary (subset relevant to this app — full list is the protobuf `RemoteKeyCode` enum):

| Category | Commands |
|---|---|
| Navigation | `DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`, `DPAD_CENTER`, `BACK`, `HOME` |
| Power | `POWER` |
| Volume | `VOLUME_UP`, `VOLUME_DOWN`, `VOLUME_MUTE`, `MUTE` |
| Media | `MEDIA_PLAY_PAUSE`, `MEDIA_PLAY`, `MEDIA_PAUSE`, `MEDIA_STOP`, `MEDIA_NEXT`, `MEDIA_PREVIOUS`, `MEDIA_REWIND`, `MEDIA_FAST_FORWARD` |
| System | `MENU`, `SETTINGS`, `SEARCH`, `ASSIST`, `INFO`, `GUIDE` |
| Text input | prefix any string with `text:` (e.g. `text:hello world`) to type into a focused field via IME |

Example service calls the card will issue:

```yaml
# short D-pad tap
action: remote.send_command
data: { command: DPAD_UP }
target: { entity_id: remote.living_room_shield }

# long-press (e.g. open app switcher on Home)
action: remote.send_command
data: { command: HOME, hold_secs: 0.5 }
target: { entity_id: remote.living_room_shield }

# launch an app shortcut by package id
action: remote.turn_on
data: { activity: com.netflix.ninja }
target: { entity_id: remote.living_room_shield }

# launch a deep link (specific content, when supported by the app)
action: media_player.play_media
data:
  media:
    media_content_type: url
    media_content_id: https://www.youtube.com/watch?v=dQw4w9WgXcQ
target: { entity_id: media_player.living_room_shield }
```

### 3.4 Nvidia Shield–specific quirks to design around

- **Power-on from fully-off can fail** unless the user disables *Settings → Remotes & accessories → Simplified wake buttons* on the Shield (both "Wake on power and Netflix buttons only" and "Wake on NVIDIA or logo buttons only"). Surface this as a one-time setup tip in the card's onboarding/config flow, since it's the #1 reported Shield issue with this integration.
- **Netflix intercepts remote commands** — this is a known limitation of the protocol itself (Google's own apps hit the same wall), not something we can fix client-side. Show a small "some commands may not work inside Netflix" note rather than silently failing.
- Occasional 15-second disconnect/reconnect cycles are reported on some networks; the card should treat `unavailable` state gracefully (dim/disable controls, don't spam retries) rather than erroring.

### 3.5 Google's Android TV design guidance (what the *receiving* UI expects)

Since our trackpad/buttons are driving a real Android TV interface, the UI patterns that make it feel "correct" come from Android TV's own navigation model, not general mobile-app conventions:

- Navigation is fundamentally 4-directional (D-pad) + Select + Back + Home. Every gesture we design should ultimately resolve to that vocabulary — don't invent gestures the OS side can't interpret.
- Back always means "go to the previous destination," eventually bottoming out at the Home launcher — so a dedicated, always-reachable **Back** button is not optional polish, it's core parity with the physical remote.
- Google's newer "pointer remote" guidance (for motion-style remotes) confirms hover/cursor-style input is an emerging pattern Android TV apps are starting to support, but it's opt-in per-app and not universal — so our trackpad should default to the reliable, universally-supported D-pad-emulation mode rather than assuming every app on the Shield handles a hover cursor well.

---

## 4. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Home Assistant Frontend (browser / Companion App / kiosk)   │
│                                                                │
│   ┌───────────────────────────────────────────────────────┐  │
│   │  Shield Remote Card  (custom:shield-remote-card)       │  │
│   │  LitElement, TypeScript, HACS-distributed               │  │
│   │                                                          │  │
│   │  ┌───────────┐ ┌────────────┐ ┌────────────────────┐   │  │
│   │  │ Trackpad   │ │ D-pad /    │ │ App shortcut grid  │   │  │
│   │  │ gesture    │ │ button     │ │ (configurable)     │   │  │
│   │  │ engine     │ │ cluster    │ │                     │   │  │
│   │  └─────┬──────┘ └─────┬──────┘ └──────────┬──────────┘   │  │
│   │        └──────────────┴──────────────────┘              │  │
│   │                    │  hass.callService (WebSocket)        │  │
│   └────────────────────┼───────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                          │  local network, single WS round trip
┌────────────────────────▼──────────────────────────────────────┐
│  Home Assistant Core                                            │
│   androidtv_remote integration (existing, Platinum quality)     │
│   remote.living_room_shield / media_player.living_room_shield   │
└────────────────────────┬──────────────────────────────────────┘
                          │  Android TV Remote Protocol v2 (protobuf/TLS)
┌────────────────────────▼──────────────────────────────────────┐
│  Nvidia Shield — Android TV Remote Service                      │
└──────────────────────────────────────────────────────────────┘
```

**Why not a custom `custom_component` backend?** There's nothing to add at that layer — `androidtv_remote` already exposes everything we need as entities/services. Writing a parallel backend would mean re-implementing pairing/TLS/protobuf for zero functional gain, plus taking on the maintenance burden of keeping up with protocol changes that the core team already owns. If a genuine gap shows up later (e.g., needing raw ADB shell access for something outside the remote protocol, like installing an app), that's a good candidate for a small **companion custom integration** in Phase 3 — not v1.

**Why a custom card instead of just YAML dashboard buttons?** The stock `entities`/`button`/`grid` cards can technically build a D-pad (HA's own docs show a YAML example that does exactly this), but:
- They can't do continuous drag/gesture tracking for a trackpad
- Config is copy-pasted YAML per user, not a reusable, versioned, updatable component
- No shared visual/animation polish, no debounce/throttle logic, no connection-state handling

---

## 5. Component Design

### 5.1 Card shell

```
shield-remote-card/
├── src/
│   ├── shield-remote-card.ts       # main LitElement, registers window.customCards
│   ├── editor.ts                    # visual config editor (GUI card editor)
│   ├── components/
│   │   ├── trackpad.ts
│   │   ├── dpad-cluster.ts
│   │   ├── button-row.ts
│   │   ├── app-grid.ts
│   │   └── volume-slider.ts
│   ├── lib/
│   │   ├── ha-service.ts           # thin wrapper around hass.callService/callWS
│   │   ├── gesture-engine.ts       # pointer-event → keycode translation
│   │   └── throttle.ts
│   ├── types.ts
│   └── const.ts                    # keycode map, default app catalog
├── dist/                            # build output (rollup/vite bundle)
├── hacs.json
├── README.md
└── package.json
```

Minimal LitElement skeleton (Claude Code should scaffold from this):

```ts
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";

@customElement("shield-remote-card")
export class ShieldRemoteCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ShieldRemoteCardConfig;

  setConfig(config: ShieldRemoteCardConfig) {
    if (!config.remote_entity) {
      throw new Error("shield-remote-card: 'remote_entity' is required");
    }
    this._config = config;
  }

  static getConfigElement() {
    return document.createElement("shield-remote-card-editor");
  }

  static getStubConfig() {
    return { remote_entity: "", media_player_entity: "" };
  }

  render() {
    const stateObj = this.hass.states[this._config.remote_entity];
    const unavailable = !stateObj || stateObj.state === "unavailable";
    return html`
      <ha-card>
        <shield-trackpad
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          ?disabled=${unavailable}
        ></shield-trackpad>
        <shield-dpad-cluster .hass=${this.hass} .entity=${this._config.remote_entity}></shield-dpad-cluster>
        <shield-button-row .hass=${this.hass} .entity=${this._config.remote_entity}></shield-button-row>
        <shield-app-grid
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .apps=${this._config.apps}
        ></shield-app-grid>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
    }
  `;
}

// Required for the card picker + HACS card registry
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "shield-remote-card",
  name: "Nvidia Shield Remote",
  description: "Trackpad, D-pad and app shortcuts for Android TV / Shield.",
});
```

Use HA's own custom elements (`ha-card`, `ha-icon`, `ha-icon-button`, `ha-control-slider`) rather than rebuilding buttons from scratch — this is both less work and what keeps the card visually consistent with the rest of the dashboard, per HA's frontend dev docs.

### 5.2 Config schema

```yaml
type: custom:shield-remote-card
remote_entity: remote.living_room_shield
media_player_entity: media_player.living_room_shield   # optional, for volume/playback state
trackpad:
  sensitivity: 6        # px of drag per synthesized D-pad step (lower = more sensitive)
  tap_action: DPAD_CENTER
  two_finger_tap_action: BACK
  long_press_action: HOME
apps:
  - name: YouTube
    icon: mdi:youtube
    package: com.google.android.youtube.tv
  - name: Netflix
    icon: mdi:netflix
    package: com.netflix.ninja
  - name: Plex
    icon: mdi:plex
    package: com.plexapp.android
  - name: Steam Link
    icon: mdi:steam
    package: com.valvesoftware.steamlink
haptics: true            # trigger navigator.vibrate() on supported devices
theme: auto               # auto | light | dark, follows HA theme by default
```

Ship a **GUI card editor** (`editor.ts`, `LitElement` implementing `setConfig`/`configChanged`) so non-YAML users can add apps and tune sensitivity from the dashboard UI — expected baseline for any card intended for HACS distribution.

### 5.3 Trackpad / gesture engine (the core novel piece)

Because the protocol has no pointer message, the trackpad works by **accumulating drag distance and converting it into discrete D-pad key sends**, exactly the pattern Google's own remote apps use:

```ts
// lib/gesture-engine.ts (core logic sketch)
export class GestureEngine {
  private originX = 0;
  private originY = 0;
  private accumX = 0;
  private accumY = 0;
  private lastSendTs = 0;

  constructor(
    private sendKey: (code: string, holdSecs?: number) => void,
    private sensitivityPx: number = 6,   // px per D-pad step
    private minIntervalMs: number = 40   // throttle: ~25 events/sec max
  ) {}

  onPointerDown(x: number, y: number) {
    this.originX = x; this.originY = y;
    this.accumX = 0; this.accumY = 0;
  }

  onPointerMove(x: number, y: number) {
    const dx = x - this.originX;
    const dy = y - this.originY;
    this.originX = x; this.originY = y;
    this.accumX += dx; this.accumY += dy;

    const now = performance.now();
    if (now - this.lastSendTs < this.minIntervalMs) return; // frame-rate throttle

    // Dominant-axis wins per tick, avoids diagonal key spam
    if (Math.abs(this.accumX) > Math.abs(this.accumY)) {
      if (Math.abs(this.accumX) >= this.sensitivityPx) {
        this.sendKey(this.accumX > 0 ? "DPAD_RIGHT" : "DPAD_LEFT");
        this.accumX = 0; this.lastSendTs = now;
      }
    } else if (Math.abs(this.accumY) >= this.sensitivityPx) {
      this.sendKey(this.accumY > 0 ? "DPAD_DOWN" : "DPAD_UP");
      this.accumY = 0; this.lastSendTs = now;
    }
  }

  onTap() { this.sendKey("DPAD_CENTER"); }
  onLongPress() { this.sendKey("DPAD_CENTER", 0.5); } // uses hold_secs
  onTwoFingerTap() { this.sendKey("BACK"); }
}
```

Wire this to native **Pointer Events** (`pointerdown`/`pointermove`/`pointerup`, not legacy touch/mouse events separately) so the same code path works for mouse, touch, and pen, with `touch-action: none` on the surface's CSS to prevent the browser from hijacking the gesture for scroll/zoom.

**Responsiveness rules baked into this design:**
- Throttle key sends to ~25/sec max (`minIntervalMs`) — fast enough to feel fluid, slow enough not to flood the WebSocket or overwhelm the Shield's input queue.
- Give **immediate local visual feedback** (a CSS ripple / cursor-trail on the trackpad, a `:active` press state on buttons) on `pointerdown`, decoupled from the network round trip — this is what makes the UI *feel* instant even though the actual command takes a network hop.
- Debounce, don't queue: if the user drags fast, we want the *latest* accumulated delta, not a backlog of stale key sends executing late.
- Long-press detection uses a single `setTimeout` compared against `pointerup` time, not the D-pad send path — never fire both a SHORT and a START_LONG for the same gesture.

### 5.4 Buttons cluster (power / home / back / D-pad / volume)

Static layout, same command table as §3.3. Notable UX details:
- **Power** button should have a confirmation-free single tap (don't gate it — Google's own guidance says avoid exit/action gating on TV remotes) but visually distinguish it (color, spacing) from navigation to prevent mis-taps.
- **Home** and **Back** get dedicated always-visible buttons — per §3.5 this is core parity, not optional.
- Volume as a slider (`ha-control-slider` bound to the `media_player` entity) rather than repeated tap-to-increment, for faster large adjustments; keep +/- buttons too since they map directly to protocol keycodes and work even without a `media_player` entity configured.

### 5.5 App shortcuts grid

- Backed by `remote.turn_on` with `activity: <package_id>` (fast path — launches app icon directly, no navigation simulation needed) or `media_player.play_media` with a `url` deep link when the user wants to jump to specific content.
- User-configurable list (package id + icon + label) via the GUI editor; ship a small built-in catalog (YouTube, Netflix, Prime Video, Disney+, Plex, Kodi, Twitch, Steam Link) as sane defaults, matching the package IDs HA's own docs list.
- Long-press on a shortcut tile opens a small inline edit affordance (rename/remove) rather than a separate settings page — keeps everything on one screen.

### 5.6 Performance & responsiveness strategy (summary)

| Concern | Mitigation |
|---|---|
| Network round-trip lag | Use `hass.callService`/WebSocket (already the default for `hass.callService` calls in the frontend), not REST polling; Local Push means state feedback is near-instant |
| Trackpad flooding the connection | Throttle to ~25 sends/sec, dominant-axis coalescing (§5.3) |
| UI feels laggy despite fast backend | Optimistic local press/ripple feedback decoupled from network confirmation |
| Re-renders on every hass update | `@state`/`@property` scoped narrowly; only re-render the sub-component whose entity actually changed, not the whole card tree |
| Dropped/unavailable Shield connection | Detect `state === "unavailable"`, gray out + disable controls instead of silently failing taps |
| Long-press ambiguity | Single timer-based gesture classifier per pointer session, using protocol-native `hold_secs` rather than repeated key spam |

---

## 6. Visual/UX standards to follow

1. **Home Assistant design language** — use `ha-card` as the outer shell, `var(--primary-color)`, `var(--card-background-color)`, etc. instead of hardcoded colors, and HA's own `ha-icon`/mdi iconography, so the card doesn't look like a foreign object dropped into the dashboard. Reference: HA's frontend developer docs and design portal.
2. **Android TV navigation conventions** (since we're driving that UI) — everything resolves to D-pad + Select + Back + Home; no invented gestures the OS can't interpret; Back is always present and always means "previous destination."
3. **Touch-target sizing** — Google's own Google TV guidance calls out that remote input (especially gesture-based) is inherently less precise than a resting mouse; keep hit targets generous (44px+ minimum, larger for primary buttons like power/home).
4. **Responsive layout** — card should reflow between a phone-portrait layout (stacked: trackpad → D-pad → buttons → app grid) and a tablet/desktop layout (side-by-side trackpad + button cluster) using container queries or a simple breakpoint, since this will run inside the HA Companion App on phones as often as a browser dashboard.

---

## 7. Build Phases

**Phase 1 — MVP (functional parity with physical remote)**
- Card scaffold, `hass`/config wiring, HACS packaging skeleton
- D-pad cluster + Power/Home/Back/Volume buttons wired to `remote.send_command`
- Basic trackpad (swipe → D-pad, tap → center, no long-press yet)
- Static app shortcut grid (hardcoded default catalog)

**Phase 2 — Polish & configurability**
- GUI config editor (add/remove/reorder apps, adjust trackpad sensitivity)
- Long-press support (`hold_secs`) on D-pad-center, Home, Back
- Two-finger-tap = Back gesture on trackpad
- Optimistic press feedback, haptics (`navigator.vibrate`), connection-state handling
- Responsive layout breakpoints

**Phase 3 — Distribution & extras**
- HACS submission (`hacs.json`, README, versioned releases via GitHub Actions)
- Text input helper (surface the `text:` prefix for search fields via a small keyboard sheet)
- Optional: companion small Python integration *only if* a real gap appears (e.g., app installation via ADB) — not assumed necessary up front

---

## 8. Testing & QA

- **Unit tests** (Vitest/Jest) for `GestureEngine` — feed synthetic pointer-move sequences, assert correct/expected keycode sequence and throttling behavior without needing a real Shield.
- **Manual latency pass** — stopwatch/frame-capture comparison of button-tap-to-Shield-response against the physical Shield remote and against the Google TV mobile app, on both Wi-Fi and Ethernet-connected HA hosts.
- **Cross-surface test matrix** — Chrome desktop, HA Companion App (Android + iOS) webview, tablet dashboard/kiosk — pointer events must behave identically on all three.
- **Degraded-network test** — throttle network in devtools, confirm the throttle/debounce logic prevents runaway command queues and the UI communicates "unavailable" instead of hanging.

---

## 9. Known Limitations (carry these into the README)

- Trackpad is D-pad emulation, not a literal OS pointer — this is a protocol constraint (§3.2), not a v1 shortcut.
- Commands are unreliable inside Netflix — a documented limitation of the protocol itself, not this card.
- Shield must have "Simplified wake buttons" disabled for power-on-from-off to work reliably (§3.4) — worth a one-time setup callout in the card or its README.
- No support for Fire TV (out of scope — Shield-specific by design).

---

## 10. References

- Home Assistant — Android TV Remote integration: https://www.home-assistant.io/integrations/androidtv_remote/
- Home Assistant — Android Debug Bridge integration (for context/comparison): https://www.home-assistant.io/integrations/androidtv/
- `androidtvremote2` Python library (protocol implementation HA's integration is built on): https://github.com/tronikos/androidtvremote2
- Home Assistant — Custom Card developer docs: https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- Home Assistant Frontend design portal: https://design.home-assistant.io
- HACS (distribution): https://hacs.xyz
- Android Developers — TV navigation guidelines: https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv
- Android Developers — Increasing app discovery/engagement on Google TV (pointer-remote guidance): https://developer.android.com/blog/posts/increasing-app-discovery-and-engagement-on-google-tv

---

## 11. Suggested first prompt for Claude Code

> Scaffold a Home Assistant custom Lovelace card called `shield-remote-card` in TypeScript/LitElement, per the attached spec (`shield-ha-remote-spec.md`). Start with Phase 1: card shell + config schema (§5.1–5.2), D-pad/button cluster wired to `remote.send_command` (§3.3), and the `GestureEngine` trackpad (§5.3) wired to native Pointer Events. Use `ha-card` and HA CSS variables for styling (§6). Set up the repo structure from §5.1 with a Vite build and a `hacs.json` for later distribution. Don't build a Python backend — this consumes the existing `androidtv_remote` integration's entities only.
