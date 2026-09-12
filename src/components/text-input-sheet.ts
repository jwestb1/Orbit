import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { triggerHaptic } from "../lib/haptics";

// Small keyboard sheet that surfaces the protocol's `text:` command prefix
// (spec §3.3) for typing into a focused search/login field on the box,
// without hand-rolling on-screen key-by-key IME emulation.
@customElement("orbit-text-input-sheet")
export class OrbitTextInputSheet extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean }) diagnostics?: boolean;
  @property({ type: Boolean }) open = false;

  @state() private _value = "";

  private _close = (): void => {
    this._value = "";
    this.dispatchEvent(new CustomEvent("text-input-closed", { bubbles: true, composed: true }));
  };

  private _onInput = (e: Event): void => {
    this._value = (e.target as HTMLInputElement).value;
  };

  private _send = (): void => {
    const text = this._value.trim();
    if (!text) return;
    triggerHaptic(this.haptics, "light");
    new HaService(this.hass, this.entity, this.diagnostics).sendCommand(`text:${text}`);
    this._value = "";
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    this._send();
  };

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("open") && this.open) void this._focusInput();
  }

  // ha-dialog's own `dialogInitialFocus` handling only calls .focus() once
  // its opening animation finishes, which lands too late for mobile
  // browsers to treat as part of the tap that opened the sheet — so the
  // on-screen keyboard never appears. Focusing here, as soon as the field
  // exists (a couple of microtask hops from that tap, no animation wait),
  // stays inside the window mobile browsers still attribute to the user
  // gesture. `dialogInitialFocus` stays on the field below as a harmless
  // fallback (and to keep the dialog's own focus trap targeting it instead
  // of the dialog surface once the animation completes).
  private async _focusInput(): Promise<void> {
    const field = this.shadowRoot?.querySelector("ha-textfield") as
      | (HTMLElement & { focus?: () => void; updateComplete?: Promise<unknown> })
      | null;
    if (!field) return;
    if (field.updateComplete) await field.updateComplete;
    field.focus?.();
  }

  render() {
    if (!this.open) return html``;
    return html`
      <ha-dialog open .heading=${"Type on device"} @closed=${this._close}>
        <div class="content">
          <ha-textfield
            dialogInitialFocus
            .label=${"Text"}
            .value=${this._value}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
          ></ha-textfield>
          <p class="hint">
            Only works while a text field is focused on the device (e.g. a search box) —
            open one there first, then type here.
          </p>
        </div>
        <mwc-button slot="secondaryAction" @click=${this._close}>Close</mwc-button>
        <mwc-button slot="primaryAction" @click=${this._send}>Send</mwc-button>
      </ha-dialog>
    `;
  }

  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 260px;
    }
    ha-textfield {
      width: 100%;
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
    "orbit-text-input-sheet": OrbitTextInputSheet;
  }
}
