"""Discovery of Android TV boxes exposed via the androidtv_remote integration."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.core import HomeAssistant, split_entity_id
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import ANDROIDTV_REMOTE_DOMAIN


@dataclass
class DiscoveredBox:
    """A box available to add to Orbit."""

    remote_entity_id: str
    media_player_entity_id: str | None
    suggested_name: str
    device_id: str | None


def async_discover_boxes(hass: HomeAssistant) -> list[DiscoveredBox]:
    """Return every androidtv_remote-backed box HA currently knows about.

    Filters on the entity's *platform* (the integration that created it),
    not just the `remote.*` domain, so Orbit never offers unrelated remote
    entities (Harmony Hub, Roku, etc.) — only real Android TV boxes.

    Callers are responsible for filtering out boxes already claimed by an
    existing Orbit subentry (see config_flow.py) — this only reports what
    exists in HA's registries.
    """
    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    boxes: list[DiscoveredBox] = []

    for entry in ent_reg.entities.values():
        domain, _ = split_entity_id(entry.entity_id)
        if domain != "remote" or entry.platform != ANDROIDTV_REMOTE_DOMAIN:
            continue

        media_player_entity_id: str | None = None
        if entry.device_id:
            for sibling in er.async_entries_for_device(ent_reg, entry.device_id):
                sibling_domain, _ = split_entity_id(sibling.entity_id)
                if sibling_domain == "media_player" and sibling.platform == ANDROIDTV_REMOTE_DOMAIN:
                    media_player_entity_id = sibling.entity_id
                    break

        device = dev_reg.async_get(entry.device_id) if entry.device_id else None
        suggested_name = (
            ((device.name_by_user or device.name) if device else None)
            or entry.name
            or entry.original_name
            or entry.entity_id
        )

        boxes.append(
            DiscoveredBox(
                remote_entity_id=entry.entity_id,
                media_player_entity_id=media_player_entity_id,
                suggested_name=suggested_name,
                device_id=entry.device_id,
            )
        )

    return boxes
