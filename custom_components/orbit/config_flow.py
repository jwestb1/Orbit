"""Config flow for Orbit.

One singleton parent config entry ("Orbit"), with each Android TV box added
as a config subentry under it — one "Orbit" tile in Settings > Devices &
Services, boxes individually addable/removable/renamable underneath. See
custom_components/orbit/README.md for why this shape was chosen over one
config entry per box.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry, ConfigFlowResult, ConfigSubentryFlow
from homeassistant.core import callback

from .const import (
    CONF_MEDIA_PLAYER_ENTITY_ID,
    CONF_NAME,
    CONF_REMOTE_ENTITY_ID,
    CONF_RESTRICT_ADMIN_ONLY,
    DEFAULT_RESTRICT_ADMIN_ONLY,
    DOMAIN,
    SUBENTRY_TYPE_BOX,
)
from .discovery import DiscoveredBox, async_discover_boxes


class OrbitConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create the singleton Orbit parent entry. Boxes are added afterwards
    as subentries, via the "+" affordance HA shows on the entry's card."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Single confirmation step — Orbit itself has nothing to configure
        beyond its existence; box discovery happens in the subentry flow."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(
                title="Orbit",
                data={},
                options={CONF_RESTRICT_ADMIN_ONLY: DEFAULT_RESTRICT_ADMIN_ONLY},
            )

        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OrbitOptionsFlow:
        """Get the options flow for this handler."""
        return OrbitOptionsFlow()

    @classmethod
    @callback
    def async_get_supported_subentry_types(
        cls, config_entry: ConfigEntry
    ) -> dict[str, type[ConfigSubentryFlow]]:
        """Orbit supports one subentry type: a box."""
        return {SUBENTRY_TYPE_BOX: OrbitBoxSubentryFlow}


def _claimed_remote_entity_ids(entry: ConfigEntry) -> set[str]:
    """Remote entity ids already backing a box subentry on this entry."""
    return {
        subentry.data[CONF_REMOTE_ENTITY_ID]
        for subentry in entry.subentries.values()
        if subentry.subentry_type == SUBENTRY_TYPE_BOX
    }


def _candidate_schema(candidates: dict[str, DiscoveredBox | None], *, default: str | None = None) -> vol.Schema:
    entity_choices = {
        entity_id: (box.suggested_name if box else entity_id) for entity_id, box in candidates.items()
    }
    remote_key = (
        vol.Required(CONF_REMOTE_ENTITY_ID)
        if default is None
        else vol.Required(CONF_REMOTE_ENTITY_ID, default=default)
    )
    return vol.Schema(
        {
            remote_key: vol.In(entity_choices),
            vol.Optional(CONF_NAME): str,
        }
    )


class OrbitBoxSubentryFlow(ConfigSubentryFlow):
    """Add, or reconfigure, one box under the Orbit config entry."""

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Add a new box, picked from androidtv_remote entities not yet
        claimed by another box on this entry."""
        entry = self._get_entry()
        claimed = _claimed_remote_entity_ids(entry)
        candidates: dict[str, DiscoveredBox | None] = {
            box.remote_entity_id: box
            for box in async_discover_boxes(self.hass)
            if box.remote_entity_id not in claimed
        }

        if not candidates:
            return self.async_abort(reason="no_boxes_found")

        if user_input is not None:
            box = candidates[user_input[CONF_REMOTE_ENTITY_ID]]
            assert box is not None
            name = user_input.get(CONF_NAME) or box.suggested_name
            return self.async_create_entry(
                title=name,
                data={
                    CONF_REMOTE_ENTITY_ID: box.remote_entity_id,
                    CONF_MEDIA_PLAYER_ENTITY_ID: box.media_player_entity_id,
                    CONF_NAME: name,
                },
            )

        return self.async_show_form(step_id="user", data_schema=_candidate_schema(candidates))

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Rename a box or repoint it at a different remote entity."""
        entry = self._get_entry()
        subentry = self._get_reconfigure_subentry()
        current_entity_id = subentry.data[CONF_REMOTE_ENTITY_ID]

        claimed = _claimed_remote_entity_ids(entry) - {current_entity_id}
        candidates: dict[str, DiscoveredBox | None] = {
            box.remote_entity_id: box
            for box in async_discover_boxes(self.hass)
            if box.remote_entity_id not in claimed
        }
        # Always keep the box's current entity selectable, even if discovery
        # no longer reports it (e.g. the androidtv_remote entry is
        # temporarily unavailable) — reconfigure shouldn't lose the existing
        # selection out from under the user.
        candidates.setdefault(current_entity_id, None)

        if user_input is not None:
            remote_entity_id = user_input[CONF_REMOTE_ENTITY_ID]
            box = candidates.get(remote_entity_id)
            media_player_entity_id = (
                box.media_player_entity_id if box else subentry.data.get(CONF_MEDIA_PLAYER_ENTITY_ID)
            )
            name = user_input.get(CONF_NAME) or subentry.data.get(CONF_NAME) or remote_entity_id
            return self.async_update_and_abort(
                entry,
                subentry,
                title=name,
                data={
                    CONF_REMOTE_ENTITY_ID: remote_entity_id,
                    CONF_MEDIA_PLAYER_ENTITY_ID: media_player_entity_id,
                    CONF_NAME: name,
                },
            )

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=_candidate_schema(candidates, default=current_entity_id),
        )


class OrbitOptionsFlow(config_entries.OptionsFlow):
    """Global Orbit options: the admin-only gate, plus a factory-reset
    action. Both are inherently admin-only already, since this whole flow
    only lives inside Settings > Devices & Services, which HA's own RBAC
    restricts to admin users — no custom permission check needed here."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("factory_reset"):
                return await self.async_step_confirm_reset()
            return self.async_create_entry(
                title="", data={CONF_RESTRICT_ADMIN_ONLY: user_input[CONF_RESTRICT_ADMIN_ONLY]}
            )

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_RESTRICT_ADMIN_ONLY,
                    default=self.config_entry.options.get(
                        CONF_RESTRICT_ADMIN_ONLY, DEFAULT_RESTRICT_ADMIN_ONLY
                    ),
                ): bool,
                vol.Optional("factory_reset", default=False): bool,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)

    async def async_step_confirm_reset(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Danger-zone confirmation before wiping every user's synced card
        data and removing all boxes. See reset.py for what actually runs."""
        if user_input is not None:
            if user_input.get("confirm"):
                from .reset import async_reset_all

                await async_reset_all(self.hass)
                return self.async_abort(reason="reset_complete")
            return await self.async_step_init()

        return self.async_show_form(
            step_id="confirm_reset",
            data_schema=vol.Schema({vol.Required("confirm", default=False): bool}),
        )
