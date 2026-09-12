import { LitElement, html, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { triggerHaptic } from "../lib/haptics";

// Small keyboard sheet that surfaces the protocol's `text:` command prefix
// (spec §3.3) for typing into a focused search/login field on the box,
// without hand-rolling on-screen key-by-key IME emulation.
//
// This deliberately does NOT use ha-dialog/ha-textfield. Mobile browsers
// (iOS Safari in particular, per WebKit's own documented behavior) only
// raise the on-screen keyboard for a `.focus()` call that lands inside the
// *exact same synchronous callstack* as the user's tap, on an element that
// is already visible (not `display:none`/`opacity:0`) at that instant —
// see https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard.
// Any hop through a promise, microtask, `requestAnimationFrame`, or a CSS
// transition/animation callback breaks that link and the keyboard silently
// never appears. `ha-dialog` (mwc-dialog) is a LitElement itself, so even
// its own `dialogInitialFocus` autofocus — and our own previous attempt at
// focusing it from `updated()` — is inherently async relative to the tap,
// and its opening transition additionally starts the dialog at
// `opacity: 0`, which is one of the specific culprits browsers cite for
// suppressing the keyboard. Keeping this sheet as a plain, always-mounted
// native <input> that we show and focus with direct, synchronous DOM
// mutation (see `present()`) sidesteps all of that.
@customElement("orbit-text-input-sheet")
export class OrbitTextInputSheet extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean }) diagnostics?: boolean;
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private _value = "";

  @query("input.text-input") private _inputEl?: HTMLInputElement;

  // Call this directly, synchronously, from the tap handler that opens the
  // sheet (see orbit-remote-card.ts's `_openTextInput`) — do not route the
  // open+focus through a reactive property/`updated()` round trip, since
  // that reintroduces the async gap that breaks the mobile keyboard. The
  // `open` property is still set for consistency with the `.open=` binding
  // the parent also holds (so a later unrelated re-render doesn't stomp on
  // this), but the visible/focus effects below happen immediately via
  // direct DOM mutation rather than waiting on Lit's update cycle.
  present(): void {
    this.open = true;
    this.setAttribute("open", "");
    this._inputEl?.focus({ preventScroll: true });
  }

  private _close = (): void => {
    this.open = false;
    this.removeAttribute("open");
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
    if (e.key === "Enter") {
      e.preventDefault();
      this._send();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this._close();
    }
  };

  render() {
    // Always rendered (never conditionally removed from the DOM) so the
    // <input> already exists — and `present()`'s @query lookup can find
    // it — before the sheet is ever opened. Visibility is driven purely by
    // the `open` attribute in CSS below.
    return html`
      <div class="scrim" @click=${this._close}></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Type on device">
        <div class="header">Type on device</div>
        <div class="content">
          <input
            class="text-input"
            type="text"
            inputmode="text"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="Text"
            .value=${this._value}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
          />
          <p class="hint">
            Only works while a text field is focused on the device (e.g. a search box) —
            open one there first, then type here.
          </p>
        </div>
        <div class="actions">
          <button type="button" class="text-button" @click=${this._close}>Close</button>
          <button type="button" class="text-button primary" @click=${this._send}>Send</button>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 12;
      display: none;
      align-items: flex-end;
      justify-content: center;
    }
    :host([open]) {
      display: flex;
    }
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.32);
    }
    .sheet {
      position: relative;
      width: 100%;
      max-width: 420px;
      box-sizing: border-box;
      margin: 0 16px 16px;
      padding: 16px;
      border-radius: 16px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .header {
      font-size: 1.1em;
      font-weight: 500;
      margin-bottom: 12px;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .text-input {
      width: 100%;
      box-sizing: border-box;
      /* 16px keeps iOS Safari from auto-zooming the page on focus. */
      font-size: 16px;
      font-family: inherit;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #ccc);
      background: var(--primary-background-color, transparent);
      color: inherit;
    }
    .text-input:focus {
      outline: 2px solid var(--mdc-theme-primary, var(--primary-color, #03a9f4));
      outline-offset: -1px;
    }
    .hint {
      margin: 0;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 16px;
    }
    .text-button {
      all: unset;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.9em;
      font-weight: 500;
      color: var(--mdc-theme-primary, var(--primary-color, #03a9f4));
    }
    .text-button:hover {
      background: rgba(127, 127, 127, 0.15);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-text-input-sheet": OrbitTextInputSheet;
  }
}
