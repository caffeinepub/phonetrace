# PhoneTrace — Phone Intelligence & Consent-Based Location Sharing

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- Home page: phone number input with Indian telecom prefix lookup (operator + circle/state)
- Phone lookup engine using a bundled static JSON dataset (first 4 digits → operator + circle)
- Indian number format validation (10-digit mobile, with optional +91 prefix)
- "Request Location" flow: generates a unique UUID-based tracking session stored in Motoko canister
- Shareable link: `/track/{session-id}` — user copies and sends manually
- Consent page (`/track/:id`): shows request message + "Allow Location" button; GPS captured only after explicit click
- Location data sent to Motoko backend only after browser GPS permission granted
- Tracking dashboard: Leaflet.js map with live marker, accuracy radius circle, last-updated timestamp, auto-polling every 5 seconds
- Session expiry logic (30-minute TTL on sessions)
- Privacy & Terms page
- Dark glassmorphism UI with Framer Motion animations

### Modify
N/A — new project

### Remove
N/A — new project

## Implementation Plan

### Backend (Motoko)
- `TrackingSession` type: `{ id: Text; createdBy: Text; location: ?Location; isActive: Bool; createdAt: Int; expiresAt: Int }`
- `Location` type: `{ lat: Float; lng: Float; accuracy: Float; timestamp: Int }`
- `createSession(phoneNumber: Text) → Text` — creates session, returns UUID
- `submitLocation(sessionId: Text, lat: Float, lng: Float, accuracy: Float) → Bool` — stores location if session valid + active + not expired; sets consent flag
- `getSession(sessionId: Text) → ?TrackingSession` — returns session data for dashboard polling
- `deactivateSession(sessionId: Text) → Bool` — marks session inactive
- Session expiry check inside getSession and submitLocation
- UUID generation via timestamp + counter combination

### Frontend Pages
1. **Home** (`/`) — phone number input, telecom info card (operator, circle, format status), "Request Location" CTA
2. **Request** (`/request`) — session created, shareable link displayed with copy button, link to dashboard
3. **Consent** (`/track/:id`) — consent landing page with request message, Allow/Deny buttons, GPS capture logic
4. **Dashboard** (`/dashboard/:id`) — Leaflet map, accuracy radius, last-updated time, polling every 5s
5. **Privacy** (`/privacy`) — Terms & Privacy Policy page

### Data
- Static `telecom-prefixes.json` bundled in frontend (4-digit prefix → operator + circle)
- Covers major Jio, Airtel, Vi, BSNL prefixes across all Indian circles
- Loaded once at app start, cached in memory
