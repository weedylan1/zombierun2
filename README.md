# Zombie Run 2 — After the Sirens

A separate PlayCanvas browser/WebXR outbreak game. The art upgrade uses models and PBR surfaces generated directly in the project: no paid assets, Blender or external art tools are required.

The rebuilt central high street and original sporting-goods approach have recessed modular shop bays, shelves, shutters, sash windows, awnings, slate roofs, UK road markings, street furniture, shaped vehicles, emergency markings/lights and smoke. Characters gain articulated near models and state-driven animation, with cheaper distance representations that retain every actor's simulation.

See [the implementation against your brief](docs/ART_UPGRADE.md) for the exact completed scope, code mapping and remaining limitations.

## Play

Standard starts with **20 zombies**, a five-shot shotgun pickup and 400 civilians, three police and two firefighters. Carnage starts with **100 zombies** and replaces the shop shotgun with a **100-round machine gun**. People flee zombies; infection can grow the zombie population during play.

Reach the raised mall fire-escape landing to win. Zombies cannot climb it. A blocked alley has five spare shotgun shells and six arrows. Loaded weapons can be swapped immediately, retaining ammunition in the dropped weapon. The supplied blended soundtrack and head-relative HRTF zombie audio remain included.

Choose **PC High**, **PC Low**, or **Quest / Mobile** in the menu. Automatic selects the phone preset where appropriate; an immersive VR session always uses Quest settings. Choose **High street benchmark · 100 local actors** to start alongside the representative street/junction and see the rebuild immediately. Both game modes retain their full city populations in the benchmark.

| Device | Controls |
| --- | --- |
| PC | WASD move; mouse look; hold right mouse or Shift to run; E picks up; left mouse fires; Q/Escape returns to menu; V toggles VR. Hold left mouse for machine gun. |
| Phone/tablet | Left movement stick; drag screen to look; RUN, PICK UP, FIRE and MENU buttons. Mobile controls remain hidden on PCs, including Windows touchscreen PCs. |
| VR | Left stick moves; left trigger runs; right grip picks up; right trigger fires; B/Y restarts; A exits. Directional zombie audio follows head rotation. |

## Run and build

Requires the existing Node/npm build system.

```sh
npm ci
npm run dev
npm test
npm run build:blazor
```

The production files are generated in `out/`, with relative asset URLs. Copy all output into `wwwroot/ZombieRun2/` and browse `/ZombieRun2/`. VR needs HTTPS or localhost and a compatible headset/browser.

All 14 checks and the production build pass. Chrome rendering of the representative street was inspected; hardware Quest/phone testing is still required. The benchmark's frame-time display is a comparison aid, not a device performance guarantee. The large engine-bundle build warning remains.
