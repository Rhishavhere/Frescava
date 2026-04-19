# LUT Files — Free Presets

Place your `.cube` LUT files here. These are the **free bundled LUTs** that ship with Frescava.

## File naming convention
`preset_name.cube` — all lowercase, underscores for spaces.

## How to add a preset
1. Export your `.cube` file from Photoshop/Lightroom and place it here.
2. Create a matching JSON file in `assets/presets/` (see that folder's README).
3. Optionally, place a thumbnail image in `assets/presets/thumbnails/`.
4. Restart the app — the preset will appear in the strip.

## Expected location in the app
`assets/luts/free/your_preset.cube`

## Format requirements
- Standard `.cube` format
- `LUT_3D_SIZE` line at the top (33 is standard)
- RGB triplets, one per line, in Blue-fastest order
