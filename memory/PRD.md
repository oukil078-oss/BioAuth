# PRD — Face Overlay Centering & Alignment Fix

## Original Problem Statement
User requested a full root-cause fix (not a one-file patch) for admin webcam face overlay misalignment:
- face rectangles shifted sideways / not centered
- blur region potentially misaligned
- unknown-user red box and red X placement issues
- alignment drift across resizing and desktop/mobile
- ensure mirror handling, object-fit scaling, and coordinate mapping are correct

## Architecture Decisions
- Added a dedicated shared geometry utility: `src/lib/faceOverlayGeometry.ts`
- Centralized overlay mapping with:
  - source video dimensions
  - rendered viewport dimensions
  - object-fit/object-position calculations
  - mirror-aware coordinate conversion
- Camera overlay rendering remains DOM-based (not canvas) for CSS-pixel consistency with video layer.

## Implemented
- Refactored `CameraView` to use shared geometry mapper for all face boxes.
- Used live container dimensions per detection cycle for responsive alignment.
- Added mirror detection helper (`isMirroredOnXAxis`) and applied it in mapping.
- Improved admin overlay labeling to use dynamic matched identity (removed hardcoded visible admin label text).
- Kept a toggleable debug mode (`Debug On/Off`) for center/box visual checks.
- Added required `data-testid` hooks to core admin login/camera controls used in test flows.
- Fixed startup crash when Supabase env vars are missing by guarding function calls in `src/lib/supabase.ts`.
- Improved `object-position` parsing for keyword-order cases (e.g., `top left`, `bottom right`).
- Improved mobile dashboard behavior by default-collapsing sidebar on small screens and preventing horizontal overflow.

## Validation Notes
- Typecheck and production build both pass.
- Local UI automation verified:
  - admin login route renders
  - dashboard renders
  - camera container and debug toggle render
  - mobile layout renders without previous horizontal cut-off
- Full live face-box centering E2E with real webcam feed requires camera access + active recognition runtime data.

## Prioritized Backlog

### P0
- Run full real-webcam E2E pass (recognized, unknown, admin blur) in a browser/device with camera permissions.
- Validate centering with multiple camera aspect ratios (4:3, 16:9, portrait streams).

### P1
- Add an optional developer overlay readout (scale/offset/mirror/object-fit) behind debug mode.
- Add automated geometry unit tests for mapping edge cases.

### P2
- Convert the polling loop to `requestAnimationFrame` + throttled recognition worker for smoother overlays.
- Add per-device tuning profiles for low-light/noisy camera feeds.

## Next Tasks
- Confirm with user-provided environment/credentials and run full live camera verification.
- Capture before/after screenshots/video from real detection session for regression baseline.
