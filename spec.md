# PhoneTrace — Dual Location Dashboard

## Current State
Dashboard shows only the target's location (single red/default marker). Requester location is not captured or shown. Map has a single Leaflet marker with accuracy circle. No distance calculation.

## Requested Changes (Diff)

### Add
- "Show My Location" button on the dashboard (appears once target location is received)
- Requester location state (lat/lng) stored in component state only (no backend storage)
- On button click: request browser geolocation permission → capture coords → show blue marker on map
- Red marker for target location (🔴)
- Blue marker for requester location (🔵)
- Thin polyline (dashed) connecting the two markers when both are present
- Haversine distance calculation between both markers, displayed as "Distance: X.X km away"
- Map auto-fits bounds to show both markers when both are present
- Distance card in the info panel showing calculated distance

### Modify
- DashboardPage.tsx: replace single Marker with conditional dual-marker setup
- Map center/zoom: when both locations exist, fit bounds to include both; otherwise center on target
- Info panel: add "Requester Location" section and distance display

### Remove
- Nothing removed — backward compatible

## Implementation Plan
1. Add `requesterLocation` state (lat/lng | null) to DashboardPage
2. Add `showMyLocationLoading` state for button feedback
3. Add custom Leaflet icons: blueIcon (requester) and redIcon (target)
4. Replace single `<Marker>` with conditional dual markers
5. Add `<Polyline>` between the two markers when both exist
6. Add `MapFitBounds` component that calls `map.fitBounds()` when both markers present
7. Implement `getDistance()` Haversine function
8. Add "Show My Location" button in info panel — only visible once target location is received
9. Add distance display card in info panel
10. Privacy: requester location stored only in component state, never sent to backend, never shown on consent page
