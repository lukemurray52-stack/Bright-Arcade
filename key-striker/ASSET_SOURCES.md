# Key Striker asset sources

This corrected build deliberately keeps the proven procedural stadium, pitch, goals and nets because the previous stadium replacement failed visual QA.

- `assets/player.glb`: original OpenAI-authored skinned footballer for this project, built as a glTF 2.0 skin with 18 bones. It replaces the failed segmented rigid-body model.
- `assets/crowd.glb`: locally bundled spectator pose pack used as dense instanced crowd geometry.
- `assets/ball.glb`: locally bundled 3D match ball.

Reference research for future rig/animation upgrades: Quaternius Universal Base Characters and Universal Animation Library are CC0; soccerviewer football assets derive from GameplayFootball / Google Research Football under the Unlicense. They were researched but are not claimed as bundled binaries in this corrected build.
