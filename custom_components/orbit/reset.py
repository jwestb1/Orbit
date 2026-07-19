"""Factory reset: clears every user's synced Orbit card data, then removes
Orbit's config entries (and every box subentry along with them).
"""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant

from .const import DOMAIN, FRONTEND_APPS_KEY_PREFIX, FRONTEND_UI_SETTINGS_KEY_PREFIX

_LOGGER = logging.getLogger(__name__)

_PREFIXES = (FRONTEND_APPS_KEY_PREFIX, FRONTEND_UI_SETTINGS_KEY_PREFIX)


async def async_reset_all_users(hass: HomeAssistant) -> None:
    """Best-effort sweep of every HA user's synced Orbit card data.

    Writes {"data": None} rather than a bare None, matching the envelope
    the card's own setUserData() writes (src/lib/user-data-storage.ts) — a
    bare None would make the card's getUserData() treat the key as "never
    set" instead of "explicitly reset," risking a stale legacy-localStorage
    value being resurrected on that user's next load.

    homeassistant.components.frontend.storage is an internal module of the
    frontend component, not a documented cross-integration API, so this
    degrades to a warning (config entries are still removed) if a future HA
    release moves or removes it.
    """
    try:
        from homeassistant.components.frontend.storage import async_user_store
    except ImportError:
        _LOGGER.warning(
            "Could not import homeassistant.components.frontend.storage; "
            "skipping the per-user card data sweep. Config entries will "
            "still be removed."
        )
        return

    for user in await hass.auth.async_get_users():
        store = await async_user_store(hass, user.id)
        stale_keys = [key for key in store.data if key.startswith(_PREFIXES)]
        for key in stale_keys:
            await store.async_set_item(key, {"data": None})


async def async_reset_all(hass: HomeAssistant) -> None:
    """Full factory reset, triggered from the options flow's danger-zone
    step or the `orbit.reset` service."""
    await async_reset_all_users(hass)
    for entry in hass.config_entries.async_entries(DOMAIN):
        await hass.config_entries.async_remove(entry.entry_id)
