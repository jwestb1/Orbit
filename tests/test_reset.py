"""Tests for custom_components/orbit/reset.py against the real frontend
storage and config-entry machinery.

The {"data": None} vs bare None envelope is load-bearing: it's what lets the
card's own getUserData() (src/lib/user-data-storage.ts) tell "explicitly
reset" apart from "never set," so these tests assert on the envelope shape
directly rather than just "the key is gone."
"""

from homeassistant.components.frontend.storage import async_user_store
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry, MockUser

from custom_components.orbit.const import DOMAIN
from custom_components.orbit.reset import async_reset_all, async_reset_all_users


async def test_reset_all_users_clears_orbit_keys_but_not_others(hass: HomeAssistant) -> None:
    user = MockUser(id="user1").add_to_hass(hass)

    store = await async_user_store(hass, user.id)
    await store.async_set_item(
        "shield-remote-card.apps.remote.living_room", {"data": [{"name": "YouTube"}]}
    )
    await store.async_set_item(
        "shield-remote-card.ui-settings.remote.living_room", {"data": {"trackpadHeight": 220}}
    )
    await store.async_set_item("some-other-card.settings", {"data": {"foo": "bar"}})

    await async_reset_all_users(hass)

    store_after = await async_user_store(hass, user.id)
    assert store_after.data["shield-remote-card.apps.remote.living_room"] == {"data": None}
    assert store_after.data["shield-remote-card.ui-settings.remote.living_room"] == {"data": None}
    # A key from an unrelated card must never be touched by Orbit's reset.
    assert store_after.data["some-other-card.settings"] == {"data": {"foo": "bar"}}


async def test_reset_all_users_sweeps_every_user(hass: HomeAssistant) -> None:
    user_a = MockUser(id="user_a").add_to_hass(hass)
    user_b = MockUser(id="user_b").add_to_hass(hass)

    store_a = await async_user_store(hass, user_a.id)
    store_b = await async_user_store(hass, user_b.id)
    await store_a.async_set_item("shield-remote-card.apps.remote.a", {"data": ["a"]})
    await store_b.async_set_item("shield-remote-card.apps.remote.b", {"data": ["b"]})

    await async_reset_all_users(hass)

    assert (await async_user_store(hass, user_a.id)).data["shield-remote-card.apps.remote.a"] == {
        "data": None
    }
    assert (await async_user_store(hass, user_b.id)).data["shield-remote-card.apps.remote.b"] == {
        "data": None
    }


async def test_reset_all_users_is_a_noop_with_no_orbit_keys(hass: HomeAssistant) -> None:
    """Sweeping a user with nothing to clear must not raise or create keys."""
    user = MockUser(id="user1").add_to_hass(hass)
    store = await async_user_store(hass, user.id)
    await store.async_set_item("unrelated-key", {"data": "value"})

    await async_reset_all_users(hass)

    store_after = await async_user_store(hass, user.id)
    assert store_after.data == {"unrelated-key": {"data": "value"}}


async def test_reset_all_removes_every_orbit_config_entry(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    entry.add_to_hass(hass)

    await async_reset_all(hass)

    assert hass.config_entries.async_entries(DOMAIN) == []
