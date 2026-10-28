# BlockTown prototype
Open `game.html` or click the Roblox icon in `index.html`. All amounts are simulated. A real WebGL world is rendered with locally bundled Three.js (MIT). Walk with WASD/arrow keys or touch buttons, drag to orbit, scroll to zoom and press E near the purple NPC to focus the quest. Buildings and trees have collision boundaries. This is not an official Roblox integration. If WebGL is unavailable, the existing text quest remains playable.

Progress is stored only in `zerotrust_blocktown_v1` in localStorage. Existing Kai results and banking balances are independent. No payment, OTP, or password fields exist.

## Future adapter contract v1
Read `window.ZeroTrustGame.getResult()` for a copied result snapshot. Subscribe on window to `zerotrust:game:ready`, `zerotrust:game:decision`, `zerotrust:game:complete`, and `zerotrust:game:restart`. Event detail contains version and scenarioId; decision adds stage (1-based), choice (0-based), safe. Complete adds score, maxScore, balance, answers and complete.

Events are local to the game document. There is no cross-window messaging, network adapter or Supabase upload yet. A future adapter must validate payloads, deduplicate completion and derive scores on the server before storing results. The existing kai-v1 scoring endpoint must not receive this scenario. For future iframe integration, explicitly allowlist parent origins and validate message origins. Never embed service keys.

## Menu and avatar
`menu.html` is the game entry point from the simulator icon. `js/avatar.js` shares a validated appearance schema and the same 3D avatar factory between menu preview and gameplay. Appearance is stored in `zerotrust_avatar_v1`, independent of quest progress. Supported fields: skin, hair, hairStyle, shirt, pants, accessory. Invalid saved values fall back to defaults. Menu changes are drafts until Save; leaving without saving discards the draft. Replay resets the quest and spawn, preserving appearance. No appearance is uploaded.
