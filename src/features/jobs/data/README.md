# Georgia territory boundary

`georgia-boundary.geojson` is the unmodified full-resolution Georgia ADM0 country feature from geoBoundaries gbOpen, boundary ID `GEO-ADM0-33476915`, pinned at source commit `9469f09`. It represents Georgia's national extent, including Abkhazia and South Ossetia, rather than treating those areas as separate countries. Coordinates are WGS84 longitude/latitude.

- [Pinned original GeoJSON](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GEO/ADM0/geoBoundaries-GEO-ADM0.geojson)
- [Source metadata](https://www.geoboundaries.org/api/current/gbOpen/GEO/ADM0/)
- Source: OpenStreetMap, Wambacher. Boundary reference year: 2017. geoBoundaries build: December 12, 2023.
- The source metadata identifies the boundary license as [Creative Commons Attribution-ShareAlike 2.0](https://creativecommons.org/licenses/by-sa/2.0/) and links [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright). geoBoundaries' [gbOpen distribution](https://www.geoboundaries.org/api.html) is CC BY 4.0 compliant. Retain these source and license notices when redistributing the dataset.
- SHA-256 of the downloaded file: `dde0bc1946730be54fcf9e0e72c552953eb1b5848b805583e87fe8ef4c6b6375`.

The application includes points on this polygon's border and excludes points outside it. A bounding rectangle is only an early rejection optimization. It is not the territory rule. The full geometry is bundled locally and validated once with Zod, so checks do not depend on network availability or send coordinates to a third-party geocoder.

This is an operational placement boundary based on a published dataset, with the dataset's coastal and border accuracy. Do not simplify it or add an outside buffer without reviewing near-border behavior. Existing pins are retained; every new pin and every location edit must satisfy the rule. The map remains freely navigable.
