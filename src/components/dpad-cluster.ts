import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { DEFAULT_DPAD_BUTTON_SIZE_PX, DEFAULT_LONG_PRESS_HOLD_SECS, KEYCODE } from "../const";
import { triggerHaptic } from "../lib/haptics";
import { LongPressController } from "../lib/long-press";

@customElement("orbit-dpad-cluster")
export class OrbitDpadCluster extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Number }) buttonSizePx?: number;

  protected updated(changed: PropertyValues): void {
    if (changed.has("buttonSizePx")) {
      this.style.setProperty(
        "--orbit-dpad-button-size",
        `${this.buttonSizePx ?? DEFAULT_DPAD_BUTTON_SIZE_PX}px`
      );
    }
  }

  private _centerLongPress = new LongPressController(() =>
    this._send(KEYCODE.DPAD_CENTER, DEFAULT_LONG_PRESS_HOLD_SECS, "medium")
  );

  private _send(command: string, holdSecs?: number, haptic: "light" | "medium" = "light") {
    if (this.disabled) return;
    triggerHaptic(this.haptics, haptic);
    new HaService(this.hass, this.entity).sendCommand(command, holdSecs);
  }

  private _onCenterClick = () => {
    if (this._centerLongPress.consumeClick()) return;
    this._send(KEYCODE.DPAD_CENTER);
  };

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
          .label=${"Select (hold for long-press)"}
          @pointerdown=${this._centerLongPress.onPointerDown}
          @pointermove=${this._centerLongPress.onPointerMove}
          @pointerup=${this._centerLongPress.onPointerUp}
          @pointercancel=${this._centerLongPress.onPointerUp}
          @click=${this._onCenterClick}
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
      grid-template-columns: repeat(3, var(--orbit-dpad-button-size, 44px));
      grid-template-rows: repeat(3, var(--orbit-dpad-button-size, 44px));
      justify-content: center;
      align-content: center;
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
      --mdc-icon-button-size: var(--orbit-dpad-button-size, 44px);
      transition: transform 80ms ease-out;
    }
    ha-icon-button:active {
      transform: scale(0.9);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-dpad-cluster": OrbitDpadCluster;
  }
}
