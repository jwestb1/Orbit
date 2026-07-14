import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { KEYCODE } from "../const";
import { triggerHaptic } from "../lib/haptics";

@customElement("shield-media-row")
export class ShieldMediaRow extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _send(command: string) {
    if (this.disabled) return;
    triggerHaptic(this.haptics, "light");
    new HaService(this.hass, this.entity).sendCommand(command);
  }

  render() {
    return html`
      <div class="row">
        <ha-icon-button
          .label=${"Rewind"}
          @click=${() => this._send(KEYCODE.MEDIA_REWIND)}
        >
          <ha-icon icon="mdi:rewind"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          .label=${"Play/Pause"}
          @click=${() => this._send(KEYCODE.MEDIA_PLAY_PAUSE)}
        >
          <ha-icon icon="mdi:play-pause"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          .label=${"Fast forward"}
          @click=${() => this._send(KEYCODE.MEDIA_FAST_FORWARD)}
        >
          <ha-icon icon="mdi:fast-forward"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  static styles = css`
    :host([disabled]) .row {
      opacity: 0.4;
      pointer-events: none;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    ha-icon-button {
      --mdc-icon-button-size: 44px;
      transition: transform 80ms ease-out;
    }
    ha-icon-button:active {
      transform: scale(0.9);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-media-row": ShieldMediaRow;
  }
}
