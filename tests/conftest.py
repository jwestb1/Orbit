"""Shared pytest fixtures for the Orbit integration test suite.

Ensures the repo root is importable as `custom_components.orbit` regardless
of how pytest is invoked, then activates pytest-homeassistant-custom-
component's fixtures (hass, MockConfigEntry helpers, etc.) for every test.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Make custom_components/orbit discoverable in every test."""
    yield
