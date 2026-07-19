"""Tests for custom_components/orbit/__init__.py: service registration and
the service actually driving a full reset end-to-end.
"""

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.orbit.const import DOMAIN


async def test_setup_registers_reset_service(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, DOMAIN, {})
    assert hass.services.has_service(DOMAIN, "reset")


async def test_reset_service_removes_config_entries(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, DOMAIN, {})

    entry = MockConfigEntry(domain=DOMAIN, unique_id=DOMAIN, data={}, options={})
    entry.add_to_hass(hass)

    await hass.services.async_call(DOMAIN, "reset", {}, blocking=True)

    assert hass.config_entries.async_entries(DOMAIN) == []
