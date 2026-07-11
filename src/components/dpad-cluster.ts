import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { KEYCODE } from "../const";

@customElement("shield-dpad-cluster")
export class ShieldDpadCluster extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _send(command: string) {
    if (this.disabled) return;
    new HaService(this.hass, this.entity).sendCommand(command);
  }

  render() {
    return html`
      <div class="dpad">
        <ha-icon-button
          class="up"
          .label=${"Up"}
          @click=${() => this._send(KEYCODE.DPAD_UP)}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          class="left"
          .label=${"Left"}
          @click=${() => this._send(KEYCODE.DPAD_LEFT)}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          class="center"
          .label=${"Select"}
          @click=${() => this._send(KEYCODE.DPAD_CENTER)}
        >
          <ha-icon icon="mdi:circle-medium"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          class="right"
          .label=${"Right"}
          @click=${() => this._send(KEYCODE.DPAD_RIGHT)}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          class="down"
          .label=${"Down"}
          @click=${() => this._send(KEYCODE.DPAD_DOWN)}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  static styles = css`
    :host([disabled]) .dpad {
      opacity: 0.4;
      pointer-events: none;
    }
    .dpad {
      display: grid;
      grid-template-columns: repeat(3, 44px);
      grid-template-rows: repeat(3, 44px);
      justify-content: center;
      gap: 4px;
    }
    .up {
      grid-column: 2;
      grid-row: 1;
    }
    .left {
      grid-column: 1;
      grid-row: 2;
    }
    .center {
      grid-column: 2;
      grid-row: 2;
      background: var(--secondary-background-color, #eee);
      border-radius: 50%;
    }
    .right {
      grid-column: 3;
      grid-row: 2;
    }
    .down {
      grid-column: 2;
      grid-row: 3;
    }
    ha-icon-button {
      --mdc-icon-button-size: 44px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-dpad-cluster": ShieldDpadCluster;
  }
}
