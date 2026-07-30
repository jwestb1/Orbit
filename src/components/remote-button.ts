import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import type { KeyCode } from "../const";
import { triggerHaptic } from "../lib/haptics";
import { LongPressController } from "../lib/long-press";

// Single-icon remote button, generalized out of what used to be hardcoded
// per-button markup in button-row.ts/media-row.ts, so each button can be an
// independently addressable item in the card's grid layout (positioned and
// sized by orbit-remote-card.ts, not by this component).
//
// A button either sends a remote keycode (`keycode`, optionally with
// `holdSecs` for a long-press-and-hold command) or, for the two buttons
// that open a dialog instead of sending a command (keyboard, apps),
// dispatches `eventName` — never both.
@customElement("orbit-remote-button")
export class OrbitRemoteButton extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() icon = "";
  @property() label = "";
  @property({ attribute: false }) keycode?: KeyCode;
  @property({ type: Number }) holdSecs?: number;
  @property() haptic: "light" | "medium" = "light";
  @property() longPressHaptic: "light" | "medium" = "medium";
  @property({ type: Boolean, reflect: true }) danger = false;
  @property() eventName?: string;

  private _longPress = new LongPressController(() => this._sendLongPress());

  private _send(command: KeyCode, holdSecs?: number, haptic: "light" | "medium" = "light") {
    if (this.disabled) return;
    triggerHaptic(this.haptics, haptic);
    new HaService(this.hass, this.entity).sendCommand(command, holdSecs);
  }

  private _sendLongPress() {
    if (this.disabled || !this.keycode || !this.holdSecs) return;
    this._send(this.keycode, this.holdSecs, this.longPressHaptic);
  }

  private _onClick = (): void => {
    if (this.disabled) return;
    if (this._longPress.consumeClick()) return;
    if (this.eventName) {
      triggerHaptic(this.haptics, this.haptic);
      this.dispatchEvent(new CustomEvent(this.eventName, { bubbles: true, composed: true }));
      return;
    }
    if (this.keycode) this._send(this.keycode, undefined, this.haptic);
  };

  render() {
    return html`
      <button
        type="button"
        aria-label=${this.label}
        title=${this.label}
        ?disabled=${this.disabled}
        @pointerdown=${this._longPress.onPointerDown}
        @pointermove=${this._longPress.onPointerMove}
        @pointerup=${this._longPress.onPointerUp}
        @pointercancel=${this._longPress.onPointerUp}
        @click=${this._onClick}
      >
        <ha-icon icon=${this.icon}></ha-icon>
      </button>
    `;
  }

  // A plain native <button> instead of ha-icon-button: HA's own icon-button
  // paints a fixed-opacity currentColor circle behind its content on hover
  // with no CSS hook to disable it (see ha-icon-button.ts's `::after`
  // rule), so it can't be suppressed from here — only replaced.
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
    :host([disabled]) {
      opacity: 0.4;
      pointer-events: none;
    }
    :host([danger]) {
      color: var(--error-color, #db4437);
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
      --mdc-icon-size: 60%;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-remote-button": OrbitRemoteButton;
  }
}
