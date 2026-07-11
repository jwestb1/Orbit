import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { DEFAULT_LONG_PRESS_HOLD_SECS, KEYCODE } from "../const";
import { triggerHaptic } from "../lib/haptics";
import { LongPressController } from "../lib/long-press";

@customElement("shield-button-row")
export class ShieldButtonRow extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _backLongPress = new LongPressController(() =>
    this._send(KEYCODE.BACK, DEFAULT_LONG_PRESS_HOLD_SECS, "medium")
  );
  private _homeLongPress = new LongPressController(() =>
    this._send(KEYCODE.HOME, DEFAULT_LONG_PRESS_HOLD_SECS, "medium")
  );

  private _send(command: string, holdSecs?: number, haptic: "light" | "medium" = "light") {
    if (this.disabled) return;
    triggerHaptic(this.haptics, haptic);
    new HaService(this.hass, this.entity).sendCommand(command, holdSecs);
  }

  private _onBackClick = () => {
    if (this._backLongPress.consumeClick()) return;
    this._send(KEYCODE.BACK);
  };

  private _onHomeClick = () => {
    if (this._homeLongPress.consumeClick()) return;
    this._send(KEYCODE.HOME);
  };

  render() {
    return html`
      <div class="row">
        <ha-icon-button
          .label=${"Back (hold for long-press)"}
          @pointerdown=${this._backLongPress.onPointerDown}
          @pointermove=${this._backLongPress.onPointerMove}
          @pointerup=${this._backLongPress.onPointerUp}
          @pointercancel=${this._backLongPress.onPointerUp}
          @click=${this._onBackClick}
        >
          <ha-icon icon="mdi:arrow-left"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          .label=${"Home (hold for long-press)"}
          @pointerdown=${this._homeLongPress.onPointerDown}
          @pointermove=${this._homeLongPress.onPointerMove}
          @pointerup=${this._homeLongPress.onPointerUp}
          @pointercancel=${this._homeLongPress.onPointerUp}
          @click=${this._onHomeClick}
        >
          <ha-icon icon="mdi:home"></ha-icon>
        </ha-icon-button>
        <ha-icon-button
          class="power"
          .label=${"Power"}
          @click=${() => this._send(KEYCODE.POWER, undefined, "medium")}
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
      transition: transform 80ms ease-out;
    }
    ha-icon-button:active {
      transform: scale(0.9);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-button-row": ShieldButtonRow;
  }
}
