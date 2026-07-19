"""The Orbit integration.

Config/bookkeeping only — Orbit never talks to a box directly. All actual
remote control (D-pad, volume, app launch) is done by the Orbit Lovelace
card via the existing remote.send_command / media_player.* services the
core androidtv_remote integration already exposes; see
src/lib/ha-service.ts. This integration exists solely to give box setup and
management a home under Settings > Devices & Services, and to back the
card's box picker / device-switcher UI.
"""

from __future__ import annotations

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .reset import async_reset_all
from .websocket_api import async_setup_websocket_api

SERVICE_RESET = "reset"

# No entity platforms — see module docstring.
PLATFORMS: list[str] = []


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up Orbit. Config-entry only; no YAML configuration is supported."""
    async_setup_websocket_api(hass)

    async def _handle_reset(call: ServiceCall) -> None:
        await async_reset_all(hass)

    hass.services.async_register(DOMAIN, SERVICE_RESET, _handle_reset, schema=vol.Schema({}))
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Orbit from a config entry.

    Nothing to initialize per-entry: boxes exist only as subentry data that
    the frontend card reads over the websocket API (websocket_api.py).
    """
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry. No platforms were ever forwarded to unload."""
    return True
