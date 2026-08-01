import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import type { HomeAssistant } from "custom-card-helpers";
import "./components/trackpad";
import "./components/dpad-cluster";
import "./components/remote-button";
import "./components/volume-slider";
import "./components/text-input-sheet";
import "./components/app-launcher-dialog";
import "./components/app-picker-dialog";
import "./components/settings-dialog";
import "./components/box-switcher";
import "./editor";
import {
  CARD_DESCRIPTION,
  CARD_NAME,
  CARD_TYPE,
  LEGACY_CARD_TYPE,
  DEFAULT_APPS,
  DEFAULT_LONG_PRESS_HOLD_SECS,
  DEFAULT_TRACKPAD_SENSITIVITY_PX,
  GRID_GAP_PX,
  GRID_ROW_HEIGHT_PX,
  KEYCODE,
  MEDIA_PLAYER_FEATURE,
  UNAVAILABLE_GRACE_MS,
} from "./const";
import { loadOverride } from "./lib/app-shortcuts-storage";
import { getCardTheme, type CardThemeId } from "./lib/card-themes";
import { loadUiSettings, saveUiSettings } from "./lib/ui-settings-storage";
import { resolveActiveBox, resolveBoxes, type ResolvedBox } from "./lib/box-resolver";
import {
  DEFAULT_LAYOUT,
  GRID_COLUMNS,
  moveItem,
  resizeItem,
  type LayoutItem,
  type LayoutItemId,
} from "./lib/button-layout";
import { DragReorderController } from "./lib/drag-reorder-controller";
import type { AppShortcut, OrbitRemoteCardConfig, UiSettingsOverride } from "./types";
import type { KeyCode } from "./const";

// Static per-button visuals/behavior for every LayoutItemId that isn't the
// trackpad, D-pad, or volume slider (those three render their own
// dedicated components — see _renderItemContent below).
interface ButtonDef {
  icon: string;
  label: string;
  keycode?: KeyCode;
  holdSecs?: number;
  haptic?: "light" | "medium";
  longPressHaptic?: "light" | "medium";
  danger?: boolean;
  eventName?: string;
}

const BUTTON_DEFS: Partial<Record<LayoutItemId, ButtonDef>> = {
  back: {
    icon: "mdi:arrow-left",
    label: "Back (hold for long-press)",
    keycode: KEYCODE.BACK,
    holdSecs: DEFAULT_LONG_PRESS_HOLD_SECS,
    longPressHaptic: "medium",
  },
  home: {
    icon: "mdi:home",
    label: "Home (hold for long-press)",
    keycode: KEYCODE.HOME,
    holdSecs: DEFAULT_LONG_PRESS_HOLD_SECS,
    longPressHaptic: "medium",
  },
  power: { icon: "mdi:power", label: "Power", keycode: KEYCODE.POWER, haptic: "medium", danger: true },
  volume_down: { icon: "mdi:volume-minus", label: "Volume down", keycode: KEYCODE.VOLUME_DOWN },
  mute: { icon: "mdi:volume-mute", label: "Mute", keycode: KEYCODE.VOLUME_MUTE },
  volume_up: { icon: "mdi:volume-plus", label: "Volume up", keycode: KEYCODE.VOLUME_UP },
  keyboard: { icon: "mdi:keyboard-outline", label: "Text input", eventName: "open-text-input" },
  apps: { icon: "mdi:apps", label: "Apps", eventName: "open-app-launcher" },
  rewind: { icon: "mdi:rewind", label: "Rewind", keycode: KEYCODE.MEDIA_REWIND },
  play_pause: { icon: "mdi:play-pause", label: "Play/Pause", keycode: KEYCODE.MEDIA_PLAY_PAUSE },
  fast_forward: { icon: "mdi:fast-forward", label: "Fast forward", keycode: KEYCODE.MEDIA_FAST_FORWARD },
};

