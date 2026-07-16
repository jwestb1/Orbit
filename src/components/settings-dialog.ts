import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { saveUiSettings, clearUiSettings } from "../lib/ui-settings-storage";
import {
  DEFAULT_DPAD_BUTTON_SIZE_PX,
  DEFAULT_TRACKPAD_HEIGHT_PX,
  DEFAULT_TRACKPAD_SENSITIVITY_PX,
} from "../const";
import type { UiSettingsOverride } from "../types";

// Lets the user resize the trackpad/d-pad and tune scroll speed straight
// from the live dashboard (saved per-browser), without entering dashboard
// edit mode. Mirrors shield-app-picker-dialog's draft/save/reset shape.
@customElement("shield-settings-dialog")
export class ShieldSettingsDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) remoteEntity!: string;
  @property({ type: Number }) trackpadHeight = DEFAULT_TRACKPAD_HEIGHT_PX;
  @property({ type: Number }) dpadButtonSize = DEFAULT_DPAD_BUTTON_SIZE_PX;
  @property({ type: Number }) sensitivity = DEFAULT_TRACKPAD_SENSITIVITY_PX;

  @state() private _draft: Required<UiSettingsOverride> = {
    trackpadHeight: DEFAULT_TRACKPAD_HEIGHT_PX,
    dpadButtonSize: DEFAULT_DPAD_BUTTON_SIZE_PX,
    sensitivity: DEFAULT_TRACKPAD_SENSITIVITY_PX,
  };

  protected updated(changed: Map<string, unknown>): void {
    // Only re-seed on the closed->open transition, so an in-flight prop
    // update while the dialog is open doesn't clobber unsaved edits.
    if (changed.has("open") && this.open) {
      this._draft = {
        trackpadHeight: this.trackpadHeight,
        dpadButtonSize: this.dpadButtonSize,
        sensitivity: this.sensitivity,
      };
    }
  }

  private _close = (): void => {
    this.dispatchEvent(new CustomEvent("settings-closed", { bubbles: true, composed: true }));
  };

  private _cancel = (): void => {
    this._close();
  };

  private _reset = (): void => {
    clearUiSettings(this.remoteEntity);
    this._close();
  };

  private _save = (): void => {
    saveUiSettings(this.remoteEntity, this._draft);
    this._close();
  };

  private _openAppPicker = (): void => {
    this.dispatchEvent(new CustomEvent("open-app-picker", { bubbles: true, composed: true }));
    this._close();
  };

  private _sliderChanged(field: keyof UiSettingsOverride) {
    return (e: Event): void => {
      const value = Number((e.target as HTMLInputElement).value);
      this._draft = { ...this._draft, [field]: value };
    };
  }

  render() {
    if (!this.open) return html``;

    return html`
      <ha-dialog open .heading=${"Settings"} @closed=${this._close}>
        <div class="content">
          <div class="section">
            <div class="section-title">Trackpad size</div>
            <div class="slider-row">
              <input
                type="range"
                min="120"
                max="320"
                step="10"
                .value=${String(this._draft.trackpadHeight)}
                @input=${this._sliderChanged("trackpadHeight")}
              />
              <span class="slider-value">${this._draft.trackpadHeight}px</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">D-pad size</div>
            <div class="slider-row">
              <input
                type="range"
                min="32"
                max="64"
                step="2"
                .value=${String(this._draft.dpadButtonSize)}
                @input=${this._sliderChanged("dpadButtonSize")}
              />
              <span class="slider-value">${this._draft.dpadButtonSize}px</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Scroll speed</div>
            <div class="slider-row">
              <input
                type="range"
                min="3"
                max="24"
                step="1"
                .value=${String(this._draft.sensitivity)}
                @input=${this._sliderChanged("sensitivity")}
              />
              <span class="slider-value">${this._draft.sensitivity}px</span>
            </div>
            <p class="hint">Lower = faster/more sensitive. Higher = slower/more precise.</p>
          </div>

          <div class="section">
            <mwc-button @click=${this._openAppPicker}>Customize app shortcuts…</mwc-button>
          </div>

          <p class="hint">Saved in this browser only.</p>
        </div>
        <mwc-button slot="secondaryAction" @click=${this._cancel}>Cancel</mwc-button>
        <mwc-button slot="secondaryAction" @click=${this._reset}>Reset to default</mwc-button>
        <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
      </ha-dialog>
    `;
  }

  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 280px;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .section-title {
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    .slider-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .slider-row input[type="range"] {
      flex: 1;
    }
    .slider-value {
      min-width: 3.5em;
      text-align: right;
      color: var(--secondary-text-color);
    }
    .hint {
      margin: 0;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-settings-dialog": ShieldSettingsDialog;
  }
}
