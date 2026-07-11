import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant } from "custom-card-helpers";

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

  render() {
    const stateObj = this.hass?.states[this.entity];
    const level = stateObj?.attributes.volume_level;
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
    "shield-volume-slider": ShieldVolumeSlider;
  }
}
