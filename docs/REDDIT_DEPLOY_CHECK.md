# Reddit RSS production check — 2026-09-26

- Production: https://garmgoon.com
- Worker version: `b08d3739-25f3-4eca-94ed-9093be307f70`
- Deployment built from HEAD plus the Reddit changes in a separate staging directory; unrelated uncommitted multiplayer changes were excluded.
- Remote D1 reported no pending migrations before deployment.
- Staged build and all 11 Reddit tests passed.
- Production homepage and `/api/ideas`: HTTP 200; eight existing cards; mobile browser reported no page errors or horizontal overflow.
- Deployed Reddit UI passed desktop (1280px) and mobile (390px) fixture checks. These checks used mocked API data, not live Reddit posts.

## Live collection result

The local admin password was not accepted by production (HTTP 401). The current collection slot marker was cleared once so the existing production cron could run the collection stage again. No post records or request cooldowns were deleted.

At approximately 19:20 MDT (01:20 UTC September 27), the deployed Worker attempted the configured combined daily-top Reddit feed. The state recorded `unavailable`, checkedAt `1790472033911`, retryAt `1790472633911` (ten-minute cooldown). No HTTP status or underlying exception was recorded by this failure path, so this result does not establish a 403/429 block or its exact cause.

The overall collection logged 71 candidates and six new records from other sources. Reddit candidates remained zero. Actual recent Reddit post summarization, comment enrichment, and saved-card rendering could not be verified because the live feed request failed. No fabricated Reddit posts were inserted.

## Resolved collection failure — same-day follow-up

Final deployed version: `a69d689a-97f8-4e98-9aa5-eb62f1877733`.

Root cause: `redirect: "error"` is rejected by the installed Cloudflare workerd runtime when constructing the request, before an upstream request is made. Reproducing it in Miniflare returned `Invalid redirect value, must be one of "follow" or "manual"`. Node's mocked fetch had accepted that option and therefore missed the defect. Changed the collector to `redirect: "manual"`, retaining rejection of HTTP redirects. Added a workerd/D1 integration regression test and private phase, HTTP status, content type, and exception diagnostics. All 13 tests pass.

An authenticated Wrangler remote preview ran the same deployed collector against the production D1 database. The internal cooldown caused solely by the pre-network runtime error was cleared once. Reddit then returned HTTP 200 and `application/atom+xml; charset=UTF-8`; 50 actual recent candidates were stored. Existing scoring and selection chose six Reddit cards, all six were published with Korean summaries. The remaining 44 were skipped by the normal selection rules. A production scheduled invocation also progressed card creation during verification.

The subsequent thread request returned HTTP 429. Its real one-hour cooldown was preserved at `1790476213041` (2026-09-26 20:30:13 MDT); later card creation reused candidate bodies without new Reddit requests. Background repair is eligible after this time, subject to normal pipeline scheduling; it does not guarantee Reddit will accept the next request. Comment summaries remain unverified, and UI correctly labels them unavailable rather than inventing reactions.

The live homepage/API now show six Reddit cards, including IDs 1499, 1518, and 1543. A real-data browser check verified Korean summaries, original links, null unknown engagement counts, no private snapshot exposure, rate-limit messaging, no page errors, and no horizontal overflow at 390px. Settings now shows the successful candidate count independently of subsequent comment-fetch failure. The temporary remote preview was stopped after verification.
