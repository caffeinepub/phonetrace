# PhoneTrace — Map Controls: Satellite + Street View

## Current State

DashboardPage (`src/frontend/src/pages/DashboardPage.tsx`) uses Google Maps JavaScript API (light theme). The `MapPanel` component:
- Loads Google Maps SDK dynamically with `AIzaSyBoYD4445obgpMIgANicCB0cqjnjTyLUpw`
- Shows red marker (target) and blue marker (requester)
- Draws a cyan polyline between both markers
- No map type toggle controls exist
- No Street View integration
- Map currently initialised with `mapTypeControl: false`

## Requested Changes (Diff)

### Add

1. **Map type toggle** — Floating pill buttons in top-right corner of the map container:
   - `[🗺 Map] [🛰 Satellite] [👁 Street View]`
   - Glassmorphism style, active state highlighted
   - Street View button disabled initially; enabled only when target location is available

2. **Satellite layer** — Switch to Leaflet-style Esri tiles (NOT Google Maps satellite):
   - Because current map is Google Maps, we handle this by switching `mapTypeId` to `'hybrid'` — WAIT, user explicitly said no Google Hybrid.
   - **CORRECT approach**: Replace Google Maps with Leaflet.js for this dashboard, using:
     - OSM tile layer for default map
     - Esri World Imagery + Esri Reference labels overlay for satellite
   - This avoids Google billing/API restrictions for satellite tiles

3. **Street View** — Opens Google Street View in a modal overlay or new tab:
   - Default: When target location is available, Street View button opens that location
   - Interactive: Clicking on the Leaflet map opens Street View for that clicked point
   - URL format: `https://www.google.com/maps?q=&layer=c&cbll={lat},{lng}`
   - Availability check: Use Google Street View Metadata API before opening:
     `https://maps.googleapis.com/maps/api/streetview/metadata?location={lat},{lng}&key=AIzaSyBoYD4445obgpMIgANicCB0cqjnjTyLUpw`
   - If `status === "OK"` → open Street View
   - If not available → show toast/alert: "Street View not available at this location"

4. **UX polish**:
   - Active state highlight on toggle buttons (Map vs Satellite)
   - Street View button disabled/greyed until target location arrives
   - Loading spinner/skeleton while map tiles load
   - "Fetching location…" text feedback during location fetch

### Modify

- `MapPanel` component:
  - Replace Google Maps with Leaflet.js (install `leaflet` + `@types/leaflet`)
  - Implement layer switching (OSM ↔ Esri Satellite + Labels)
  - Add map click listener for Street View
  - Markers: use Leaflet circle markers (red for target, blue for requester)
  - Polyline: use Leaflet polyline (cyan/dashed)
  - Add floating toggle buttons overlay inside map container

- Keep all existing session polling, distance calculation, dual markers, requester location on-demand — only the map rendering engine changes

### Remove

- Google Maps SDK loader (`loadGoogleMaps` function and `mapsPromise`)
- Google Maps `Marker`, `Polyline`, `InfoWindow` API calls
- `GOOGLE_MAPS_API_KEY` constant from DashboardPage (still needed for Street View metadata check)

## Implementation Plan

1. Install `leaflet` and `@types/leaflet` packages
2. Rewrite `MapPanel` to use Leaflet:
   - Init map with OSM tile layer on mount
   - Add Esri satellite + labels layers (togglable)
   - Add red/blue circle markers with popups
   - Add dashed polyline between markers when both present
   - fitBounds when both markers present
3. Add floating toggle button group (top-right, inside map container, z-index above map)
   - `Map` | `Satellite` | `Street View`
   - Active state styling
   - Street View disabled until `targetLoc` is truthy
4. Street View handler:
   - Check metadata API with Google Maps API key
   - If available: `window.open(streetViewUrl, '_blank')`
   - If not: show inline error message or browser alert
5. Map click → Street View (same availability check flow)
6. Preserve all existing DashboardPage state logic unchanged
