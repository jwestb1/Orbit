import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { HaService } from "../lib/ha-service";
import { DEFAULT_APPS } from "../const";
import { triggerHaptic } from "../lib/haptics";
import type { AppShortcut } from "../types";

@customElement("orbit-app-grid")
export class OrbitAppGrid extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ attribute: false }) apps: AppShortcut[] = DEFAULT_APPS;
  @property({ type: Boolean }) haptics?: boolean;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _launch(app: AppShortcut) {
    if (this.disabled) return;
    triggerHaptic(this.haptics, "selection");
    new HaService(this.hass, this.entity).launchApp(app.package);
    this.dispatchEvent(new CustomEvent("app-launched", { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="grid">
        ${this.apps.map(
          (app) => html`
            <button class="tile" @click=${() => this._launch(app)} title=${app.name}>
              <ha-icon icon=${app.icon}></ha-icon>
              <span class="label">${app.name}</span>
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host([disabled]) .grid {
      opacity: 0.4;
      pointer-events: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 8px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px;
      min-height: 44px;
      border: none;
      border-radius: 8px;
      background: var(--secondary-background-color, #eee);
      color: var(--primary-text-color);
      cursor: pointer;
      font: inherit;
    }
    .tile:active {
      background: var(--divider-color, #ccc);
    }
    .label {
      font-size: 0.75em;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-app-grid": OrbitAppGrid;
  }
}
