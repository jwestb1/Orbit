import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { GestureEngine } from "../lib/gesture-engine";
import { triggerHaptic } from "../lib/haptics";
import { DEFAULT_TRACKPAD_HEIGHT_PX } from "../const";
import type { TrackpadConfig } from "../types";

const LONG_PRESS_MS = 500;
const TAP_MOVE_THRESHOLD_PX = 4;

@customElement("shield-trackpad")
export class ShieldTrackpad extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ attribute: false }) config: TrackpadConfig = {};
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Number }) heightPx?: number;

  @state() private _pressed = false;

  private _service?: HaService;
  private _serviceEntity?: string;
  private _engine?: GestureEngine;
  private _longPressTimer?: number;
  private _longPressFired = false;
  private _downX = 0;
  private _downY = 0;
  private _activePointers = 0;

  protected updated(changed: PropertyValues): void {
    if (changed.has("heightPx")) {
      this.style.setProperty("--shield-trackpad-height", `${this.heightPx ?? DEFAULT_TRACKPAD_HEIGHT_PX}px`);
    }
  }

  private _getService(): HaService {
    if (!this._service || this._serviceEntity !== this.entity) {
      this._service = new HaService(this.hass, this.entity);
      this._serviceEntity = this.entity;
      this._engine = undefined;
    }
    return this._service;
  }

  private _getEngine(): GestureEngine {
    const service = this._getService();
    if (!this._engine) {
      this._engine = new GestureEngine(
        (code, holdSecs) => {
          triggerHaptic(this.haptics, holdSecs ? "medium" : "selection");
          service.sendCommand(code, holdSecs);
        },
        this.config.sensitivity
      );
    }
    return this._engine;
  }

  private _onPointerDown = (e: PointerEvent) => {
    if (this.disabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this._activePointers += 1;
    this._pressed = true;
    this._downX = e.clientX;
    this._downY = e.clientY;
    this._longPressFired = false;
    this._getEngine().onPointerDown(e.clientX, e.clientY);

    this._longPressTimer = window.setTimeout(() => {
      this._longPressFired = true;
      this._getEngine().onLongPress();
    }, LONG_PRESS_MS);
  };

  private _onPointerMove = (e: PointerEvent) => {
    if (this.disabled || !this._pressed) return;
    this._getEngine().onPointerMove(e.clientX, e.clientY);
    const dx = e.clientX - this._downX;
    const dy = e.clientY - this._downY;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
      window.clearTimeout(this._longPressTimer);
    }
  };

  private _onPointerUp = (e: PointerEvent) => {
    if (this.disabled) return;
    window.clearTimeout(this._longPressTimer);
    this._activePointers = Math.max(0, this._activePointers - 1);
    this._pressed = false;

    if (this._longPressFired) return;

    const dx = e.clientX - this._downX;
    const dy = e.clientY - this._downY;
    if (Math.hypot(dx, dy) <= TAP_MOVE_THRESHOLD_PX) {
      if (this._activePointers >= 1) {
        this._getEngine().onTwoFingerTap();
      } else {
        this._getEngine().onTap();
      }
    }
  };

  render() {
    return html`
      <div
        class="pad ${this._pressed ? "pressed" : ""}"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
      >
        <span class="hint">${this.disabled ? "Unavailable" : "Swipe to navigate · Tap to select"}</span>
      </div>
    `;
  }

  static styles = css`
    :host([disabled]) .pad {
      opacity: 0.4;
      pointer-events: none;
    }
    .pad {
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      height: var(--shield-trackpad-height, 180px);
      border-radius: 12px;
      background: var(--secondary-background-color, #eee);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 80ms ease-out;
    }
    .pad.pressed {
      background: var(--divider-color, #ccc);
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-trackpad": ShieldTrackpad;
  }
}
