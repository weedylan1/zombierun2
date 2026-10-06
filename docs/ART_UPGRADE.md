# Art upgrade: implementation against the supplied brief

The first commit was a minor polish pass and did not meet the brief. This rebuild replaces that approach with the brief's representative-street prototype, while applying the user's later constraints: no payment, no Blender, no external asset tools, and no reduction to outbreak populations.

## Implemented

| Brief requirement | Implementation |
| --- | --- |
| Recognisably contemporary British town | UK double yellow lines, white centre markings, zebra crossings, red pillar/telephone boxes, bus shelters, pub/pharmacy/bakery/bookshop/grocer/hardware themes, sash windows, rainwater pipes, slate roof silhouettes and UK vehicle plates. |
| Modular street-level geometry | Reusable facade bays have a recessed floor, back wall, shelves/goods, door glazing and handles, pilasters, window frames, shutters, awnings and fascia lettering. These are actual meshes with depth, rather than window paint on a cube. |
| First representative street | The central archery frontage and junction, plus the original sporting-goods approach. These receive the detailed bays. Other blocks retain cheaper shells using the new material palette; this is deliberately not a full bespoke rebuild of every block. |
| PBR materials | Shared locally generated brick, stone, paving, asphalt, metal, wood and grass families. Albedo, height-derived OpenGL normals, AO, roughness and metallic channels are generated consistently. Normal/ORM data are linear; base colour is sRGB. |
| Vehicles beyond stacked boxes | Shared shaped hull meshes with sloping cabin/bonnet profiles; windows, tyres, hubs, wing mirrors, handles, plates and bumpers. Hatchback/saloon-style cars, delivery vans, police, ambulance and fire-engine variations. Damaged variants have raised bonnets and damaged windscreens. |
| Street furniture/clutter | Timber benches, wheelie bins, red post boxes, telephone kiosks, shelters, shopping trolleys, drain grilles, papers, parcels, fingerposts and a reusable roadworks barrier module. Blocking props register collision footprints separately from rendering. |
| Lighting/atmosphere | Cool ambient light, directional sun, warm shelf/interior lights represented with emissive surfaces, distance fog, PC High sun shadows, animated emergency beacons and bounded soft billboard smoke. No crowd shadow casting. |
| Inexpensive reusable characters | Shared low-polygon capsule/sphere/body geometry, male/female/child proportions, hair and trouser variations, recognisable police/firefighter uniform details. Near meshes remain below 5,000 triangles in the real-engine geometry check. |
| Animation rather than polygon inflation | Hip/shoulder, knee/elbow joints; walking, faster panic running, idle breathing, screams, zombie hunch/dragging leg, irregular reaching, head turns, bite/lunge reaction, police aim/recoil and muzzle flash, axe action, fall/death and turning posture. Animation follows simulation facts without root motion. |
| Retain identity on infection | Actor, position, clothes, uniform and appearance metadata remain the same. Green head/facial materials and zombie posture change; role weapons hide/drop according to existing gameplay. |
| PC High / PC Low / Quest | Explicit menu profiles; phones choose the mobile/Quest profile automatically. An active immersive XR session forces Quest settings and restores the selected desktop setting on exit. 512 px maps on High; 256 px on Low/Quest. Draw distances, detail ranges, shadows and effect limits differ. |
| Distance-based presentation | Full near characters, a much cheaper shared body/head proxy in middle/far bands, and no visual beyond the profile's cull distance. Near model graphs are released outside render range and recreated from retained appearance. Shared mesh ownership survives releasing all near instances. |
| Keep simulation running | All 425 Standard or 505 Carnage actors continue AI, movement, hearing and infection regardless of visual LOD. Audio and projectiles continue to use the persistent actor root position. |
| Representative 50–100 actor benchmark | A menu option places 100 existing actors on the high street: 75 civilians, three police, two firefighters and 20 zombies, while keeping the full selected mode population. The panel reports actual placement, simulated population, render range and a smoothed frame time. |
| Repeatable layout | Seeded world dimensions, placement, backdrop and surface generation. Actor behavior/spawns retain their gameplay randomness. |

## Relevant files

- `src/town-art.js`: reusable modular street and vehicle geometry, props, collision footprints, effects and detail batching.
- `src/procedural-surfaces.js`: albedo/normal/ORM generation and profile texture binding.
- `src/character-visuals.js`: cheap proxies, lazy near models, retained appearance, mesh ownership and state-driven poses.
- `src/quality-profiles.js`: profile budgets, LOD bands and seeded RNG.
- `src/street-benchmark.js`: relocates existing actors without replacing or removing the simulated population.
- `src/main.js` and `src/city-details.js`: integration into the existing game, with mode, weapons, fire escape and input behavior preserved.
- `visual-check.mjs`: real PlayCanvas null-device geometry/material/transform tests. It validates CPU geometry and ownership, not GPU speed.

## Verification

All 14 checks pass, including new PBR-channel/normal validation, profile behavior, near geometry limits, infection identity, near-mesh release/recreation, stable prop collision under detail culling, actual vehicle outward normals, and preservation of a 505-actor city when placing the 100-actor street benchmark. The Blazor production build passes.

The rebuilt production street was visually inspected in Chrome; the benchmark placed 100 actors with the full Standard population retained. PC High and PC Low rendering worked. Carnage retained 505 simulated actors in the Low-profile benchmark. Actual Meta Quest stereo rendering, sustained frame times/thermals and phone performance remain unverified. The in-game smoothed frame time is a useful comparison aid, not a formal p95/p99 performance certification.

## Scope qualifications

The document originally asked for a review and proposed paid AI-generation/Blender workflows. Later instructions explicitly ruled those out; the models and maps here are produced directly by project code instead. There are no AI-generated GLBs, imported animation packs, downloaded PBR packs, Gaussian splats, WebGPU renderer migration or Blender scripts. The existing WebGL/WebXR path remains.

This build is a representative street upgrade and reusable module library, as requested by the brief's first-prototype section. It does not claim modern AAA/photoreal characters, a bespoke detailed asset for every building/vehicle type, or measured PS3/PS4-equivalent quality. Building shells remain procedural, lower-detail areas still exist, feeding remains disabled and police still have six shots without a reload. Those gameplay rules were not altered to invent animation states.
