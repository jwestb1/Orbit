import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import "./components/trackpad";
import "./components/dpad-cluster";
import "./components/button-row";
import "./components/media-row";
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
  DEFAULT_DPAD_BUTTON_SIZE_PX,
  DEFAULT_TRACKPAD_HEIGHT_PX,
  DEFAULT_TRACKPAD_SENSITIVITY_PX,
  UNAVAILABLE_GRACE_MS,
} from "./const";
import { loadOverride } from "./lib/app-shortcuts-storage";
import { loadUiSettings } from "./lib/ui-settings-storage";
import { resolveActiveBox, resolveBoxes, type ResolvedBox } from "./lib/box-resolver";
import type { AppShortcut, OrbitRemoteCardConfig, UiSettingsOverride } from "./types";

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

  private _unavailableTimer?: number;
  private _overridesLoadedForEntity?: string;
  private _overridesLoadToken = 0;

  setConfig(config: OrbitRemoteCardConfig): void {
    const hasBoxes = !!config.boxes && config.boxes.length > 0;
    if (!hasBoxes && !config.remote_entity) {
      throw new Error(
        "orbit-remote-card: 'remote_entity' is required (or provide 'boxes' for multiple boxes)"
      );
    }
    if (hasBoxes && config.boxes!.some((box) => !box.remote_entity)) {
      throw new Error("orbit-remote-card: every entry in 'boxes' requires 'remote_entity'");
    }
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

  private get _trackpadHeight(): number {
    return this._uiSettingsOverride?.trackpadHeight ?? DEFAULT_TRACKPAD_HEIGHT_PX;
  }

  private get _dpadButtonSize(): number {
    return this._uiSettingsOverride?.dpadButtonSize ?? DEFAULT_DPAD_BUTTON_SIZE_PX;
  }

  private get _sensitivity(): number {
    return (
      this._uiSettingsOverride?.sensitivity ??
      this._config.trackpad?.sensitivity ??
      DEFAULT_TRACKPAD_SENSITIVITY_PX
    );
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
      changed.has("_uiSettingsOverride")
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
    this._uiSettingsOverride = e.detail.settings;
  };

  private _appsReset = (): void => {
    this._appsOverride = null;
  };

  render() {
    const box = this._activeBox;
    if (!box) return html``;
    const unavailable = this._showUnavailable;

    return html`
      <ha-card>
        <div class="card-header-row">
          <orbit-box-switcher
            .boxes=${this._boxes}
            .activeId=${box.id}
            @box-selected=${this._onBoxSelected}
          ></orbit-box-switcher>
          <ha-icon-button .label=${"Settings"} @click=${this._openSettings}>
            <ha-icon icon="mdi:cog"></ha-icon>
          </ha-icon-button>
        </div>
        ${unavailable
          ? html`<div class="unavailable-banner">Device is unavailable</div>`
          : ""}
        <div class="primary-controls">
          <orbit-trackpad
            .hass=${this.hass}
            .entity=${box.remote_entity}
            .config=${{ ...this._config.trackpad, sensitivity: this._sensitivity }}
            .haptics=${this._config.haptics}
            .heightPx=${this._trackpadHeight}
            ?disabled=${unavailable}
          ></orbit-trackpad>
          <orbit-dpad-cluster
            .hass=${this.hass}
            .entity=${box.remote_entity}
            .haptics=${this._config.haptics}
            .buttonSizePx=${this._dpadButtonSize}
            ?disabled=${unavailable}
          ></orbit-dpad-cluster>
        </div>
        <orbit-button-row
          .hass=${this.hass}
          .entity=${box.remote_entity}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
          @open-text-input=${this._openTextInput}
          @open-app-launcher=${this._openAppLauncher}
        ></orbit-button-row>
        <orbit-media-row
          .hass=${this.hass}
          .entity=${box.remote_entity}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
        ></orbit-media-row>
        ${box.media_player_entity
          ? html`<orbit-volume-slider
              .hass=${this.hass}
              .entity=${box.media_player_entity}
              ?disabled=${unavailable}
            ></orbit-volume-slider>`
          : ""}
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
          .trackpadHeight=${this._trackpadHeight}
          .dpadButtonSize=${this._dpadButtonSize}
          .sensitivity=${this._sensitivity}
          @settings-changed=${this._settingsChanged}
          @settings-closed=${this._closeSettings}
          @open-app-picker=${this._openAppPicker}
          @apps-reset=${this._appsReset}
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
    .card-header-row ha-icon-button {
      flex: 0 0 auto;
      --mdc-icon-button-size: 36px;
      color: var(--secondary-text-color);
    }
    .unavailable-banner {
      font-size: 0.85em;
      color: var(--error-color, #db4437);
      text-align: center;
    }
    .primary-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    @container orbit-remote-card (min-width: 420px) {
      .primary-controls {
        flex-direction: row;
        align-items: center;
      }
      .primary-controls orbit-trackpad {
        flex: 1 1 55%;
      }
      .primary-controls orbit-dpad-cluster {
        flex: 0 0 auto;
      }
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

// Permanent alias — registers the same class under the pre-rebrand tag name
// so existing dashboards' `type: custom:shield-remote-card` YAML keeps
// working indefinitely. Not listed in window.customCards (below), so the
// "Add Card" picker only ever offers the current name, not a duplicate.
if (!customElements.get(LEGACY_CARD_TYPE)) {
  customElements.define(LEGACY_CARD_TYPE, OrbitRemoteCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: CARD_DESCRIPTION,
});
