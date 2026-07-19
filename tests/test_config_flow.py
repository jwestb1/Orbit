"""Tests for custom_components/orbit/config_flow.py against real HA config
entry / subentry machinery — this is the highest-uncertainty part of the
whole Orbit integration (config subentries are a relatively new HA feature),
so these tests exist specifically to validate the shape settled on in
config_flow.py rather than just its individual functions in isolation.
"""

from homeassistant import data_entry_flow
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.orbit.const import (
    CONF_MEDIA_PLAYER_ENTITY_ID,
    CONF_NAME,
    CONF_REMOTE_ENTITY_ID,
    CONF_RESTRICT_ADMIN_ONLY,
    DOMAIN,
    SUBENTRY_TYPE_BOX,
)


async def test_user_flow_creates_singleton_entry(hass: HomeAssistant) -> None:
    """The parent flow needs no input beyond a confirmation and creates
    exactly one entry, with the admin-only option defaulted on."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is data_entry_flow.FlowResultType.CREATE_ENTRY
    assert result["title"] == "Orbit"
    assert result["options"] == {CONF_RESTRICT_ADMIN_ONLY: True}

    entries = hass.config_entries.async_entries(DOMAIN)
    assert len(entries) == 1


async def test_user_flow_aborts_if_already_configured(hass: HomeAssistant) -> None:
    """Orbit is a singleton — a second setup attempt must abort, not create
    a duplicate tile in Devices & Services."""
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    entry.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is data_entry_flow.FlowResultType.ABORT
    assert result["reason"] == "already_configured"


def _register_box(hass: HomeAssistant, *, object_id: str, name: str) -> str:
    """Register a bare androidtv_remote remote entity (no device) and
    return its entity_id — enough for the subentry flow's discovery."""
    entity_registry = er.async_get(hass)
    entry = entity_registry.async_get_or_create(
        "remote", "androidtv_remote", f"{object_id}_unique", suggested_object_id=object_id
    )
    entity_registry.async_update_entity(entry.entity_id, name=name)
    return entry.entity_id


async def test_box_subentry_flow_creates_a_box(hass: HomeAssistant) -> None:
    """Adding a box via the "+" affordance discovers the androidtv_remote
    entity and creates a subentry under the parent Orbit entry."""
    parent = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    parent.add_to_hass(hass)
    remote_entity_id = _register_box(hass, object_id="living_room", name="Living Room")

    result = await hass.config_entries.subentries.async_init(
        (parent.entry_id, SUBENTRY_TYPE_BOX), context={"source": "user"}
    )
    assert result["type"] is data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.subentries.async_configure(
        result["flow_id"], {CONF_REMOTE_ENTITY_ID: remote_entity_id}
    )
    assert result["type"] is data_entry_flow.FlowResultType.CREATE_ENTRY
    assert result["title"] == "Living Room"

    subentries = list(parent.subentries.values())
    assert len(subentries) == 1
    assert subentries[0].subentry_type == SUBENTRY_TYPE_BOX
    assert subentries[0].data[CONF_REMOTE_ENTITY_ID] == remote_entity_id
    assert subentries[0].data[CONF_MEDIA_PLAYER_ENTITY_ID] is None


async def test_box_subentry_flow_respects_custom_name(hass: HomeAssistant) -> None:
    """An explicit name overrides the entity's suggested name."""
    parent = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    parent.add_to_hass(hass)
    remote_entity_id = _register_box(hass, object_id="bedroom", name="Bedroom Box")

    result = await hass.config_entries.subentries.async_init(
        (parent.entry_id, SUBENTRY_TYPE_BOX), context={"source": "user"}
    )
    result = await hass.config_entries.subentries.async_configure(
        result["flow_id"], {CONF_REMOTE_ENTITY_ID: remote_entity_id, CONF_NAME: "Kids' Room"}
    )

    assert result["title"] == "Kids' Room"
    assert list(parent.subentries.values())[0].title == "Kids' Room"


