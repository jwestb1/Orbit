"""Tests for custom_components/orbit/websocket_api.py — the only runtime
surface the Orbit Lovelace card actually talks to.
"""

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import WebSocketGenerator

from custom_components.orbit.const import CONF_RESTRICT_ADMIN_ONLY, DOMAIN, SUBENTRY_TYPE_BOX


async def test_list_boxes_returns_configured_boxes(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    assert await async_setup_component(hass, DOMAIN, {})

    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id=DOMAIN,
        data={},
        options={},
        subentries_data=[
            {
                "data": {
                    "remote_entity_id": "remote.living_room",
                    "media_player_entity_id": "media_player.living_room",
                    "name": "Living Room",
                },
                "subentry_type": SUBENTRY_TYPE_BOX,
                "title": "Living Room",
                "unique_id": None,
            }
        ],
    )
    entry.add_to_hass(hass)

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "orbit/list_boxes"})
    response = await client.receive_json()

    assert response["success"]
    assert len(response["result"]["boxes"]) == 1
    box = response["result"]["boxes"][0]
    assert box["name"] == "Living Room"
    assert box["remote_entity_id"] == "remote.living_room"
    assert box["media_player_entity_id"] == "media_player.living_room"


async def test_list_boxes_empty_when_not_installed(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    assert await async_setup_component(hass, DOMAIN, {})

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "orbit/list_boxes"})
    response = await client.receive_json()

    assert response["success"]
    assert response["result"]["boxes"] == []


async def test_get_options_reports_not_installed_by_default(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    assert await async_setup_component(hass, DOMAIN, {})

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "orbit/get_options"})
    response = await client.receive_json()

    assert response["success"]
    assert response["result"] == {"installed": False, "restrict_admin_only": True}


async def test_get_options_reflects_entry_options(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> None:
    assert await async_setup_component(hass, DOMAIN, {})

    entry = MockConfigEntry(
        domain=DOMAIN, unique_id=DOMAIN, data={}, options={CONF_RESTRICT_ADMIN_ONLY: False}
    )
    entry.add_to_hass(hass)

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "orbit/get_options"})
    response = await client.receive_json()

    assert response["result"] == {"installed": True, "restrict_admin_only": False}
