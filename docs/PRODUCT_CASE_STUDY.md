# Vicinity Radar — product case study

## Problem and users

Commercial real estate professionals may need to consult several sources to understand development activity around one asset. Toronto's Development Pipeline is citywide, whereas an asset manager, acquisition analyst, development analyst, or property manager usually begins with a particular property. Vicinity Radar reorganizes public records around that property and preserves links to the official source.

## Opportunity hypothesis

A property-centric map with a short path from selection to nearby records will make useful development information easier and faster to find than manually navigating a citywide dataset. This remains an **unvalidated hypothesis**. No interviews, usability study, or outcome measurements have been completed.

## V1 scope and prioritization

V1 focuses on property selection, a tested straight-line radius calculation, an interactive map, stage and type filters, basic deterministic analytics, record details, and official links. These answer the core question with minimal steps and let users check the source. CSV export supports further research without introducing accounts or a backend.

AI, financial valuation, user accounts, notifications, and complex reports are excluded because they add cost, privacy, and interpretation requirements before the core discovery workflow is validated. Active Building Permits is excluded as a separate dataset because it can describe the same site as a pipeline application; reliable cross-source deduplication would be needed before counting them together.

## Data decisions and limitations

The five properties are manually curated from Hines pages: CIBC SQUARE, West House, The Hangar District at YZD, Bayside Toronto, and T3 Junction. Their coordinates come from the map links on those pages. The Hangar District is a large proposed neighbourhood, so its address point is a reference location rather than the district's boundary. The City pipeline contains no coordinates, so preparation joins application addresses to official Toronto One Address Repository points. Unmatched or ambiguous addresses remain visible in metadata and are excluded from spatial findings.

The 2026-10-21 snapshot had 2,391 application records and 1,849 usable geographic records. Counts in the app represent application records. The dataset does not provide a stable physical-site identifier to merge potentially related applications. “Active” status is unknown for the app's stage taxonomy; the source does not prove that a project is approved or under construction. Non-residential-only area does not prove commercial use. The interface keeps these unknowns explicit and reports contributing-record coverage for sums.

## Measures to validate

| Measure | How to measure | Target to consider after pilot |
| --- | --- | --- |
| Time to first useful nearby finding | Moderated task from property selection to opened source record | Establish baseline against current manual workflow |
| Interactions to first useful finding | Count selections, radius changes, and result opens | At most three core steps |
| Radius accuracy | Compare deterministic Haversine tests and boundary fixtures | 100% of tested boundary cases |
| Geocoded record coverage | Usable points / all prepared source records | Track each refresh; improve exact matching without false positives |
| Official reference coverage | Records with direct application link or dataset fallback | 100% have an official route to source |
| User-reported usefulness | Short post-task rating and interview notes | Establish baseline in pilot |

These are planned product measures, not claimed outcomes. The observed geocoding coverage in this snapshot is 1,849 / 2,391; it is a data preparation result, not a user success metric.

## Future roadmap

1. Test the workflow with target users and refine the property summary, source context, and filters.
2. Improve address matching with authoritative multi-address and parcel geometry while preserving match confidence and auditability.
3. Compare official snapshots to reveal newly reported projects and stage changes.
4. Add property comparisons and carefully deduplicated Active Building Permits.
5. Consider source-grounded AI summaries or natural-language research only after verifying demand. Any authenticated LLM use would require a secure server-side endpoint; keys would never be placed in the static frontend.