@customElement(CARD_TYPE)
export class OrbitRemoteCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: OrbitRemoteCardConfig;
  @state() private _activeBoxId?: string;
  @state() private _showUnavailable = false;
  @state() private _textInputOpen = false;
  @state() private _appLauncherOpen = false;
  @state() private _appPickerOpen = false;
  @state() private _appsOverride: AppShortcut[] | null = null;
  @state() private _settingsOpen = false;
  @state() private _uiSettingsOverride: UiSettingsOverride | null = null;
  @state() private _layoutEditMode = false;
  @state() private _draftLayout: LayoutItem[] | null = null;

  private _unavailableTimer?: number;
  private _overridesLoadedForEntity?: string;
  private _overridesLoadToken = 0;

  private _dragControllers = new Map<LayoutItemId, DragReorderController>();
  private _resizeControllers = new Map<LayoutItemId, DragReorderController>();
  private _dragOrigin = new Map<LayoutItemId, { x: number; y: number }>();
  private _resizeOrigin = new Map<LayoutItemId, { w: number; h: number }>();

  // Deliberately never throws for an incomplete box (e.g. no remote_entity
  // picked yet): Lovelace's editor calls setConfig() live on every keystroke
  // for its preview, including the stub config on a freshly-added card and
  // an "Add box" row before its entity picker is filled in. Throwing there
  // surfaced as a hard "Configuration error" mid-edit; render() below shows
  // a friendly placeholder instead once resolveBoxes() finds nothing usable.
  setConfig(config: OrbitRemoteCardConfig): void {
    this._config = config;
    // Overrides are loaded from willUpdate() once `hass` is confirmed
    // present — setConfig() can't be awaited by Lovelace and `hass` isn't
    // guaranteed assigned yet at this point.
  }

  private get _boxes(): ResolvedBox[] {
    return resolveBoxes(this._config);
  }

  // Only undefined if setConfig's validation somehow let through an empty
  // config — every valid config resolves to at least one box.
  private get _activeBox(): ResolvedBox | undefined {
    return resolveActiveBox(this._boxes, this._config, this._activeBoxId);
  }

  private get _apps(): AppShortcut[] {
    return this._appsOverride ?? this._activeBox?.apps ?? this._config.apps ?? DEFAULT_APPS;
  }

  private _onBoxSelected = (e: CustomEvent<{ id: string }>): void => {
    this._activeBoxId = e.detail.id;
  };

  private get _sensitivity(): number {
    return (
      this._uiSettingsOverride?.sensitivity ??
      this._config.trackpad?.sensitivity ??
      DEFAULT_TRACKPAD_SENSITIVITY_PX
    );
  }

  private get _theme(): CardThemeId {
    return this._uiSettingsOverride?.theme ?? "default";
  }

  // Overrides the same standard HA CSS custom properties every component
  // already themes itself off of (--primary-color, --card-background-color,
  // etc.) — cascades through shadow DOM to every child as ordinary CSS
  // inheritance, no component-level changes needed. Empty for "default", so
  // the card falls through to the dashboard's own HA theme unchanged.
  private get _themeStyles(): Record<string, string> {
    const t = getCardTheme(this._theme);
    if (!t) return {};
    return {
      "--ha-card-background": t.bg,
      "--card-background-color": t.bg,
      "--primary-text-color": t.text,
      "--secondary-text-color": `color-mix(in srgb, ${t.text} 55%, transparent)`,
      "--secondary-background-color": t.surface,
      "--divider-color": t.divider,
      "--primary-color": t.accent,
      "--text-primary-color": t.bg,
      "--ha-card-border-radius": t.radius,
      "--orbit-tile-radius": t.radius,
      "font-family": t.font,
    };
  }

  // The saved layout, or the built-in default if the user has never
  // customized one.
  private get _layout(): LayoutItem[] {
    return this._uiSettingsOverride?.buttonLayout ?? DEFAULT_LAYOUT;
  }

  // The layout actually being rendered: the in-progress edit while edit
  // mode is active, otherwise the saved one.
  private get _effectiveLayout(): LayoutItem[] {
    return this._draftLayout ?? this._layout;
  }

  static getStubConfig(): Partial<OrbitRemoteCardConfig> {
    return { remote_entity: "", media_player_entity: "" };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("orbit-remote-card-editor");
  }

  getCardSize(): number {
    return 6;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._unavailableTimer);
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!this._config) return false;
    if (
      changed.has("_config") ||
      changed.has("_activeBoxId") ||
      changed.has("_showUnavailable") ||
      changed.has("_textInputOpen") ||
      changed.has("_appLauncherOpen") ||
      changed.has("_appPickerOpen") ||
      changed.has("_appsOverride") ||
      changed.has("_settingsOpen") ||
      changed.has("_uiSettingsOverride") ||
      changed.has("_layoutEditMode") ||
      changed.has("_draftLayout")
    )
      return true;

    const oldHass = changed.get("hass") as HomeAssistant | undefined;
    if (!oldHass) return true;

    const box = this._activeBox;
    if (!box) return true;

    return (
      oldHass.states[box.remote_entity] !== this.hass.states[box.remote_entity] ||
      (!!box.media_player_entity &&
        oldHass.states[box.media_player_entity] !== this.hass.states[box.media_player_entity])
    );
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._config) return;

    const box = this._activeBox;
    if (!box) return;

    if (this.hass && this._overridesLoadedForEntity !== box.remote_entity) {
      this._overridesLoadedForEntity = box.remote_entity;
      this._appsOverride = null;
      this._uiSettingsOverride = null;
      this._loadOverrides(box.remote_entity);
    }

    if (!changed.has("hass") && !changed.has("_activeBoxId")) return;

    const stateObj = this.hass.states[box.remote_entity];
    const unavailable = !stateObj || stateObj.state === "unavailable";

    if (!unavailable) {
      window.clearTimeout(this._unavailableTimer);
      this._unavailableTimer = undefined;
      this._showUnavailable = false;
      return;
    }

    if (!this._unavailableTimer && !this._showUnavailable) {
      this._unavailableTimer = window.setTimeout(() => {
        this._unavailableTimer = undefined;
        this._showUnavailable = true;
      }, UNAVAILABLE_GRACE_MS);
    }
  }

  private _loadOverrides(remoteEntity: string): void {
    const token = ++this._overridesLoadToken;
    const hass = this.hass;
    void loadOverride(hass, remoteEntity).then((apps) => {
      if (token !== this._overridesLoadToken) return;
      this._appsOverride = apps;
    });
    void loadUiSettings(hass, remoteEntity).then((settings) => {
      if (token !== this._overridesLoadToken) return;
      this._uiSettingsOverride = settings;
    });
  }

  private _openTextInput = (): void => {
    this._textInputOpen = true;
  };

  private _closeTextInput = (): void => {
    this._textInputOpen = false;
  };

  private _openAppLauncher = (): void => {
    this._appLauncherOpen = true;
  };

  private _closeAppLauncher = (): void => {
    this._appLauncherOpen = false;
  };

  private _openAppPicker = (): void => {
    this._appPickerOpen = true;
  };

  private _closeAppPicker = (): void => {
    this._appPickerOpen = false;
  };

  private _appPickerChanged = (e: CustomEvent<{ apps: AppShortcut[] }>): void => {
    this._appsOverride = e.detail.apps;
  };

  private _openSettings = (): void => {
    this._settingsOpen = true;
  };

  private _closeSettings = (): void => {
    this._settingsOpen = false;
  };

  private _settingsChanged = (e: CustomEvent<{ settings: UiSettingsOverride }>): void => {
    this._uiSettingsOverride = { ...this._uiSettingsOverride, ...e.detail.settings };
  };

  private _appsReset = (): void => {
    this._appsOverride = null;
  };

  // Hands off from the settings dialog: close it and jump into the
  // wiggle/drag-and-drop layout editor on the main card view.
  private _onEditLayoutRequested = (): void => {
    this._settingsOpen = false;
    this._draftLayout = this._layout;
    this._layoutEditMode = true;
  };

  private _onLayoutDone = (): void => {
    this._layoutEditMode = false;
    const draft = this._draftLayout;
    this._draftLayout = null;
    const box = this._activeBox;
    if (!draft || !box) return;
    const nextOverride: UiSettingsOverride = { ...this._uiSettingsOverride, buttonLayout: draft };
    this._uiSettingsOverride = nextOverride;
    void saveUiSettings(this.hass, box.remote_entity, nextOverride);
  };

  // Measured in pixels so pointer-drag deltas (also pixels) can be
  // converted into whole grid-cell deltas. Columns are elastic (fr units,
  // responsive to card width) so column width is measured live; rows are a
  // fixed pitch (see const.ts), so row height is a constant.
  private get _cellSize(): { width: number; height: number } {
    const grid = this.renderRoot?.querySelector(".control-grid") as HTMLElement | null;
    const width = grid ? grid.clientWidth / GRID_COLUMNS : 0;
    return { width, height: GRID_ROW_HEIGHT_PX + GRID_GAP_PX };
  }

  private _getDragController(id: LayoutItemId): DragReorderController {
    let controller = this._dragControllers.get(id);
    if (!controller) {
      controller = new DragReorderController(
        (dx, dy) => this._onDragDelta(id, dx, dy),
        () => this._cellSize
      );
      this._dragControllers.set(id, controller);
    }
    return controller;
  }

  private _getResizeController(id: LayoutItemId): DragReorderController {
    let controller = this._resizeControllers.get(id);
    if (!controller) {
      controller = new DragReorderController(
        (dx, dy) => this._onResizeDelta(id, dx, dy),
        () => this._cellSize
      );
      this._resizeControllers.set(id, controller);
    }
    return controller;
  }

  private _onItemPointerDown = (id: LayoutItemId, e: PointerEvent): void => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const item = this._effectiveLayout.find((i) => i.id === id);
    if (item) this._dragOrigin.set(id, { x: item.x, y: item.y });
    this._getDragController(id).onPointerDown(e);
  };

  private _onDragDelta(id: LayoutItemId, dx: number, dy: number): void {
    const origin = this._dragOrigin.get(id);
    if (!origin) return;
    const result = moveItem(this._effectiveLayout, id, origin.x + dx, origin.y + dy);
    if (result) this._draftLayout = result;
  }

  // stopPropagation so a drag starting on the resize handle doesn't also
  // register as a move-drag on the parent item.
  private _onResizeHandlePointerDown = (id: LayoutItemId, e: PointerEvent): void => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const item = this._effectiveLayout.find((i) => i.id === id);
    if (item) this._resizeOrigin.set(id, { w: item.w, h: item.h });
    this._getResizeController(id).onPointerDown(e);
  };

  private _onResizeDelta(id: LayoutItemId, dx: number, dy: number): void {
    const origin = this._resizeOrigin.get(id);
    if (!origin) return;
    const result = resizeItem(this._effectiveLayout, id, origin.w + dx, origin.h + dy);
    if (result) this._draftLayout = result;
  }

  private _renderItemContent(id: LayoutItemId, unavailable: boolean, box: ResolvedBox) {
    if (id === "trackpad") {
      return html`
        <orbit-trackpad
          .hass=${this.hass}
          .entity=${box.remote_entity}
          .config=${{ ...this._config.trackpad, sensitivity: this._sensitivity }}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
        ></orbit-trackpad>
      `;
    }
    if (id === "dpad") {
      return html`
        <orbit-dpad-cluster
          .hass=${this.hass}
          .entity=${box.remote_entity}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
        ></orbit-dpad-cluster>
      `;
    }
    if (id === "volume_slider") {
      return box.media_player_entity
        ? html`<orbit-volume-slider
            .hass=${this.hass}
            .entity=${box.media_player_entity}
            ?disabled=${unavailable}
          ></orbit-volume-slider>`
        : "";
    }
    const def = BUTTON_DEFS[id];
    if (!def) return "";
    return html`
      <orbit-remote-button
        .hass=${this.hass}
        .entity=${box.remote_entity}
        .haptics=${this._config.haptics}
        ?disabled=${unavailable}
        .icon=${def.icon}
        .label=${def.label}
        .keycode=${def.keycode}
        .holdSecs=${def.holdSecs}
        .haptic=${def.haptic ?? "light"}
        .longPressHaptic=${def.longPressHaptic ?? "medium"}
        ?danger=${!!def.danger}
        .eventName=${def.eventName}
      ></orbit-remote-button>
    `;
  }

  private _renderItem(item: LayoutItem, unavailable: boolean, box: ResolvedBox) {
    const style = `grid-column: ${item.x + 1} / span ${item.w}; grid-row: ${item.y + 1} / span ${item.h};`;
    const content = this._renderItemContent(item.id, unavailable, box);

    if (!this._layoutEditMode) {
      return html`<div class="grid-item" style=${style}>${content}</div>`;
    }

    return html`
      <div
        class="grid-item wiggle"
        style=${style}
        @pointerdown=${(e: PointerEvent) => this._onItemPointerDown(item.id, e)}
        @pointermove=${(e: PointerEvent) => this._getDragController(item.id).onPointerMove(e)}
        @pointerup=${() => this._getDragController(item.id).onPointerUp()}
        @pointercancel=${() => this._getDragController(item.id).onPointerUp()}
      >
        <div class="grid-item-content">${content}</div>
        <div
          class="resize-handle"
          @pointerdown=${(e: PointerEvent) => this._onResizeHandlePointerDown(item.id, e)}
          @pointermove=${(e: PointerEvent) => this._getResizeController(item.id).onPointerMove(e)}
          @pointerup=${() => this._getResizeController(item.id).onPointerUp()}
          @pointercancel=${() => this._getResizeController(item.id).onPointerUp()}
        >
          <ha-icon icon="mdi:resize-bottom-right"></ha-icon>
        </div>
      </div>
    `;
  }

  render() {
    const box = this._activeBox;
    if (!box) {
      return html`
        <ha-card>
          <div class="placeholder">Select a remote entity in the card editor to get started.</div>
        </ha-card>
      `;
    }
    const unavailable = this._showUnavailable;
    const mediaPlayerState = box.media_player_entity
      ? this.hass.states[box.media_player_entity]
      : undefined;
    const supportsVolumeSet =
      ((mediaPlayerState?.attributes.supported_features ?? 0) &
        MEDIA_PLAYER_FEATURE.VOLUME_SET) !==
      0;
    const items = this._effectiveLayout.filter(
      (item) => item.id !== "volume_slider" || supportsVolumeSet
    );

    return html`
      <ha-card style=${styleMap(this._themeStyles)}>
        ${this._layoutEditMode
          ? html`
              <div class="card-header-row">
                <span class="edit-mode-hint">Drag to move, drag a corner to resize</span>
                <mwc-button @click=${this._onLayoutDone}>Done</mwc-button>
              </div>
            `
          : html`
              <div class="card-header-row">
                <orbit-box-switcher
                  .boxes=${this._boxes}
                  .activeId=${box.id}
                  @box-selected=${this._onBoxSelected}
                ></orbit-box-switcher>
                <button
                  type="button"
                  class="settings-button"
                  aria-label="Settings"
                  title="Settings"
                  @click=${this._openSettings}
                >
                  <ha-icon icon="mdi:cog"></ha-icon>
                </button>
              </div>
            `}
        ${unavailable && !this._layoutEditMode
          ? html`<div class="unavailable-banner">Device is unavailable</div>`
          : ""}
        <div
          class="control-grid"
          @open-text-input=${this._openTextInput}
          @open-app-launcher=${this._openAppLauncher}
        >
          ${items.map((item) => this._renderItem(item, unavailable, box))}
        </div>
        <orbit-text-input-sheet
          .hass=${this.hass}
          .entity=${box.remote_entity}
          .haptics=${this._config.haptics}
          .open=${this._textInputOpen}
          @text-input-closed=${this._closeTextInput}
        ></orbit-text-input-sheet>
        <orbit-app-launcher-dialog
          .hass=${this.hass}
          .entity=${box.remote_entity}
          .apps=${this._apps}
          .haptics=${this._config.haptics}
          .open=${this._appLauncherOpen}
          @app-launcher-closed=${this._closeAppLauncher}
          @open-app-picker=${this._openAppPicker}
        ></orbit-app-launcher-dialog>
        <orbit-app-picker-dialog
          .hass=${this.hass}
          .open=${this._appPickerOpen}
          .remoteEntity=${box.remote_entity}
          .apps=${this._apps}
          .configDefaultApps=${box.apps ?? this._config.apps ?? DEFAULT_APPS}
          @app-picker-changed=${this._appPickerChanged}
          @app-picker-closed=${this._closeAppPicker}
        ></orbit-app-picker-dialog>
        <orbit-settings-dialog
          .hass=${this.hass}
          .open=${this._settingsOpen}
          .remoteEntity=${box.remote_entity}
          .sensitivity=${this._sensitivity}
          .theme=${this._theme}
          @settings-changed=${this._settingsChanged}
          @settings-closed=${this._closeSettings}
          @open-app-picker=${this._openAppPicker}
          @apps-reset=${this._appsReset}
          @edit-layout-requested=${this._onEditLayoutRequested}
        ></orbit-settings-dialog>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      container-type: inline-size;
      container-name: orbit-remote-card;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
    }
    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: -8px -8px -16px 0;
    }
    .card-header-row orbit-box-switcher {
      min-width: 0;
      flex: 1 1 auto;
    }
    .settings-button {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 36px;
      height: 36px;
      box-sizing: border-box;
      color: var(--secondary-text-color);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .settings-button ha-icon {
      pointer-events: none;
    }
    .edit-mode-hint {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      flex: 1 1 auto;
      min-width: 0;
    }
    .unavailable-banner {
      font-size: 0.85em;
      color: var(--error-color, #db4437);
      text-align: center;
    }
    .placeholder {
      font-size: 0.9em;
      color: var(--secondary-text-color);
      text-align: center;
      padding: 8px 0;
    }
    .control-grid {
      display: grid;
      grid-template-columns: repeat(${GRID_COLUMNS}, 1fr);
      grid-auto-rows: ${GRID_ROW_HEIGHT_PX}px;
      gap: ${GRID_GAP_PX}px;
    }
    .grid-item {
      position: relative;
      min-width: 0;
      min-height: 0;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
      border-radius: var(--orbit-tile-radius, 12px);
    }
    .grid-item-content {
      width: 100%;
      height: 100%;
    }
    .grid-item.wiggle {
      touch-action: none;
      animation: orbit-wiggle 0.22s ease-in-out infinite;
    }
    .grid-item.wiggle:nth-child(even) {
      animation-delay: -0.11s;
    }
    .grid-item.wiggle .grid-item-content {
      pointer-events: none;
    }
    @keyframes orbit-wiggle {
      0%,
      100% {
        transform: rotate(-1deg);
      }
      50% {
        transform: rotate(1deg);
      }
    }
    .resize-handle {
      position: absolute;
      right: -6px;
      bottom: -6px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--primary-color, #03a9f4);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      cursor: nwse-resize;
      z-index: 1;
    }
    .resize-handle ha-icon {
      --mdc-icon-size: 14px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: OrbitRemoteCard;
    [LEGACY_CARD_TYPE]: OrbitRemoteCard;
  }
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

// Permanent alias — registers the pre-rebrand tag name so existing
// dashboards' `type: custom:shield-remote-card` YAML keeps working
// indefinitely. Not listed in window.customCards (below), so the "Add Card"
// picker only ever offers the current name, not a duplicate.
//
// A bare subclass (rather than defining OrbitRemoteCard itself a second
// time) is required here: CustomElementRegistry.define() throws
// NotSupportedError if the same constructor is registered under two tag
// names, so reusing OrbitRemoteCard directly threw on every page load.
class OrbitRemoteCardLegacy extends OrbitRemoteCard {}
if (!customElements.get(LEGACY_CARD_TYPE)) {
  customElements.define(LEGACY_CARD_TYPE, OrbitRemoteCardLegacy);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: CARD_DESCRIPTION,
});
