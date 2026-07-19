"""Tests for custom_components/orbit/discovery.py against real HA registries."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.orbit.discovery import async_discover_boxes


async def test_discovers_androidtv_remote_boxes_with_media_player_sibling(hass: HomeAssistant) -> None:
    """A remote + media_player pair on the same device, from androidtv_remote,
    is reported as one box with both entity ids."""
    androidtv_entry = MockConfigEntry(domain="androidtv_remote")
    androidtv_entry.add_to_hass(hass)

    device_registry = dr.async_get(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=androidtv_entry.entry_id,
        identifiers={("androidtv_remote", "living_room_shield")},
        name="Living Room Shield",
    )

    entity_registry = er.async_get(hass)
    remote = entity_registry.async_get_or_create(
        "remote",
        "androidtv_remote",
        "living_room_shield_remote",
        device_id=device.id,
        suggested_object_id="living_room_shield",
    )
    media_player = entity_registry.async_get_or_create(
        "media_player",
        "androidtv_remote",
        "living_room_shield_media_player",
        device_id=device.id,
        suggested_object_id="living_room_shield",
    )

    boxes = async_discover_boxes(hass)

    assert len(boxes) == 1
    box = boxes[0]
    assert box.remote_entity_id == remote.entity_id
    assert box.media_player_entity_id == media_player.entity_id
    assert box.suggested_name == "Living Room Shield"
    assert box.device_id == device.id


async def test_ignores_remote_entities_from_other_platforms(hass: HomeAssistant) -> None:
    """A remote.* entity from an unrelated integration (Harmony, Roku, ...)
    must never be offered as an Orbit box."""
    entity_registry = er.async_get(hass)
    entity_registry.async_get_or_create(
        "remote", "harmony", "living_room_harmony", suggested_object_id="living_room_harmony"
    )

    assert async_discover_boxes(hass) == []


async def test_ignores_media_player_only_entities(hass: HomeAssistant) -> None:
    """A bare media_player.* entity with no matching remote.* is not a box —
    Orbit's card needs the remote entity to send commands at all."""
    entity_registry = er.async_get(hass)
    entity_registry.async_get_or_create(
        "media_player", "androidtv_remote", "orphan_media_player", suggested_object_id="orphan"
    )

    assert async_discover_boxes(hass) == []


async def test_falls_back_to_entity_name_without_a_device(hass: HomeAssistant) -> None:
    """A box with no device (or an unnamed device) still gets a usable
    suggested_name rather than failing discovery entirely."""
    entity_registry = er.async_get(hass)
    remote = entity_registry.async_get_or_create(
        "remote", "androidtv_remote", "no_device_remote", suggested_object_id="bedroom_box"
    )

    boxes = async_discover_boxes(hass)

    assert len(boxes) == 1
    assert boxes[0].remote_entity_id == remote.entity_id
    assert boxes[0].media_player_entity_id is None
    assert boxes[0].device_id is None
    assert boxes[0].suggested_name == remote.entity_id


async def test_discovers_multiple_independent_boxes(hass: HomeAssistant) -> None:
    """Two separate androidtv_remote boxes are both reported, each with only
    its own sibling media_player (no cross-box leakage)."""
    androidtv_entry = MockConfigEntry(domain="androidtv_remote")
    androidtv_entry.add_to_hass(hass)
    device_registry = dr.async_get(hass)
    entity_registry = er.async_get(hass)

    device_a = device_registry.async_get_or_create(
        config_entry_id=androidtv_entry.entry_id,
        identifiers={("androidtv_remote", "box_a")},
        name="Box A",
    )
    device_b = device_registry.async_get_or_create(
        config_entry_id=androidtv_entry.entry_id,
        identifiers={("androidtv_remote", "box_b")},
        name="Box B",
    )
    entity_registry.async_get_or_create(
        "remote", "androidtv_remote", "remote_a", device_id=device_a.id, suggested_object_id="box_a"
    )
    entity_registry.async_get_or_create(
        "remote", "androidtv_remote", "remote_b", device_id=device_b.id, suggested_object_id="box_b"
    )

    boxes = {box.remote_entity_id: box for box in async_discover_boxes(hass)}

    assert len(boxes) == 2
    assert boxes["remote.box_a"].suggested_name == "Box A"
    assert boxes["remote.box_b"].suggested_name == "Box B"
    assert boxes["remote.box_a"].media_player_entity_id is None
    assert boxes["remote.box_b"].media_player_entity_id is None
