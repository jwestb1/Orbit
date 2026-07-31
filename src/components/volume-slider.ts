import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";
import { MEDIA_PLAYER_FEATURE } from "../const";

@customElement("orbit-volume-slider")
export class OrbitVolumeSlider extends LitElement {
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

  render() {
    const stateObj = this.hass?.states[this.entity];
    if (!stateObj) return nothing;

    const features = stateObj.attributes.supported_features ?? 0;
    const supportsSet = (features & MEDIA_PLAYER_FEATURE.VOLUME_SET) !== 0;

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

    return nothing;
  }

  static styles = css`
    :host([disabled]) ha-control-slider {
      opacity: 0.4;
      pointer-events: none;
    }
    ha-control-slider {
      --control-slider-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "orbit-volume-slider": OrbitVolumeSlider;
  }
}
