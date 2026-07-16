import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import "./app-grid";
import { DEFAULT_APPS } from "../const";
import type { AppShortcut } from "../types";

// Single-button entry point for app shortcuts: tapping a tile launches the
// app and closes the dialog immediately, like a launcher menu.
@customElement("shield-app-launcher-dialog")
export class ShieldAppLauncherDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ attribute: false }) apps: AppShortcut[] = DEFAULT_APPS;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean }) open = false;

  private _close = (): void => {
    this.dispatchEvent(new CustomEvent("app-launcher-closed", { bubbles: true, composed: true }));
  };

  private _openCustomize = (): void => {
    this.dispatchEvent(new CustomEvent("open-app-picker", { bubbles: true, composed: true }));
    this._close();
  };

  render() {
    if (!this.open) return html``;
    return html`
      <ha-dialog open .heading=${"Apps"} @closed=${this._close}>
        <div class="content">
          <shield-app-grid
            .hass=${this.hass}
            .entity=${this.entity}
            .apps=${this.apps}
            .haptics=${this.haptics}
            @app-launched=${this._close}
          ></shield-app-grid>
        </div>
        <mwc-button slot="secondaryAction" @click=${this._openCustomize}>Customize</mwc-button>
        <mwc-button slot="primaryAction" @click=${this._close}>Close</mwc-button>
      </ha-dialog>
    `;
  }

  static styles = css`
    .content {
      min-width: 280px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-app-launcher-dialog": ShieldAppLauncherDialog;
  }
}
