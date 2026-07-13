import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { MEDIA_PLAYER_FEATURE } from "../const";

@customElement("shield-volume-slider")
export class ShieldVolumeSlider extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) entity!: string;
  @property({ type: Boolean, reflect: true }) disabled = false;

  private _onInput(e: CustomEvent<{ value: number }>) {
    if (this.disabled) return;
    const value = e.detail.value;
    this.hass.callService(
      "media_player",
      "volume_set",
      { volume_level: value / 100 },
      { entity_id: this.entity }
    );
  }

  private _step(direction: "up" | "down") {
    if (this.disabled) return;
    this.hass.callService(
      "media_player",
      direction === "up" ? "volume_up" : "volume_down",
      {},
      { entity_id: this.entity }
    );
  }

  render() {
    const stateObj = this.hass?.states[this.entity];
    if (!stateObj) return nothing;

    const features = stateObj.attributes.supported_features ?? 0;
    const supportsSet = (features & MEDIA_PLAYER_FEATURE.VOLUME_SET) !== 0;
    const supportsStep = (features & MEDIA_PLAYER_FEATURE.VOLUME_STEP) !== 0;

    if (supportsSet) {
      const level = stateObj.attributes.volume_level;
      const value = typeof level === "number" ? Math.round(level * 100) : 0;
      return html`
        <ha-control-slider
          .value=${value}
          min="0"
          max="100"
          @value-changed=${this._onInput}
        ></ha-control-slider>
      `;
    }

    if (supportsStep) {
      return html`
        <div class="steps">
          <ha-icon-button .label=${"Volume down"} @click=${() => this._step("down")}>
            <ha-icon icon="mdi:volume-minus"></ha-icon>
          </ha-icon-button>
          <ha-icon-button .label=${"Volume up"} @click=${() => this._step("up")}>
            <ha-icon icon="mdi:volume-plus"></ha-icon>
          </ha-icon-button>
        </div>
      `;
    }

    return nothing;
  }

  static styles = css`
    :host([disabled]) ha-control-slider,
    :host([disabled]) .steps {
      opacity: 0.4;
      pointer-events: none;
    }
    ha-control-slider {
      --control-slider-color: var(--primary-color);
    }
    .steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "shield-volume-slider": ShieldVolumeSlider;
  }
}
