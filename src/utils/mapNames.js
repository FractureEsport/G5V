// Centralized map id -> display name resolution (mirrors src/utility/mapPool.ts on
// the G5API backend). A map's technical id (a classic map like `de_mirage`, or a bare
// Steam Workshop file id like `3081538` - the only workshop format CS2/MatchZy
// recognizes) must never be replaced by its display name in data sent back to the
// API/MatchZy - this module is for UI display only.
//
// Keep this list in sync with G5API's `defaultMaps` config
// (config/development.json.template).
export const KNOWN_MAPS = {
  de_inferno: "Inferno",
  de_ancient: "Ancient",
  de_mirage: "Mirage",
  de_nuke: "Nuke",
  de_anubis: "Anubis",
  de_dust2: "Dust II",
  de_vertigo: "Vertigo",
  de_train: "Train",
  de_overpass: "Overpass",
  de_cache: "Cache"
};

export function isWorkshopMapId(mapId) {
  return /^\d+$/.test(String(mapId ?? "").trim());
}

function prettifyMapId(mapId) {
  if (isWorkshopMapId(mapId)) return `Workshop #${mapId}`;
  if (!mapId.includes("_")) return mapId;
  return mapId
    .replace(/^(de|cs|aim|gg|surf|wm)_/i, "")
    .split("_")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Resolves a map's technical id to a human-readable display name. `knownMaps` lets
 * callers merge in the user's own map_list display names and/or a season's
 * map_pool_names overrides on top of the static classic-map dictionary. Falls back to
 * a prettified id - never blank, never an error - when no known name exists, per spec.
 */
export function getMapDisplayName(mapId, knownMaps) {
  if (!mapId) return mapId;
  if (knownMaps && knownMaps[mapId]) return knownMaps[mapId];
  if (KNOWN_MAPS[mapId]) return KNOWN_MAPS[mapId];
  return prettifyMapId(mapId);
}

export default { getMapDisplayName, isWorkshopMapId, KNOWN_MAPS };
