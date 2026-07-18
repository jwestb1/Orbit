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
import "./editor";
import {
  CARD_DESCRIPTION,
  CARD_NAME,
  CARD_TYPE,
  DEFAULT_APPS,
  DEFAULT_DPAD_BUTTON_SIZE_PX,
  DEFAULT_TRACKPAD_HEIGHT_PX,
  DEFAULT_TRACKPAD_SENSITIVITY_PX,
  UNAVAILABLE_GRACE_MS,
} from "./const";
import { loadOverride } from "./lib/app-shortcuts-storage";
import { loadUiSettings } from "./lib/ui-settings-storage";
import type { AppShortcut, ShieldRemoteCardConfig, UiSettingsOverride } from "./types";

@customElement(CARD_TYPE)
export class ShieldRemoteCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ShieldRemoteCardConfig;
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

  setConfig(config: ShieldRemoteCardConfig): void {
    if (!config.remote_entity) {
      throw new Error("shield-remote-card: 'remote_entity' is required");
    }
    this._config = config;
    // Overrides are loaded from willUpdate() once `hass` is confirmed
    // present — setConfig() can't be awaited by Lovelace and `hass` isn't
    // guaranteed assigned yet at this point.
  }

  private get _apps(): AppShortcut[] {
    return this._appsOverride ?? this._config.apps ?? DEFAULT_APPS;
  }

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

  static getStubConfig(): Partial<ShieldRemoteCardConfig> {
    return { remote_entity: "", media_player_entity: "" };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement("shield-remote-card-editor");
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

    return (
      oldHass.states[this._config.remote_entity] !== this.hass.states[this._config.remote_entity] ||
      (!!this._config.media_player_entity &&
        oldHass.states[this._config.media_player_entity] !==
          this.hass.states[this._config.media_player_entity])
    );
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._config) return;

    if (this.hass && this._overridesLoadedForEntity !== this._config.remote_entity) {
      this._overridesLoadedForEntity = this._config.remote_entity;
      this._appsOverride = null;
      this._uiSettingsOverride = null;
      this._loadOverrides(this._config.remote_entity);
    }

    if (!changed.has("hass")) return;

    const stateObj = this.hass.states[this._config.remote_entity];
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

  private _closeAppPicker = (e: CustomEvent<{ apps: AppShortcut[] | null } | undefined>): void => {
    this._appPickerOpen = false;
    // Missing detail = Cancel/dismiss, no change; otherwise a completed Save/Reset.
    if (e.detail) this._appsOverride = e.detail.apps;
  };

  private _openSettings = (): void => {
    this._settingsOpen = true;
  };

  private _closeSettings = (e: CustomEvent<{ settings: UiSettingsOverride | null } | undefined>): void => {
    this._settingsOpen = false;
    // Missing detail = Cancel/dismiss, no change; otherwise a completed Save/Reset.
    if (e.detail) this._uiSettingsOverride = e.detail.settings;
  };

  render() {
    const unavailable = this._showUnavailable;

    return html`
      <ha-card>
        <div class="card-header-row">
          <ha-icon-button .label=${"Settings"} @click=${this._openSettings}>
            <ha-icon icon="mdi:cog"></ha-icon>
          </ha-icon-button>
        </div>
        ${unavailable
          ? html`<div class="unavailable-banner">Shield is unavailable</div>`
          : ""}
        <div class="primary-controls">
          <shield-trackpad
            .hass=${this.hass}
            .entity=${this._config.remote_entity}
            .config=${{ ...this._config.trackpad, sensitivity: this._sensitivity }}
            .haptics=${this._config.haptics}
            .heightPx=${this._trackpadHeight}
            ?disabled=${unavailable}
          ></shield-trackpad>
          <shield-dpad-cluster
            .hass=${this.hass}
            .entity=${this._config.remote_entity}
            .haptics=${this._config.haptics}
            .buttonSizePx=${this._dpadButtonSize}
            ?disabled=${unavailable}
          ></shield-dpad-cluster>
        </div>
        <shield-button-row
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
          @open-text-input=${this._openTextInput}
          @open-app-launcher=${this._openAppLauncher}
        ></shield-button-row>
        <shield-media-row
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
        ></shield-media-row>
        ${this._config.media_player_entity
          ? html`<shield-volume-slider
              .hass=${this.hass}
              .entity=${this._config.media_player_entity}
              ?disabled=${unavailable}
            ></shield-volume-slider>`
          : ""}
        <shield-text-input-sheet
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .haptics=${this._config.haptics}
          .open=${this._textInputOpen}
          @text-input-closed=${this._closeTextInput}
        ></shield-text-input-sheet>
        <shield-app-launcher-dialog
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .apps=${this._apps}
          .haptics=${this._config.haptics}
          .open=${this._appLauncherOpen}
          @app-launcher-closed=${this._closeAppLauncher}
          @open-app-picker=${this._openAppPicker}
        ></shield-app-launcher-dialog>
        <shield-app-picker-dialog
          .hass=${this.hass}
          .open=${this._appPickerOpen}
          .remoteEntity=${this._config.remote_entity}
          .apps=${this._apps}
          .configDefaultApps=${this._config.apps ?? DEFAULT_APPS}
          @app-picker-closed=${this._closeAppPicker}
        ></shield-app-picker-dialog>
        <shield-settings-dialog
          .hass=${this.hass}
          .open=${this._settingsOpen}
          .remoteEntity=${this._config.remote_entity}
          .trackpadHeight=${this._trackpadHeight}
          .dpadButtonSize=${this._dpadButtonSize}
          .sensitivity=${this._sensitivity}
          @settings-closed=${this._closeSettings}
          @open-app-picker=${this._openAppPicker}
        ></shield-settings-dialog>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      container-type: inline-size;
      container-name: shield-remote-card;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--primary-text-color);
    }
    .card-header-row {
      display: flex;
      justify-content: flex-end;
      margin: -8px -8px -16px 0;
    }
    .card-header-row ha-icon-button {
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
    @container shield-remote-card (min-width: 420px) {
      .primary-controls {
        flex-direction: row;
        align-items: center;
      }
      .primary-controls shield-trackpad {
        flex: 1 1 55%;
      }
      .primary-controls shield-dpad-cluster {
        flex: 0 0 auto;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: ShieldRemoteCard;
  }
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: CARD_DESCRIPTION,
});
