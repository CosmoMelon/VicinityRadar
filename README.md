# Vicinity Radar

**Discover what's developing around your property.** Vicinity Radar is a static, frontend-only Toronto development research prototype. Select a verified Hines property, choose a 500 m, 1 km, or 2 km radius, and inspect City of Toronto Development Pipeline records with straight-line distances and official source links.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The static dataset is already bundled in `public/data`; Python is not needed to run the website.

```bash
npm test
npm run build
npm run preview
python -m unittest discover -s tests -p "test_*.py"
```

Deploy the contents of `dist/` to any static host. No backend, database, or credentials are used.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` validates the bundled data, runs the tests, builds the site, and deploys it when `master` is pushed. It can also be run manually from the Actions tab. In the repository's **Settings → Pages**, select **GitHub Actions** as the build and deployment source. The site is served at `https://cosmomelon.github.io/VicinityRadar/`.

The workflow sets `VITE_BASE_PATH` to the repository path so Vite assets, the logo, and bundled JSON load from GitHub Pages. Local development continues to use `/`. For a local Pages-path build in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/VicinityRadar/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

## What is in V1

- Five curated Toronto property records from Hines: CIBC SQUARE, West House, The Hangar District at YZD, Bayside Toronto, and T3 Junction.
- Property-centric Leaflet map with OpenStreetMap tiles, a radius circle, stage-colored clustered markers, and synchronized map/list detail selection.
- Stage and type filters, sorting, matching chart and metrics, and browser-side CSV export with formula-injection protection.
- Typed, validated JSON loading and clear unavailable, missing-location, no-nearby, and no-filter-match states.
- Offline tests for geography, data contracts, analytics, export, and a synthetic UI workflow.

## Refresh the official data

Python 3.10+ standard library is sufficient. Run from the repository root:

```bash
python scripts/prepare_hines_data.py
python scripts/prepare_toronto_pipeline.py
python scripts/validate_data.py
```

Edit `data/hines_seed.json` to curate properties. Each coordinate must have a recorded source URL. The Hines script validates and publishes the seed to `public/data/properties.json`, then updates the property count and source in `public/data/metadata.json`.

The Toronto script discovers current resources via the [City CKAN package metadata](https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=development-pipeline), downloads the official Development Pipeline JSON and [Toronto One Address Repository](https://open.toronto.ca/dataset/address-points-municipal-toronto-one-address-repository/) 4326 CSV, inspects required columns, and performs an exact normalized address join. The 183 MB address file is processed locally and is **not** shipped to browsers. It writes `public/data/developments.json` and `public/data/metadata.json` atomically after successful validation. The existing static output is preserved if preparation fails.

For manual, offline source files:

```bash
python scripts/prepare_toronto_pipeline.py --input data/raw/development-pipeline.csv --address-input data/raw/address-points-4326.csv
```

The input can also be official pipeline JSON. `data/raw/` is Git ignored. A local file import has no CKAN version timestamp, so the metadata records the local path instead. Run `python scripts/validate_data.py` before committing refreshed output. The deployment workflow validates the committed static data; it does not refresh the official sources automatically.

## Data and interpretation

The bundled preparation on **2026-10-21** read **2,391** official application records. Application numbers were unique, so none were removed as duplicates. **1,849** records had an unambiguous exact match to a municipal address point; **542** were retained with null coordinates and excluded from radius analysis. `developments.json` is about **1.17 MB**. All map points and metrics derive from the bundled source records, never synthetic production data.

The pipeline publishes application addresses, not parcel geometry. Spatial search measures Haversine distance from a property point to the matched municipal address point. This is an approximation, particularly for large multi-address projects. An address with multiple distinct matching points is excluded rather than choosing one arbitrarily. A development might have multiple planning applications with distinct application numbers; the source offers no reliable project identity to merge those, so counts are **application records**, not necessarily unique physical sites.

The source statuses observed in this snapshot are `Under Review`, `Active`, and `Built`. V1 maps `Under Review` to Proposed and `Built` to Built. `Active` remains Unknown; the source does not establish approval or construction from that label. The source supplies proposed residential and non-residential area measures but not a reliable use class for non-residential-only projects, so those remain Unknown. Zero under-construction records in the chart does **not** establish that construction is absent. The metric displays “Not identified by this source.” Null numeric values remain null; reported zeroes remain zero.

Source content may lag current site conditions. Verify consequential decisions against the official application record. The [Open Government Licence – Toronto](https://open.toronto.ca/open-data-licence/) applies to City data. OpenStreetMap attribution is on the map, and the app uses the public tile endpoint with visible attribution for this small prototype; a production deployment with substantial traffic should choose an appropriate tile hosting arrangement. Hines photos and branding are not reused.

Vicinity Radar is an independent research prototype using publicly available information. It is not affiliated with or endorsed by Hines or the City of Toronto.

## Code map

- `src/services/dataService.ts`: loading and runtime schema checks.
- `src/lib/geo.ts`: coordinate validation, distance, and radius filtering.
- `src/lib/analytics.ts`: shared filtered results, sorting, and metrics.
- `src/lib/export.ts`: safe CSV serialization and download.
- `src/components/MapPanel.tsx`: Leaflet map and marker clustering.
- `scripts/`: repeatable data preparation and validation.
- `docs/PRODUCT_CASE_STUDY.md`: product rationale, measures, and roadmap.
