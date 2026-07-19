import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ResolvedBox } from "../lib/box-resolver";

// Above this many boxes, tabs stop being a usable width and we fall back to
// a dropdown.
const TAB_THRESHOLD = 4;

// Tab/dropdown strip for switching which configured box the rest of the
// card's controls target. Renders nothing for 0-1 boxes (single-box mode
// has no switcher to show).
@customElement("orbit-box-switcher")
export class OrbitBoxSwitcher extends LitElement {
  @property({ attribute: false }) boxes: ResolvedBox[] = [];
  @property({ attribute: false }) activeId?: string;

  private _select(id: string): void {
    this.dispatchEvent(
      new CustomEvent("box-selected", { detail: { id }, bubbles: true, composed: true })
    );
  }

  private _onDropdownChange = (e: Event): void => {
    this._select((e.target as HTMLSelectElement).value);
  };

  render() {
    if (this.boxes.length <= 1) return html``;

    if (this.boxes.length > TAB_THRESHOLD) {
      return html`
        <select class="dropdown" .value=${this.activeId ?? ""} @change=${this._onDropdownChange}>
          ${this.boxes.map((box) => html`<option value=${box.id}>${box.name}</option>`)}
        </select>
      `;
    }

    return html`
      <div class="tabs" role="tablist">
        ${this.boxes.map(
          (box) => html`
            <button
              class="tab"
              role="tab"
              aria-selected=${box.id === this.activeId}
              ?active=${box.id === this.activeId}
              @click=${() => this._select(box.id)}
            >
              ${box.name}
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    .tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
    }
    .tab {
      flex: 0 0 auto;
      padding: 6px 12px;
      border: none;
      border-radius: 16px;
      background: var(--secondary-background-color, transparent);
      color: var(--secondary-text-color);
      font: inherit;
      font-size: 0.85em;
      cursor: pointer;
    }
    .tab[active] {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .dropdown {
      width: 100%;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font: inherit;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-box-switcher": OrbitBoxSwitcher;
  }
}
