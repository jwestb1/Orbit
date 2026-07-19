"""Constants for the Orbit integration."""

DOMAIN = "orbit"

# The core integration Orbit discovers boxes from. Only remote/media_player
# entities that came from this platform are ever offered — keeps Orbit
# scoped to Android TV boxes, not unrelated remote.* entities (Harmony,
# Roku, etc.).
ANDROIDTV_REMOTE_DOMAIN = "androidtv_remote"

SUBENTRY_TYPE_BOX = "box"

CONF_RESTRICT_ADMIN_ONLY = "restrict_admin_only"
DEFAULT_RESTRICT_ADMIN_ONLY = True

CONF_REMOTE_ENTITY_ID = "remote_entity_id"
CONF_MEDIA_PLAYER_ENTITY_ID = "media_player_entity_id"
CONF_NAME = "name"

# frontend_user_data key prefixes the card writes personal overrides under
# (src/lib/app-shortcuts-storage.ts / ui-settings-storage.ts). Never renamed
# to match the frontend's own rebrand — these strings are never user-visible
# and changing them would require migration code for zero benefit.
FRONTEND_APPS_KEY_PREFIX = "shield-remote-card.apps."
FRONTEND_UI_SETTINGS_KEY_PREFIX = "shield-remote-card.ui-settings."
