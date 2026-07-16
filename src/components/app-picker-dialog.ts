import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { saveOverride, clearOverride } from "../lib/app-shortcuts-storage";
import { DEFAULT_APPS } from "../const";
import type { AppShortcut } from "../types";

const CATALOG_PACKAGES = new Set(DEFAULT_APPS.map((app) => app.package));

// Lets the user toggle shortcuts on/off from the built-in default catalog
// and hand-edit custom package-based shortcuts, without leaving the
// dashboard's normal (non-edit) view.
@customElement("shield-app-picker-dialog")
export class ShieldAppPickerDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) remoteEntity!: string;
  @property({ attribute: false }) apps: AppShortcut[] = [];
  @property({ attribute: false }) configDefaultApps: AppShortcut[] = [];

  @state() private _draftApps: AppShortcut[] = [];

  protected updated(changed: Map<string, unknown>): void {
    // Only re-seed on the closed->open transition, so an in-flight hass
    // update while the dialog is open doesn't clobber unsaved edits.
    if (changed.has("open") && this.open) {
      this._draftApps = [...this.apps];
    }
  }

  private get _manualEntries(): AppShortcut[] {
    return this._draftApps.filter((a) => !CATALOG_PACKAGES.has(a.package));
  }

  private _replaceManualEntries(manual: AppShortcut[]): void {
    const catalogEntries = this._draftApps.filter((a) => CATALOG_PACKAGES.has(a.package));
    this._draftApps = [...catalogEntries, ...manual];
  }

  private _isCatalogChecked(pkg: string): boolean {
    return this._draftApps.some((a) => a.package === pkg);
  }

  private _catalogIcon(catalogApp: AppShortcut): string {
    return this._draftApps.find((a) => a.package === catalogApp.package)?.icon ?? catalogApp.icon;
  }

  private _toggleCatalog(catalogApp: AppShortcut, checked: boolean): void {
    if (checked) {
      this._draftApps = [...this._draftApps, { ...catalogApp }];
    } else {
      this._draftApps = this._draftApps.filter((a) => a.package !== catalogApp.package);
    }
  }

  private _updateCatalogIcon(pkg: string, icon: string): void {
    this._draftApps = this._draftApps.map((a) => (a.package === pkg ? { ...a, icon } : a));
  }

  private _updateManual(index: number, field: "name" | "package" | "icon") {
    return (e: Event): void => {
      const value = (e.target as HTMLInputElement).value;
      const manual = this._manualEntries.map((a, i) => (i === index ? { ...a, [field]: value } : a));
      this._replaceManualEntries(manual);
    };
  }

  private _moveManual(index: number, direction: -1 | 1): void {
    const manual = this._manualEntries;
    const target = index + direction;
    if (target < 0 || target >= manual.length) return;
    const next = [...manual];
    [next[index], next[target]] = [next[target], next[index]];
    this._replaceManualEntries(next);
  }

  private _removeManual(index: number): void {
    this._replaceManualEntries(this._manualEntries.filter((_, i) => i !== index));
  }

  private _addManual(): void {
    this._replaceManualEntries([...this._manualEntries, { name: "", icon: "mdi:apps", package: "" }]);
  }

  private _close = (): void => {
    this.dispatchEvent(new CustomEvent("app-picker-closed", { bubbles: true, composed: true }));
  };

  private _cancel = (): void => {
    this._close();
  };

  private _reset = (): void => {
    clearOverride(this.remoteEntity);
    this._close();
  };

  private _save = (): void => {
    const catalogEntries = DEFAULT_APPS.map((catalogApp) =>
      this._draftApps.find((a) => a.package === catalogApp.package)
    ).filter((a): a is AppShortcut => !!a);
    saveOverride(this.remoteEntity, [...catalogEntries, ...this._manualEntries]);
    this._close();
  };

  render() {
    if (!this.open) return html``;

    const manual = this._manualEntries;

    return html`
      <ha-dialog open .heading=${"Customize app shortcuts"} @closed=${this._close}>
        <div class="content">
          <p class="hint">Saved in this browser only — overrides the dashboard's configured app list.</p>

          <div class="section-title">Default apps</div>
          ${DEFAULT_APPS.map(
            (catalogApp) => html`
              <div class="source-row">
                <ha-formfield .label=${catalogApp.name}>
                  <ha-switch
                    .checked=${this._isCatalogChecked(catalogApp.package)}
                    @change=${(e: Event) =>
                      this._toggleCatalog(catalogApp, (e.target as HTMLInputElement).checked)}
                  ></ha-switch>
                </ha-formfield>
                ${this._isCatalogChecked(catalogApp.package)
                  ? html`
                      <ha-icon-picker
                        .hass=${this.hass}
                        .value=${this._catalogIcon(catalogApp)}
                        @value-changed=${(e: CustomEvent<{ value: string }>) =>
                          this._updateCatalogIcon(catalogApp.package, e.detail.value)}
                      ></ha-icon-picker>
                    `
                  : ""}
              </div>
            `
          )}

          <div class="section-title">Custom shortcuts</div>
          ${manual.map(
            (app, index) => html`
              <div class="app-row">
                <ha-icon-picker
                  .hass=${this.hass}
                  .value=${app.icon}
                  @value-changed=${(e: CustomEvent<{ value: string }>) => {
                    const next = manual.map((a, i) =>
                      i === index ? { ...a, icon: e.detail.value } : a
                    );
                    this._replaceManualEntries(next);
                  }}
                ></ha-icon-picker>
                <ha-textfield
                  .label=${"Name"}
                  .value=${app.name}
                  @input=${this._updateManual(index, "name")}
                ></ha-textfield>
                <ha-textfield
                  .label=${"Package ID"}
                  .value=${app.package}
                  @input=${this._updateManual(index, "package")}
                ></ha-textfield>
                <ha-icon-button
                  .label=${"Move up"}
                  .disabled=${index === 0}
                  @click=${() => this._moveManual(index, -1)}
                >
                  <ha-icon icon="mdi:arrow-up"></ha-icon>
                </ha-icon-button>
                <ha-icon-button
                  .label=${"Move down"}
                  .disabled=${index === manual.length - 1}
                  @click=${() => this._moveManual(index, 1)}
                >
                  <ha-icon icon="mdi:arrow-down"></ha-icon>
                </ha-icon-button>
                <ha-icon-button .label=${"Remove"} @click=${() => this._removeManual(index)}>
                  <ha-icon icon="mdi:delete"></ha-icon>
                </ha-icon-button>
              </div>
            `
          )}
          <ha-icon-button .label=${"Add custom shortcut"} @click=${this._addManual}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </ha-icon-button>
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
    .hint {
      margin: 0 0 4px;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .section-title {
      font-weight: 500;
      color: var(--secondary-text-color);
      margin-top: 8px;
    }
    .source-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .source-row ha-icon-picker {
      max-width: 120px;
    }
    .app-row {
      display: grid;
      grid-template-columns: 56px 1fr 1fr auto auto auto;
      align-items: center;
      gap: 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-app-picker-dialog": ShieldAppPickerDialog;
  }
}
