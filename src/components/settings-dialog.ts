import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { saveUiSettings, clearUiSettings } from "../lib/ui-settings-storage";
import { clearOverride } from "../lib/app-shortcuts-storage";
import { debounce } from "../lib/debounce";
import { AUTOSAVE_DEBOUNCE_MS, DEFAULT_TRACKPAD_SENSITIVITY_PX } from "../const";

// Lets the user tune scroll speed and jump into the card's layout edit mode
// straight from the live dashboard, without entering dashboard edit mode.
// Slider edits apply live and auto-save (debounced) to the user's HA
// account — no explicit Save step. Mirrors orbit-app-picker-dialog's shape.
@customElement("orbit-settings-dialog")
export class OrbitSettingsDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) remoteEntity!: string;
  @property({ type: Number }) sensitivity = DEFAULT_TRACKPAD_SENSITIVITY_PX;

  @state() private _draftSensitivity = DEFAULT_TRACKPAD_SENSITIVITY_PX;
  @state() private _saving = false;
  @state() private _error: string | null = null;

  private _debouncedSave = debounce(() => {
    void this._commitSave();
  }, AUTOSAVE_DEBOUNCE_MS);

  protected updated(changed: Map<string, unknown>): void {
    // Only re-seed on the closed->open transition, so an in-flight prop
    // update while the dialog is open doesn't clobber unsaved edits.
    if (changed.has("open") && this.open) {
      this._draftSensitivity = this.sensitivity;
      this._saving = false;
      this._error = null;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._debouncedSave.cancel();
  }

  private _notifyChanged(): void {
    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: { settings: { sensitivity: this._draftSensitivity } },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _close = (): void => {
    this._debouncedSave.flush();
    this.dispatchEvent(new CustomEvent("settings-closed", { bubbles: true, composed: true }));
  };

  private async _commitSave(): Promise<void> {
    this._saving = true;
    this._error = null;
    const ok = await saveUiSettings(this.hass, this.remoteEntity, {
      sensitivity: this._draftSensitivity,
    });
    this._saving = false;
    if (!ok) {
      this._error = "Couldn't save settings — check your connection and try again.";
    }
  }

  private _reset = async (): Promise<void> => {
    this._debouncedSave.cancel();
    this._draftSensitivity = DEFAULT_TRACKPAD_SENSITIVITY_PX;
    this._notifyChanged();
    this._saving = true;
    this._error = null;
    const ok = await clearUiSettings(this.hass, this.remoteEntity);
    this._saving = false;
    if (!ok) {
      this._error = "Couldn't reset settings — check your connection and try again.";
    }
  };

  private _openAppPicker = (): void => {
    this.dispatchEvent(new CustomEvent("open-app-picker", { bubbles: true, composed: true }));
    this._close();
  };

  // Separate from _reset() (display settings) so one click never resets
  // more than the user asked for — app shortcuts and trackpad/D-pad sizing
  // are independent customizations with independent reset actions.
  private _resetApps = async (): Promise<void> => {
    this.dispatchEvent(new CustomEvent("apps-reset", { bubbles: true, composed: true }));
    this._saving = true;
    this._error = null;
    const ok = await clearOverride(this.hass, this.remoteEntity);
    this._saving = false;
    if (!ok) {
      this._error = "Couldn't reset app shortcuts — check your connection and try again.";
    }
  };

  // Hands off to orbit-remote-card.ts, which closes this dialog and jumps
  // back to the main card view in the wiggle/drag-and-drop edit mode.
  private _editLayout = (): void => {
    this._debouncedSave.flush();
    this.dispatchEvent(new CustomEvent("edit-layout-requested", { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent("settings-closed", { bubbles: true, composed: true }));
  };

  private _sensitivityChanged = (e: Event): void => {
    this._draftSensitivity = Number((e.target as HTMLInputElement).value);
    this._notifyChanged();
    this._debouncedSave();
  };

  render() {
    if (!this.open) return html``;

    return html`
      <ha-dialog open .heading=${"Settings"} @closed=${this._close}>
        <div class="content">
          <div class="section">
            <div class="section-title">Layout</div>
            <div class="button-row">
              <mwc-button @click=${this._editLayout}>Resize &amp; reorder buttons…</mwc-button>
            </div>
            <p class="hint">Drag to reorder, drag a corner to resize. Nothing can overlap.</p>
          </div>

          <div class="section">
            <div class="section-title">Scroll speed</div>
            <div class="slider-row">
              <input
                type="range"
                min="3"
                max="24"
                step="1"
                .value=${String(this._draftSensitivity)}
                @input=${this._sensitivityChanged}
              />
              <span class="slider-value">${this._draftSensitivity}px</span>
            </div>
            <p class="hint">Lower = faster/more sensitive. Higher = slower/more precise.</p>
          </div>

          <div class="section">
            <div class="section-title">App shortcuts</div>
            <div class="button-row">
              <mwc-button @click=${this._openAppPicker}>Customize…</mwc-button>
              <mwc-button @click=${this._resetApps}>Reset to default</mwc-button>
            </div>
          </div>

          <p class="hint">${this._saving ? "Saving…" : "Synced to your Home Assistant account."}</p>
          ${this._error ? html`<p class="hint error">${this._error}</p>` : ""}
        </div>
        <mwc-button slot="secondaryAction" @click=${this._reset}>Reset display settings</mwc-button>
        <mwc-button slot="primaryAction" @click=${this._close}>Close</mwc-button>
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
    .button-row {
      display: flex;
      gap: 8px;
    }
    .hint {
      margin: 0;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .hint.error {
      color: var(--error-color, #db4437);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-settings-dialog": OrbitSettingsDialog;
  }
}
