import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { KEYCODE } from "../const";

@customElement("shield-button-row")
export class ShieldButtonRow extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _send(command: string) {
    if (this.disabled) return;
    new HaService(this.hass, this.entity).sendCommand(command);
  }

  render() {
    return html`
      <div class="row">
        <ha-icon-button .label=${"Back"} @click=${() => this._send(KEYCODE.BACK)}>
          <ha-icon icon="mdi:arrow-left"></ha-icon>
        </ha-icon-button>
        <ha-icon-button .label=${"Home"} @click=${() => this._send(KEYCODE.HOME)}>
          <ha-icon icon="mdi:home"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          class="power"
          .label=${"Power"}
          @click=${() => this._send(KEYCODE.POWER)}
        >
          <ha-icon icon="mdi:power"></ha-icon>
        </ha-icon-button>
        <ha-icon-button .label=${"Volume down"} @click=${() => this._send(KEYCODE.VOLUME_DOWN)}>
          <ha-icon icon="mdi:volume-minus"></ha-icon>
        </ha-icon-button>
        <ha-icon-button .label=${"Mute"} @click=${() => this._send(KEYCODE.VOLUME_MUTE)}>
          <ha-icon icon="mdi:volume-mute"></ha-icon>
        </ha-icon-button>
        <ha-icon-button .label=${"Volume up"} @click=${() => this._send(KEYCODE.VOLUME_UP)}>
          <ha-icon icon="mdi:volume-plus"></ha-icon>
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
      flex-wrap: wrap;
    }
    .power {
      color: var(--error-color, #db4437);
      margin: 0 8px;
    }
    ha-icon-button {
      --mdc-icon-button-size: 44px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-button-row": ShieldButtonRow;
  }
}
