# STARWELL · The Canopy and the Tide | CC3+ Metric Field Kit

**Status:** Provisional location/terrain study only, 18 October 2026. This is *not* canon, not an existing Earth coastline, not a survey or hydrodynamic model, and not a Campaign Cartographer `.FCW` drawing. No private STARWELL or Wayglass world route has been modified.

## First open in Campaign Cartographer 3+

1. **Extract all files together** into a project directory. In CC3+, create a blank **overland** map with a **24 km × 16 km drawing extent**. Set drawing distance units to *metres*, or use 1 CC3 drawing coordinate = 1 metre.
2. In CC3+, add a sheet and layer named `TRACE_BITMAP` (or `BITMAP`). Make them active. From **Draw → Insert File**, pick `cc3_terrain_trace_24000x16000.png`.
3. Place the picture's **lower-left corner at `0,0`** and upper-right corner at **`24000,16000`**. Those corners are the required alignment control; do *not* import at arbitrary scale. Choose Bitmap Options → **Make path relative to current drawing** and **Hide Picture Outline**, if available in your installation. Save the `.FCW` in the **same folder as the PNG**. CC3+ references imported bitmaps on disk instead of embedding them.
4. Put the bitmap sheet below your editable drawing sheets. Trace coastline, land elevation bands, head of tide, rivers, wetlands, roads and site points onto their respective sheets. The full map PNG is a guide, not editable coastline geometry.
5. **Optional vector import:** on a separate `VECTOR_IMPORT` sheet, try **Draw → Insert File** → `cc3_shapes_LOCAL_METRES_R2000.dxf`. It contains lightweight linework in **metres**, on named DXF layers. If the DXF importer works, inspect alignment and adjust layer/sheet order. If it doesn't, the PNG + GeoJSON/CSV paths remain usable. **DXF handling is version-dependent and has NOT been verified in the user's installation**.
6. For a second independent reference sheet, insert `cc3_trace_overlay_transparent.png` at the exact same 0,0 to 24000,16000 corners. Hide it once native CC3 geometry is satisfactory.

Official reference: https://rpgmaps.profantasy.com/scaling-imported-images/ ; ProFantasy manual: https://s3.amazonaws.com/aws.profantasy.com/manuals/CC3Plus_Manual.pdf ; DXF import examples: https://forum.profantasy.com/discussion/11287/import-dxf-details .

## Scale, geometry and assumptions

| Property | First study assumption |
| --- | --- |
| Map dimensions | 24,000 m east-west × 16,000 m north-south |
| Origin | Southwestern pixel and world-local coordinate = (0 m, 0 m) |
| North | Image up, +Y |
| Bitmap | 2400 × 1600 pixels; 10 m/pixel, exact aspect ratio 3:2 |
| Elevation | Synthetic nominal relative sea level (0 m), approximate contours at 10, 25, 50, 75, 100, 150, 200 m |
| River | West-to-east catchment, tributary from north; synthetic incised valley near tidal head |
| Estuary | Funnels toward eastern sea coast; head at ~12.9 km E, ~8.4 km N; tidal datum is **unset** |
| Towns | Four **proposed** sites only, not surveyed parcels, not final village positions |
| Climate / geology | Unknown; no rainfall, permeability, sediment source or erosion parameters have been measured |
| Floating gardens | **Off-map conceptual study** pending force/mass/energy/water budget, not a mapped island or landform |

**Map realism test:** tributaries join rivers; rivers run downhill through their *land* section; a river mouth reaches tidally influenced water; a harbour requires water depth, tidal clearance and storm-surge analysis before placement; development should use higher terraces above proposed wetlands; protected intertidal areas remain disconnected from speculative land reclamation. These are governing hypotheses, not guarantees. The study’s elevation raster is a smooth synthetic function, not a hydrological simulation or GIS-validated DEM. Some streamlines and coast features will require manual adjustment after flow accumulation and erosion modelling.

## The four proposed ground sites

- **Ridgehead** `(4200,13500)` about **54.9 m**: catchment margin and upland access, not a proven spring; uphill north divide exists.
- **Canopy Terrace** `(10050,11750)` about **45.8 m**: possible inhabited terraces above the floodplain; canopy-load capacity needs structural and ecological study.
- **Tideport** `(15900,10800)` about **12.0 m**: raised port settlement **near** estuary, not proof of a navigable berth. Harbour requires its own lower wharf and flood plan.
- **Tidal Edge** `(15900,6500)` about **7.8 m**: visitor/ranger access to low wetlands, not a claim the centre sits at tide level.

The proposed road is a high-terrace land route. Its grade, soil support, flood crossings, travel speeds and engineering are *not* validated. Coastline and estuary geometry are illustrative. In particular, the estuary mouth and upstream freshwater junction should be treated as a geomorphic sketch, not a numerical tidal model.

## Files, ownership, and canon

- `cc3_terrain_trace_24000x16000.png`: exact-ratio import backdrop / visual terrain key.
- `cc3_trace_overlay_transparent.png`: transparent registration overlay using the same grid.
- `cc3_shapes_LOCAL_METRES_R2000.dxf`: experimental CC3+ import of coastline, channels, roads and site points.
- `cc3_map_features_local_m.geojson`: machine-readable geometry in **local invented metric coordinates**, no EPSG/WGS84 claim.
- `place_coordinates_local_m.csv`: four proposed site points and relative elevations.
- `coordinates_and_invariants.json`: map coordinate contract, explicit open questions and stop point.
- `reference-pack.v0.1.json` and `location-seed.v0.1.json`: original audited Pinterest sources and provisional Worldseed source.
- `location-seed.v0.2.json`: added metric cartography proposal with same source lineage, still **not canon**.
- `verify_cc3_kit.py`: independent structure/alignment checks using Python and ezdxf, PIL and shapely.

The **273-pin Pinterest parent board** remains the full inspiration archive. Eight visible World Pins are shortlisted in the original reference pack, two are on hold, and the five other sections are review queues. No Pinterest pictures or artists' media are copied into this package. All physical terrain is original generated source data. `world_anchor = Terra Aeterna` is a *proposed* scope and does not create a new canonical world or establish that the Poet’s Grove is the same place.

## Stop point and next experiment

**Stop point:** the CC3-compatible bitmap/DXF source package is created and statically tested. No `.FCW` has been opened on Rowan's machine. The next owner is **Rowan** to open the map in CC3+, verify 0,0 → 24000,16000 alignment, then inspect one short river reach and a tideport wharf with native layers.

**Realism next:** fix a geology, annual rainfall and tide regime; then test DEM-based flow accumulation and compare estuarine flood/storm scenarios before placing permanent buildings. Only after that do we calculate floating gardens' mass/load and water-source requirements.