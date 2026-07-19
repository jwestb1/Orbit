import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { fireEvent } from "custom-card-helpers";
import type { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import { DEFAULT_APPS, DEFAULT_TRACKPAD_SENSITIVITY_PX } from "./const";
import { tryListOrbitBoxes, type OrbitBox } from "./lib/orbit-backend";
import type { AppShortcut, BoxConfig, OrbitRemoteCardConfig } from "./types";

@customElement("orbit-remote-card-editor")
export class OrbitRemoteCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: OrbitRemoteCardConfig;
  // null until loaded, then either the Orbit-configured box list or an
  // empty array if Orbit isn't installed / has no boxes yet.
  @state() private _orbitBoxes: OrbitBox[] | null = null;

  private _orbitBoxesRequested = false;

  setConfig(config: OrbitRemoteCardConfig): void {
    this._config = config;
  }

  protected updated(changed: PropertyValues): void {
    if (this.hass && !this._orbitBoxesRequested) {
      this._orbitBoxesRequested = true;
      void tryListOrbitBoxes(this.hass).then((boxes) => {
        this._orbitBoxes = boxes ?? [];
      });
    }
    super.updated(changed);
  }

  private get _apps(): AppShortcut[] {
    return this._config?.apps ?? DEFAULT_APPS;
  }

  private get _mode(): "single" | "switcher" {
    return this._config?.mode ?? ((this._config?.boxes?.length ?? 0) > 0 ? "switcher" : "single");
  }

  private get _boxes(): BoxConfig[] {
    return this._config?.boxes ?? [];
  }

  private _emit(config: OrbitRemoteCardConfig): void {
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

  // Toggling to switcher mode seeds `boxes` from the existing single-box
  // fields (if any) so the user's current entity isn't silently dropped.
  private _switcherToggled = (e: Event): void => {
    if (!this._config) return;
    const checked = (e.target as HTMLInputElement).checked;
    const mode: "single" | "switcher" = checked ? "switcher" : "single";
    if (mode === "switcher" && this._boxes.length === 0 && this._config.remote_entity) {
      const seeded: BoxConfig[] = [
        { remote_entity: this._config.remote_entity, media_player_entity: this._config.media_player_entity },
      ];
      this._emit({ ...this._config, mode, boxes: seeded });
      return;
    }
    this._emit({ ...this._config, mode });
  };

  private _updateBoxName(index: number) {
    return (e: Event): void => {
      if (!this._config) return;
      const value = (e.target as HTMLInputElement).value;
      const boxes = this._boxes.map((b, i) => (i === index ? { ...b, name: value || undefined } : b));
      this._emit({ ...this._config, boxes });
    };
  }

  private _boxEntityChanged(index: number, field: "remote_entity" | "media_player_entity") {
    return (e: CustomEvent<{ value: string }>): void => {
      if (!this._config) return;
      const value = e.detail.value;
      const boxes = this._boxes.map((b, i) => (i === index ? { ...b, [field]: value || undefined } : b));
      this._emit({ ...this._config, boxes });
    };
  }

  private _removeBox(index: number): void {
    if (!this._config) return;
    const boxes = this._boxes.filter((_, i) => i !== index);
    this._emit({ ...this._config, boxes });
  }

  private _moveBox(index: number, direction: -1 | 1): void {
    if (!this._config) return;
    const target = index + direction;
    if (target < 0 || target >= this._boxes.length) return;
    const boxes = [...this._boxes];
    [boxes[index], boxes[target]] = [boxes[target], boxes[index]];
    this._emit({ ...this._config, boxes });
  }

  private _addBox(): void {
    if (!this._config) return;
    const boxes = [...this._boxes, { remote_entity: "" }];
    this._emit({ ...this._config, boxes });
  }

  // Convenience prefill from Orbit's configured boxes — never a live
  // binding. In single mode it fills the top-level entity fields; in
  // switcher mode it appends a new box (skipped if already added).
  private _useOrbitBox(box: OrbitBox): void {
    if (!this._config) return;
    if (this._mode === "single") {
      this._emit({
        ...this._config,
        remote_entity: box.remote_entity_id,
        media_player_entity: box.media_player_entity_id ?? undefined,
      });
      return;
    }
    if (this._boxes.some((b) => b.remote_entity === box.remote_entity_id)) return;
    const boxes: BoxConfig[] = [
      ...this._boxes,
      {
        name: box.name,
        remote_entity: box.remote_entity_id,
        media_player_entity: box.media_player_entity_id ?? undefined,
      },
    ];
    this._emit({ ...this._config, boxes });
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

    const orbitBoxes = this.hass.user?.is_admin ? this._orbitBoxes : null;

    return html`
      <div class="section">
        <ha-formfield .label=${"Multiple boxes (device switcher)"}>
          <ha-switch .checked=${this._mode === "switcher"} @change=${this._switcherToggled}></ha-switch>
        </ha-formfield>
      </div>

      ${orbitBoxes && orbitBoxes.length > 0
        ? html`
            <div class="section">
              <div class="section-title">Quick add from Orbit</div>
              <p class="hint">
                Boxes configured in Settings &rsaquo; Devices &amp; Services &rsaquo; Orbit.
              </p>
              <div class="orbit-boxes">
                ${orbitBoxes.map(
                  (box) => html`
                    <mwc-button outlined @click=${() => this._useOrbitBox(box)}>${box.name}</mwc-button>
                  `
                )}
              </div>
            </div>
          `
        : ""}

      ${this._mode === "single"
        ? html`
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
          `
        : html`
            <div class="section">
              <div class="section-title">Boxes</div>
              ${this._boxes.map(
                (box, index) => html`
                  <div class="box-row">
                    <ha-textfield
                      .label=${"Name"}
                      .value=${box.name ?? ""}
                      @input=${this._updateBoxName(index)}
                    ></ha-textfield>
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${box.remote_entity}
                      .label=${"Remote entity (required)"}
                      .includeDomains=${["remote"]}
                      @value-changed=${this._boxEntityChanged(index, "remote_entity")}
                    ></ha-entity-picker>
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${box.media_player_entity ?? ""}
                      .label=${"Media player (optional)"}
                      .includeDomains=${["media_player"]}
                      @value-changed=${this._boxEntityChanged(index, "media_player_entity")}
                    ></ha-entity-picker>
                    <ha-icon-button
                      .label=${"Move up"}
                      .disabled=${index === 0}
                      @click=${() => this._moveBox(index, -1)}
                    >
                      <ha-icon icon="mdi:arrow-up"></ha-icon>
                    </ha-icon-button>
                    <ha-icon-button
                      .label=${"Move down"}
                      .disabled=${index === this._boxes.length - 1}
                      @click=${() => this._moveBox(index, 1)}
                    >
                      <ha-icon icon="mdi:arrow-down"></ha-icon>
                    </ha-icon-button>
                    <ha-icon-button .label=${"Remove"} @click=${() => this._removeBox(index)}>
                      <ha-icon icon="mdi:delete"></ha-icon>
                    </ha-icon-button>
                  </div>
                `
              )}
              <ha-icon-button .label=${"Add box"} @click=${this._addBox}>
                <ha-icon icon="mdi:plus"></ha-icon>
              </ha-icon-button>
            </div>
          `}

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
    .box-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr auto auto auto;
      align-items: center;
      gap: 4px;
    }
    .hint {
      margin: 0;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .orbit-boxes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-remote-card-editor": OrbitRemoteCardEditor;
  }
}
