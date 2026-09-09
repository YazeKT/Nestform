# Nestform technical wiki

## Coordinate model

The retained Deepnest geometry engine uses drawing units internally. SVG units per inch defines the conversion boundary. With the default scale of 72, one millimetre is exactly 72 / 25.4 internal units. Sheet input, spacing display, dimensions, and SVG physical width and height all use this same conversion.

Part spacing is applied as half the requested clearance around each neighbouring outline. Two placed outlines therefore receive the full requested edge-to-edge gap. Exported geometry uses the original contours and final transforms, while the root SVG records its physical size in mm or inches.

## Search

Nestform retains Deepnest's no-fit polygon generation, genetic ordering and rotation search, placement scoring, native polygon calculations, common-line merging, and SVG export. Population size explores more candidates; more rotations improve orientation choice; lower curve tolerance follows curves more closely. These can increase run time.

Auto Nest is a guided configuration layer over the retained engine. It changes the workspace to millimetres, applies the selected gap using the same 72 / 25.4 conversion boundary, enables six evenly spaced orientations at 60-degree intervals, raises the search population and mutation rate when they are below the automatic baseline, creates the requested rectangular sheet quantity, and starts the ordinary engine. The minimum gap is the active physical clearance; the optional maximum is retained as an Auto Nest preference for future multi-pass exploration.

Multiple rectangular sheets, imported sheet contours, and offcuts are stock alternatives. Quantity is respected for each type. The material-first bounding-box objective and the cutting/material balance determine which valid arrangement ranks highest.

## Performance

Native calculations run in isolated child processes, up to the selected CPU worker count. Part quantities remain grouped in the interface. Preview SVGs render as image resources so thousands of placed shapes do not create thousands of interactive UI nodes. Practical speed still depends on contour complexity, rotations, population size, and available stock.

## Files and privacy

Settings and History are stored under the current Windows user's Nestform application-data folder. History contains completed SVG output and job metadata and is not capped to a fixed number of entries. If a History backup folder is selected, each completed result is also written there as an SVG and a `.nestform.json` record. Imported SVGs stay local. DXF/CDR conversion is a separate, confirmed network action.
