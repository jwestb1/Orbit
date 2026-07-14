import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import "./components/trackpad";
import "./components/dpad-cluster";
import "./components/button-row";
import "./components/media-row";
import "./components/app-grid";
import "./components/volume-slider";
import "./components/text-input-sheet";
import "./editor";
import { CARD_DESCRIPTION, CARD_NAME, CARD_TYPE, DEFAULT_APPS, UNAVAILABLE_GRACE_MS } from "./const";
import type { ShieldRemoteCardConfig } from "./types";

@customElement(CARD_TYPE)
export class ShieldRemoteCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ShieldRemoteCardConfig;
  @state() private _showUnavailable = false;
  @state() private _textInputOpen = false;

  private _unavailableTimer?: number;

  setConfig(config: ShieldRemoteCardConfig): void {
    if (!config.remote_entity) {
      throw new Error("shield-remote-card: 'remote_entity' is required");
    }
    this._config = config;
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
    if (changed.has("_config") || changed.has("_showUnavailable") || changed.has("_textInputOpen"))
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
    if (!this._config || !changed.has("hass")) return;

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

  private _openTextInput = (): void => {
    this._textInputOpen = true;
  };

  private _closeTextInput = (): void => {
    this._textInputOpen = false;
  };

  render() {
    const unavailable = this._showUnavailable;

    return html`
      <ha-card>
        ${unavailable
          ? html`<div class="unavailable-banner">Shield is unavailable</div>`
          : ""}
        <div class="primary-controls">
          <shield-trackpad
            .hass=${this.hass}
            .entity=${this._config.remote_entity}
            .config=${this._config.trackpad ?? {}}
            .haptics=${this._config.haptics}
            ?disabled=${unavailable}
          ></shield-trackpad>
          <shield-dpad-cluster
            .hass=${this.hass}
            .entity=${this._config.remote_entity}
            .haptics=${this._config.haptics}
            ?disabled=${unavailable}
          ></shield-dpad-cluster>
        </div>
        <shield-button-row
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
          @open-text-input=${this._openTextInput}
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
        <shield-app-grid
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .apps=${this._config.apps ?? DEFAULT_APPS}
          .haptics=${this._config.haptics}
          ?disabled=${unavailable}
        ></shield-app-grid>
        <shield-text-input-sheet
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .haptics=${this._config.haptics}
          .open=${this._textInputOpen}
          @text-input-closed=${this._closeTextInput}
        ></shield-text-input-sheet>
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
