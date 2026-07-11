import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import "./components/trackpad";
import "./components/dpad-cluster";
import "./components/button-row";
import "./components/app-grid";
import "./components/volume-slider";
import { CARD_DESCRIPTION, CARD_NAME, CARD_TYPE, DEFAULT_APPS } from "./const";
import type { ShieldRemoteCardConfig } from "./types";

@customElement(CARD_TYPE)
export class ShieldRemoteCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ShieldRemoteCardConfig;

  setConfig(config: ShieldRemoteCardConfig): void {
    if (!config.remote_entity) {
      throw new Error("shield-remote-card: 'remote_entity' is required");
    }
    this._config = config;
  }

  static getStubConfig(): Partial<ShieldRemoteCardConfig> {
    return { remote_entity: "", media_player_entity: "" };
  }

  getCardSize(): number {
    return 6;
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (!this._config) return false;
    if (changed.has("_config")) return true;

    const oldHass = changed.get("hass") as HomeAssistant | undefined;
    if (!oldHass) return true;

    return (
      oldHass.states[this._config.remote_entity] !== this.hass.states[this._config.remote_entity] ||
      (!!this._config.media_player_entity &&
        oldHass.states[this._config.media_player_entity] !==
          this.hass.states[this._config.media_player_entity])
    );
  }

  render() {
    const stateObj = this.hass.states[this._config.remote_entity];
    const unavailable = !stateObj || stateObj.state === "unavailable";

    return html`
      <ha-card>
        ${unavailable
          ? html`<div class="unavailable-banner">Shield is unavailable</div>`
          : ""}
        <shield-trackpad
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          .config=${this._config.trackpad ?? {}}
          ?disabled=${unavailable}
        ></shield-trackpad>
        <shield-dpad-cluster
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          ?disabled=${unavailable}
        ></shield-dpad-cluster>
        <shield-button-row
          .hass=${this.hass}
          .entity=${this._config.remote_entity}
          ?disabled=${unavailable}
        ></shield-button-row>
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
          ?disabled=${unavailable}
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
    .unavailable-banner {
      font-size: 0.85em;
      color: var(--error-color, #db4437);
      text-align: center;
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