async def test_box_subentry_flow_excludes_already_claimed_boxes(hass: HomeAssistant) -> None:
    """A box already added as a subentry must not be offered again — running
    "Add box" a second time only shows the still-unclaimed entity."""
    parent = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    parent.add_to_hass(hass)
    claimed_entity_id = _register_box(hass, object_id="living_room", name="Living Room")
    unclaimed_entity_id = _register_box(hass, object_id="bedroom", name="Bedroom")

    first = await hass.config_entries.subentries.async_init(
        (parent.entry_id, SUBENTRY_TYPE_BOX), context={"source": "user"}
    )
    await hass.config_entries.subentries.async_configure(
        first["flow_id"], {CONF_REMOTE_ENTITY_ID: claimed_entity_id}
    )

    second = await hass.config_entries.subentries.async_init(
        (parent.entry_id, SUBENTRY_TYPE_BOX), context={"source": "user"}
    )
    assert second["type"] is data_entry_flow.FlowResultType.FORM
    schema_keys = list(second["data_schema"].schema.keys())
    remote_key = next(k for k in schema_keys if str(k) == CONF_REMOTE_ENTITY_ID)
    allowed = second["data_schema"].schema[remote_key].container
    assert claimed_entity_id not in allowed
    assert unclaimed_entity_id in allowed


async def test_box_subentry_flow_aborts_with_no_candidates(hass: HomeAssistant) -> None:
    """No androidtv_remote entities at all -> a clear abort, not an empty
    unusable form."""
    parent = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    parent.add_to_hass(hass)

    result = await hass.config_entries.subentries.async_init(
        (parent.entry_id, SUBENTRY_TYPE_BOX), context={"source": "user"}
    )
    assert result["type"] is data_entry_flow.FlowResultType.ABORT
    assert result["reason"] == "no_boxes_found"


async def test_options_flow_updates_restrict_admin_only(hass: HomeAssistant) -> None:
    """The admin-only toggle round-trips through the options flow."""
    entry = MockConfigEntry(
        domain=DOMAIN, unique_id=DOMAIN, data={}, options={CONF_RESTRICT_ADMIN_ONLY: True}
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "init"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_RESTRICT_ADMIN_ONLY: False, "factory_reset": False}
    )
    assert result["type"] is data_entry_flow.FlowResultType.CREATE_ENTRY
    assert entry.options[CONF_RESTRICT_ADMIN_ONLY] is False


async def test_options_flow_factory_reset_removes_entry(hass: HomeAssistant) -> None:
    """Checking factory_reset routes to a confirmation step, and confirming
    it tears down the config entry (and, with it, every box subentry)."""
    entry = MockConfigEntry(
        domain=DOMAIN, unique_id=DOMAIN, data={}, options={CONF_RESTRICT_ADMIN_ONLY: True}
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_RESTRICT_ADMIN_ONLY: True, "factory_reset": True}
    )
    assert result["type"] is data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "confirm_reset"

    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"confirm": True}
    )
    assert result["type"] is data_entry_flow.FlowResultType.ABORT
    assert result["reason"] == "reset_complete"
    assert hass.config_entries.async_entries(DOMAIN) == []


async def test_options_flow_factory_reset_declined_returns_to_init(hass: HomeAssistant) -> None:
    """Backing out of the confirmation step must not touch the entry."""
    entry = MockConfigEntry(
        domain=DOMAIN, unique_id=DOMAIN, data={}, options={CONF_RESTRICT_ADMIN_ONLY: True}
    )
    entry.add_to_hass(hass)

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_RESTRICT_ADMIN_ONLY: True, "factory_reset": True}
    )
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"confirm": False}
    )
    assert result["type"] is data_entry_flow.FlowResultType.FORM
    assert result["step_id"] == "init"
    assert hass.config_entries.async_entries(DOMAIN) != []
