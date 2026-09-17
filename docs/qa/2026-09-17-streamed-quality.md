# Streaming with original visual quality

- Both device profiles use the same original geometry, rigs and full-resolution image bytes. Meshopt compression is lossless; tests decode every buffer and compare hashes with the original. Shared images use content hashes and one GPU Source per image.
- Only the current ship modules load at startup. The next module downloads during gem recovery; corridor completion waits for it, with progress feedback and retry on network failure. Saved stages load their existing modules before play.
- Mobile uses small invisible fracture proxies for debris calculation. Visible asteroid meshes are unchanged. This avoids the measured hundreds-of-MB transient CPU allocation.
- Original GLTF parser caches and redundant world geometry no longer remain reachable after loading.
- Portrait render budget is 720x1280; landscape is1280x720, fitted to aspect ratio. No automatic resolution downgrade. Both profiles retain bloom, original textures, 8x anisotropic filtering (hardware-clamped), 2x offscreen MSAA, particles and reflections.
- Vesper has stronger fill/exposure; camera-relative fill preserves surface readability. Camera drift is bounded and reduced-motion is honored. Transition framing, muzzle flashes, joint-position attachment sparks, gem particles and event bloom have been adjusted.
- Plasma turbo expands the plume, adds analytic sparks and illuminates the active propulsion module. Exhaust remains tied to real thrust, including RCS; drift extinguishes it.

Validation:118 Node tests; ChromeMetal desktop/touch controls; full3-stage WebKit playthrough with20shots, gem collection, module assembly and checkpoint reload, no runtime errors. Final WebKit portrait/Vesper and stage-three turbo checks. Browser testing on the Mac does not reproduce the physical iPhone memory/thermal envelope.

Measured cold local resource bytes: baseline210,997,469; compressed stage-one candidate121,632,614 (42.4% reduction). Original textures still make the first download substantial; no claim of instantaneous load. Sampled Chrome JS heap peak dropped from434,984,332 to66,429,080 bytes; these are test measurements, not iOS limits or GPU totals.
