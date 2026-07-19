<div align="center">

# 🛰️ Orbit

**A polished, on-screen Android TV remote for Home Assistant.**

Trackpad. D-pad. Volume. App shortcuts. All inside your dashboard —
no physical remote, no separate app.

[![CI](https://github.com/jwestb1/Orbit/actions/workflows/ci.yml/badge.svg)](https://github.com/jwestb1/Orbit/actions/workflows/ci.yml)
[![HACS Custom Repository](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz)
[![License: MIT](https://img.shields.io/github/license/jwestb1/Orbit)](./LICENSE)
[![Latest release](https://img.shields.io/github/v/release/jwestb1/Orbit?sort=semver)](https://github.com/jwestb1/Orbit/releases)

</div>

<br>

<div align="center">
  <img src="./images/card-preview.svg" alt="Orbit card layout: trackpad on the left, D-pad cluster on the right, power/home/back buttons and a volume slider below, and an app shortcut grid at the bottom" width="640">
  <br>
  <sub><em>Layout mockup — trackpad (left), D-pad cluster (right), power/home/back and volume below, app shortcut grid at the bottom.</em></sub>
</div>

<br>

---

## What is Orbit?

Orbit is a **custom Lovelace card** (`orbit-remote-card`) that turns any
card slot on your Home Assistant dashboard into a full Android TV remote —
gesture trackpad, D-pad, power/home/back, volume, media transport, a
keyboard for search boxes, and one-tap app launching. It's built on top of
Home Assistant's own core [`androidtv_remote`](https://www.home-assistant.io/integrations/androidtv_remote/)
integration, so it works with **any Android TV box that integration
supports** — Nvidia Shield, Chromecast with Google TV, and others — not
just one brand of hardware.

Point it at one TV, or hand it a whole house full of them: a single card
can hold **multiple boxes behind a tab/dropdown switcher**, or you can drop
one card per TV across your dashboard — whichever fits your layout.

An optional companion integration adds a real setup page under
**Settings → Devices & Services**, so adding/renaming/removing boxes,
restricting changes to admins, and factory-resetting everything doesn't
require touching YAML at all.

<br>

## ✨ Features

| | |
|---|---|
| 🖱️ **Gesture trackpad** | Swipe-to-navigate, tap-to-select, two-finger-tap for Back — feels like a real touchpad, not a D-pad in disguise. |
| 🎮 **D-pad + button cluster** | Power, Home, Back, volume, mute, and media transport (rewind / play-pause / fast-forward). Long-press support on Back/Home/D-pad-center. |
| 📱 **App shortcuts** | One-tap launch grid with a large built-in catalog (YouTube, Netflix, Disney+, Plex, Spotify, and more) — fully customizable per box. |
| ⌨️ **Text input** | A small keyboard sheet types directly into whatever field is focused on the TV — no more hunt-and-peck with the D-pad. |
| 📺 **Multiple boxes, one card** | Optional tab/dropdown switcher lets one card instance control several TVs, with independent settings per box. |
| 🎛️ **Live, synced customization** | Resize the trackpad/D-pad, tune scroll sensitivity, and edit your app grid straight from the dashboard — no edit mode required, and it follows you to every device you log into. |
| 🧩 **Setup via Devices & Services** *(optional)* | The companion `Orbit` integration adds real box discovery/management under Settings, an admin-only lock, and a one-click factory reset. |
| 📳 **Haptics & responsive layout** | Vibration feedback on supported devices, and a layout that adapts from phone-portrait to wide desktop dashboards. |

<br>

## 📦 Installing on Home Assistant OS (via HACS)

Orbit ships as two independent HACS installs — the **card** (required) and
an **optional** setup integration. Don't have HACS yet? Install it first
via the [official HACS guide](https://www.hacs.xyz/docs/use/download/download/).

### 1. Add the custom repository

In HAOS, go to **HACS**, then use the **⋮ menu → Custom repositories**, and
add:

```
https://github.com/jwestb1/Orbit
```

You'll add it **twice** — once per category — since this repo ships both
halves:

| Repository URL | Category | Required? |
|---|---|---|
| `https://github.com/jwestb1/Orbit` | **Dashboard** | ✅ Yes — this is the card itself |
| `https://github.com/jwestb1/Orbit` | **Integration** | ⬜ Optional — adds Devices & Services setup |

### 2. Install & add the card

1. In HACS → **Frontend**, find **Orbit Remote** and click **Download**.
2. Home Assistant will prompt you to reload the frontend (or restart if asked).
3. Go to a dashboard, **Edit Dashboard → Add Card**, search for **Orbit
   Remote**, and pick the entity for your Android TV box. That's it.

### 3. *(Optional)* Install the setup integration

1. In HACS → **Integrations**, find **Orbit** and click **Download**.
2. Restart Home Assistant.
3. Go to **Settings → Devices & Services → Add Integration → Orbit**.
4. Use **Add box** on the new Orbit tile to register each Android TV box —
   discovered automatically from your existing `androidtv_remote` setup.

> **Prerequisite either way:** Home Assistant's core
> [`androidtv_remote`](https://www.home-assistant.io/integrations/androidtv_remote/)
> integration must already be set up and paired with your box(es) — Orbit
> controls them through it, it doesn't replace it.

<details>
<summary><strong>Prefer manual installation, or building from source?</strong></summary>

<br>

```bash
npm install
npm run build     # builds dist/orbit-remote-card.js
```

Copy `dist/orbit-remote-card.js` into your HA `config/www/` directory and
add it as a Lovelace resource. For the optional integration, copy
`custom_components/orbit/` into `config/custom_components/`.

</details>

<br>

## ⚙️ Configuration

The card ships a full GUI editor — entities, trackpad sensitivity,
haptics, app shortcuts, and box switching — so most people never need to
touch YAML. For reference, here's what it produces:

```yaml
type: custom:orbit-remote-card
remote_entity: remote.living_room_shield
media_player_entity: media_player.living_room_shield   # optional, for volume
trackpad:
  sensitivity: 6
apps:
  - name: YouTube
    icon: mdi:youtube
    package: com.google.android.youtube.tv
```

<details>
<summary><strong>Multiple boxes on one card (device switcher)</strong></summary>

<br>

Provide `boxes` instead of `remote_entity` to get a tab/dropdown switcher
at the top of the card. Each box keeps its own personal
app-shortcut/trackpad overrides. This is fully optional — one card per TV
(above) works just as well, and both styles can be mixed on the same
dashboard.

```yaml
type: custom:orbit-remote-card
boxes:
  - id: living_room
    name: Living Room
    remote_entity: remote.living_room_shield
    media_player_entity: media_player.living_room_shield
  - id: bedroom
    name: Bedroom
    remote_entity: remote.bedroom_box
default_box: living_room   # optional — defaults to the first box
```

</details>

<br>

## 🧩 The Orbit integration, in more detail

`custom_components/orbit/` is a small, config-only companion — it never
talks to your boxes directly (the card still does that through
`androidtv_remote`'s own entities). All it adds:

- 🏠 A real **Settings → Devices & Services** setup page: discovers your
  `androidtv_remote` boxes and lets you add/rename/remove each one from one
  place, instead of hand-typing entity IDs.
- 🔍 A **"configured boxes" quick-pick** in the card's dashboard editor
  (gracefully falls back to the plain entity picker if this integration
  isn't installed).
- 🔒 An **admin-only toggle** (on by default) restricting setup/reset to
  admin users — everyone can still use the remote controls either way.
- 🧹 A **factory-reset** option (in the integration's options, or the
  `orbit.reset` service) that removes every configured box and clears
  every user's personal card customizations.

Requires Home Assistant **2025.2** or newer.

<br>

## ⌨️ Text input

The button row's keyboard icon opens a small text-input sheet. Whatever
you type is sent as a single `text:<value>` command — handy for search
boxes and login forms without hunting-and-pecking with the D-pad.

> **A text field must already be focused on the device** (tap into a
> search box there first) — the protocol only routes typed text to
> whatever field the TV itself currently has active.

<br>

## 🛠️ Development

```bash
npm install
npm run build     # builds dist/orbit-remote-card.js
npm test          # runs the card's unit tests (Vitest)
```

The `custom_components/orbit/` integration has its own Python test suite,
run against a real Home Assistant core install (not mocks):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-test.txt
python -m pytest tests
```

Full engineering design doc: [`shield-ha-remote-spec.md`](./shield-ha-remote-spec.md).

<br>

## 🗺️ Status

| Phase | Status |
|---|---|
| **1 · MVP** | ✅ Card shell, config schema, D-pad/button cluster, gesture trackpad, default app grid. |
| **2 · Polish & configurability** | ✅ GUI config editor, long-press, two-finger-tap Back, haptics, unavailable-state handling, responsive layout. |
| **3 · Distribution** | ✅ HACS packaging, GitHub Actions release pipeline, text-input helper. |
| **4 · Multi-box + setup** | ✅ Rebrand to Orbit, any `androidtv_remote` box (not just Shield), device-switcher mode, companion `custom_components/orbit` integration with Devices & Services setup, admin gating, and factory reset. |

> **Upgrading from "Nvidia Shield Remote"?** The card type was renamed
> from `shield-remote-card` to `orbit-remote-card`, but
> `custom:shield-remote-card` is kept working **permanently** as an alias
> — existing dashboards need no changes.

<br>

<div align="center">

Built for the Home Assistant community · MIT licensed

</div>
