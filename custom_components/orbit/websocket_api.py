"""WebSocket API the Orbit Lovelace card uses to discover configured boxes
and global options.

Both commands are read-only and deliberately ungated — every signed-in
user, including non-admins actively using the remote, needs `list_boxes` to
render a device switcher or populate the dashboard-edit-mode picker. Box
lifecycle (add/remove/rename) and the factory reset are intentionally NOT
exposed here: they go through the config/options/subentry flows and the
`orbit.reset` service instead, which are already admin-gated for free by
living inside Settings > Devices & Services.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import (
    CONF_MEDIA_PLAYER_ENTITY_ID,
    CONF_REMOTE_ENTITY_ID,
    CONF_RESTRICT_ADMIN_ONLY,
    DEFAULT_RESTRICT_ADMIN_ONLY,
    DOMAIN,
    SUBENTRY_TYPE_BOX,
)


@callback
def async_setup_websocket_api(hass: HomeAssistant) -> None:
    """Register Orbit's websocket commands."""
    websocket_api.async_register_command(hass, ws_list_boxes)
    websocket_api.async_register_command(hass, ws_get_options)


def _parent_entry(hass: HomeAssistant):
    """Orbit's singleton config entry, if the integration is installed."""
    return next(iter(hass.config_entries.async_entries(DOMAIN)), None)


@websocket_api.websocket_command({vol.Required("type"): "orbit/list_boxes"})
@websocket_api.async_response
async def ws_list_boxes(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return every box configured in Orbit that this user can read."""
    boxes: list[dict[str, Any]] = []
    entry = _parent_entry(hass)
    if entry is not None:
        for subentry in entry.subentries.values():
            if subentry.subentry_type != SUBENTRY_TYPE_BOX:
                continue
            remote_entity_id = subentry.data[CONF_REMOTE_ENTITY_ID]
            if not connection.user.permissions.check_entity(remote_entity_id, POLICY_READ):
                continue
            boxes.append(
                {
                    "box_id": subentry.subentry_id,
                    "name": subentry.title,
                    "remote_entity_id": remote_entity_id,
                    "media_player_entity_id": subentry.data.get(CONF_MEDIA_PLAYER_ENTITY_ID),
                }
            )
    connection.send_result(msg["id"], {"boxes": boxes})


@websocket_api.websocket_command({vol.Required("type"): "orbit/get_options"})
@websocket_api.async_response
async def ws_get_options(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return whether Orbit is installed and its global options."""
    entry = _parent_entry(hass)
    connection.send_result(
        msg["id"],
        {
            "installed": entry is not None,
            "restrict_admin_only": (
                entry.options.get(CONF_RESTRICT_ADMIN_ONLY, DEFAULT_RESTRICT_ADMIN_ONLY)
                if entry is not None
                else DEFAULT_RESTRICT_ADMIN_ONLY
            ),
        },
    )
