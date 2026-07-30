import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { DEFAULT_LONG_PRESS_HOLD_SECS, KEYCODE } from "../const";
import { triggerHaptic } from "../lib/haptics";
import { LongPressController } from "../lib/long-press";

// Sized entirely by its host's grid cell (see orbit-remote-card.ts) — the
// D-pad is a single draggable/resizable layout item, and its 5 sub-buttons
// always stay laid out in this internal 3x3 grid, stretching to fill
// whatever space the outer cell allocates.
@customElement("orbit-dpad-cluster")
export class OrbitDpadCluster extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;

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
        <button
          type="button"
          class="up"
          aria-label="Up"
          title="Up"
          @click=${() => this._send(KEYCODE.DPAD_UP)}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </button>
        <button
          type="button"
          class="left"
          aria-label="Left"
          title="Left"
          @click=${() => this._send(KEYCODE.DPAD_LEFT)}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </button>
        <button
          type="button"
          class="center"
          aria-label="Select (hold for long-press)"
          title="Select (hold for long-press)"
          @pointerdown=${this._centerLongPress.onPointerDown}
          @pointermove=${this._centerLongPress.onPointerMove}
          @pointerup=${this._centerLongPress.onPointerUp}
          @pointercancel=${this._centerLongPress.onPointerUp}
          @click=${this._onCenterClick}
        >
          <ha-icon icon="mdi:circle-medium"></ha-icon>
        </button>
        <button
          type="button"
          class="right"
          aria-label="Right"
          title="Right"
          @click=${() => this._send(KEYCODE.DPAD_RIGHT)}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </button>
        <button
          type="button"
          class="down"
          aria-label="Down"
          title="Down"
          @click=${() => this._send(KEYCODE.DPAD_DOWN)}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </button>
      </div>
    `;
  }

  // Plain native <button>s instead of ha-icon-button: HA's own icon-button
  // paints a fixed-opacity currentColor circle behind its content on hover
  // with no CSS hook to disable it (see ha-icon-button.ts's `::after`
  // rule), so it can't be suppressed from here — only replaced.
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
    :host([disabled]) .dpad {
      opacity: 0.4;
      pointer-events: none;
    }
    .dpad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      width: 100%;
      height: 100%;
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
    button {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      color: inherit;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform 80ms ease-out;
    }
    button:active {
      transform: scale(0.9);
    }
    ha-icon {
      --mdc-icon-size: 50%;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-dpad-cluster": OrbitDpadCluster;
  }
}
