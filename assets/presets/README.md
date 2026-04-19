# Preset Definitions

Each `.json` file here defines one preset. The app reads all `.json` files in this directory on startup.

## Schema

```json
{
  "id": "unique_snake_case_id",
  "name": "Display Name",
  "category": "film-stock",
  "lutFile": "your_lut.cube",
  "thumbnailFile": "thumbnails/your_thumbnail.jpg",
  "params": {
    "grain": { "enabled": true, "type": "film", "intensity": 0.25, "size": 0.8 },
    "vignette": { "enabled": true, "shape": "oval", "strength": 0.3, "feather": 0.6, "midpoint": 0.75 },
    "halation": { "enabled": true, "color": "#FF4422", "radius": 40, "threshold": 0.78, "intensity": 0.3 }
  }
}
```

## Categories
- `film-stock` — Kodak Portra, Fuji Velvia, etc.
- `mood` — Moody, Hazy, Airy, etc.
- `era` — 70s Warm, Y2K Digital, VHS, etc.
- `cinematic` — Teal & Orange, Film Noir, etc.
- `editorial` — Clean White, High Contrast, etc.
- `aesthetic` — Dark Academia, Cottagecore, etc.

## Thumbnail images
Place in `assets/presets/thumbnails/` as JPEG (200x200px recommended).
Name matches the `thumbnailFile` field in the JSON.
If `thumbnailFile` is null, a generic placeholder is shown.
