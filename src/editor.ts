import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { fireEvent } from "custom-card-helpers";
import type { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import { DEFAULT_APPS, DEFAULT_TRACKPAD_SENSITIVITY_PX } from "./const";
import type { AppShortcut, ShieldRemoteCardConfig } from "./types";

@customElement("shield-remote-card-editor")
export class ShieldRemoteCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: ShieldRemoteCardConfig;

  setConfig(config: ShieldRemoteCardConfig): void {
    this._config = config;
  }

  private get _apps(): AppShortcut[] {
    return this._config?.apps ?? DEFAULT_APPS;
  }

  private _emit(config: ShieldRemoteCardConfig): void {
    this._config = config;
    fireEvent(this, "config-changed", { config });
  }

  private _entityChanged(key: "remote_entity" | "media_player_entity") {
    return (e: CustomEvent<{ value: string }>): void => {
      if (!this._config) return;
      const value = e.detail.value;
      const config = { ...this._config, [key]: value || undefined };
      this._emit(config);
    };
  }

  private _sensitivityChanged(e: Event): void {
    if (!this._config) return;
    const value = Number((e.target as HTMLInputElement).value);
    this._emit({
      ...this._config,
      trackpad: { ...this._config.trackpad, sensitivity: value },
    });
  }

  private _hapticsChanged(e: Event): void {
    if (!this._config) return;
    const checked = (e.target as HTMLInputElement).checked;
    this._emit({ ...this._config, haptics: checked });
  }

  private _updateApp(index: number, field: keyof AppShortcut) {
    return (e: Event): void => {
      if (!this._config) return;
      const value = (e.target as HTMLInputElement).value;
      const apps = this._apps.map((app, i) => (i === index ? { ...app, [field]: value } : app));
      this._emit({ ...this._config, apps });
    };
  }

  private _removeApp(index: number): void {
    if (!this._config) return;
    const apps = this._apps.filter((_, i) => i !== index);
    this._emit({ ...this._config, apps });
  }

  private _moveApp(index: number, direction: -1 | 1): void {
    if (!this._config) return;
    const target = index + direction;
    if (target < 0 || target >= this._apps.length) return;
    const apps = [...this._apps];
    [apps[index], apps[target]] = [apps[target], apps[index]];
    this._emit({ ...this._config, apps });
  }

  private _addApp(): void {
    if (!this._config) return;
    const apps = [...this._apps, { name: "", icon: "mdi:apps", package: "" }];
    this._emit({ ...this._config, apps });
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const sensitivity = this._config.trackpad?.sensitivity ?? DEFAULT_TRACKPAD_SENSITIVITY_PX;
    const haptics = this._config.haptics ?? true;

    return html`
      <div class="section">
        <div class="section-title">Entities</div>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config.remote_entity ?? ""}
          .label=${"Remote entity (required)"}
          .includeDomains=${["remote"]}
          @value-changed=${this._entityChanged("remote_entity")}
        ></ha-entity-picker>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config.media_player_entity ?? ""}
          .label=${"Media player entity (optional, for volume)"}
          .includeDomains=${["media_player"]}
          @value-changed=${this._entityChanged("media_player_entity")}
        ></ha-entity-picker>
      </div>

      <div class="section">
        <div class="section-title">Trackpad sensitivity</div>
        <div class="sensitivity-row">
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            .value=${String(sensitivity)}
            @change=${this._sensitivityChanged}
          />
          <span class="sensitivity-value">${sensitivity}px</span>
        </div>
      </div>

      <div class="section">
        <ha-formfield .label=${"Haptic feedback"}>
          <ha-switch .checked=${haptics} @change=${this._hapticsChanged}></ha-switch>
        </ha-formfield>
      </div>

      <div class="section">
        <div class="section-title">App shortcuts</div>
        ${this._apps.map(
          (app, index) => html`
            <div class="app-row">
              <ha-icon-picker
                .hass=${this.hass}
                .value=${app.icon}
                @value-changed=${(e: CustomEvent<{ value: string }>) => {
                  const apps = this._apps.map((a, i) =>
                    i === index ? { ...a, icon: e.detail.value } : a
                  );
                  this._emit({ ...this._config!, apps });
                }}
              ></ha-icon-picker>
              <ha-textfield
                .label=${"Name"}
                .value=${app.name}
                @input=${this._updateApp(index, "name")}
              ></ha-textfield>
              <ha-textfield
                .label=${"Package ID"}
                .value=${app.package}
                @input=${this._updateApp(index, "package")}
              ></ha-textfield>
              <ha-icon-button
                .label=${"Move up"}
                .disabled=${index === 0}
                @click=${() => this._moveApp(index, -1)}
              >
                <ha-icon icon="mdi:arrow-up"></ha-icon>
              </ha-icon-button>
              <ha-icon-button
                .label=${"Move down"}
                .disabled=${index === this._apps.length - 1}
                @click=${() => this._moveApp(index, 1)}
              >
                <ha-icon icon="mdi:arrow-down"></ha-icon>
              </ha-icon-button>
              <ha-icon-button .label=${"Remove"} @click=${() => this._removeApp(index)}>
                <ha-icon icon="mdi:delete"></ha-icon>
              </ha-icon-button>
            </div>
          `
        )}
        <ha-icon-button .label=${"Add app"} @click=${this._addApp}>
          <ha-icon icon="mdi:plus"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title {
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    .sensitivity-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sensitivity-row input[type="range"] {
      flex: 1;
    }
    .sensitivity-value {
      min-width: 3em;
      text-align: right;
      color: var(--secondary-text-color);
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
    "shield-remote-card-editor": ShieldRemoteCardEditor;
  }
}
