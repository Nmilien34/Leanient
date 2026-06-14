# leanient-face-landmarks

On-device facial landmark detection (Apple Vision) for Phase 2b facial-volume
tracking. It detects the most prominent face in a captured face-check photo and
returns normalized face-contour geometry to JavaScript. The image is read and
analyzed entirely on the device; only the derived contour points are returned,
and the JS layer turns them into ratios stored in on-device storage. Nothing
about the face leaves the phone.

## Status — needs a dev-client build to compile and verify

The TypeScript side (detection bridge, geometry math, on-device store, trend, and
the consent gate) is complete and unit-tested. **This native module is written
but has not been compiled or run** — it requires a custom iOS build, which can't
happen in Expo Go or a headless environment. Treat it as a reviewed starting
point, not verified code. Build a dev client and confirm on a device before
shipping.

## How it plugs in

`src/screens/app/faceLandmarks.ts` resolves this module by name via
`requireOptionalNativeModule("LeanientFaceLandmarks")`. When the module is
absent (Expo Go, web preview, a build without it), detection returns `null` and
the app falls back to the self-rated fullness — so nothing breaks without it.

The native `detectFromImage(uri)` resolves to, matching the TS `FaceLandmarks`:

```json
{ "contour": [{ "x": 0.0, "y": 0.0 }], "boundingBox": { "x": 0, "y": 0, "width": 0, "height": 0 } }
```

All values normalized [0,1], image space, origin top-left, y down.

## Build & verify

```bash
# 1. Local Expo modules autolink from modules/. Generate native projects:
npx expo prebuild -p ios

# 2. Build and run a dev client on a real device (Vision needs device hardware
#    for best results; the simulator works for still-image detection):
npx expo run:ios --device

# 3. In the app: Progress > Turn on facial volume tracking (grant consent),
#    then take a face check. Confirm a FACIAL VOLUME card appears with an index.
#    isFaceDetectionAvailable() should now return true.
```

If detection returns `null` on a clear, well-lit, front-facing photo, log the
`VNFaceObservation` count and the contour point count inside the Swift handler to
see whether Vision found a face or the contour region was empty.

## iOS notes

- Minimum iOS 15.1 (set in the podspec); `VNDetectFaceLandmarksRequest` is older,
  but Fluid/contour quality improved in recent revisions.
- This module reads an already-captured still image (the face-check photo). It
  does not open the camera or process a live feed, which keeps the privacy
  surface to a single local file read.
- No `Info.plist` keys are required beyond the camera permission the app already
  declares for progress photos.
