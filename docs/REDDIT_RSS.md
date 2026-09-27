# Reddit RSS cards

`REDDIT_MODE=rss` enables Reddit without OAuth credentials. `api` preserves the existing OAuth candidate collector (requires both Reddit secrets); `off` disables candidate collection. Selected-post detail enrichment currently uses public RSS in either collection mode.

RSS collection uses a persistent `reddit_feeds` queue with two jobs per subreddit in `REDDIT_SUBS`: weekly Top 100, refreshed daily, and monthly Top 100, refreshed every seven days. One due feed is requested per eligible pipeline tick, after pending scoring, selection, and publication. The ordinary four-hour multi-source collection no longer requests Reddit RSS. Initial weekly scans take priority over initial monthly scans; subsequent work is ordered by due time. These intervals are minimum refresh intervals, not completion guarantees during backlog or upstream cooldowns. Failures do not mark a feed successfully scanned.

`limit=100` is a request ceiling, not a guarantee of 100 results or exhaustive historical coverage. The collector accepts weekly posts up to seven days old and monthly posts up to 32 days old; these candidates bypass the generic 48-hour news filter. Previously unseen posts enter the current discovery day's scoring queue (60 per scoring tick). Daily card/source caps apply as for other sources (Reddit: 30 cards per day). The card displays original publication and discovery dates in UTC.

`reddit_seen` retains only post IDs and first-seen timestamps after content deletion. The migration seeds it from existing Reddit items. Transactional insertion triggers prevent the same ID being reinserted through a weekly/monthly overlap, changed URL slug, or content expiration. Already seen posts are not re-scored merely because their popularity changes. RSS vote/comment totals are unknown, not zero, and are not used as engagement signals.

Only selected posts get an additional thread request. Each summarization tick processes at most one selected Reddit post. The reader separates the post body from at most 30 unique, non-deleted comments belonging to that post. Bodies are limited to 12,000 characters, comments to 1,200 each. This is a partial feed sample, not a complete comment tree or a verified ranking.

The card shows a body summary and, if available, separate positive reactions, concerns/improvements, and questions. The displayed sample count and check time come from the collector, never the model. A failed comment request produces an explicit unavailable message. If only the candidate feed or title was available, that limitation is shown. The model is instructed to treat source text as data, attribute the author's claims, and never infer missing votes or overall sentiment.

## Request limits

An atomic D1 gate permits at most one RSS request every two minutes across cron/manual invocations. Every response's `x-ratelimit-remaining`/`x-ratelimit-reset`/`x-ratelimit-used` headers are stored in `reddit:rss:last-result.limit`; when fewer than one request remains, the gate stays closed until the reported reset, before a 429 occurs. Cloudflare egress IPs are shared, so other tenants can still exhaust the per-IP budget and a 429 cannot be ruled out. HTTP 429/403 pauses RSS requests for at least one hour and honors a longer `Retry-After`; other failures pause ten minutes. Requests do not switch IPs or hosts to evade blocking. Empty feeds do not imply that the actual post has no comments.

`reddit_context` holds the private input snapshot to reuse during AI retries; `discussion` holds the public reaction summary and collection metadata. `cardFromRow` never exposes the raw snapshot. Existing community-item retention applies: items older than 30 days are deleted, except scrapped items, which retain their snapshots too. This describes application behavior, not a guarantee of compliance with upstream terms. Apply `migrations/0004_reddit_discussion.sql` before deploying the worker. Cards without discussion metadata are unchanged.

Failed snapshots are reused only until `retryAt`. Successful snapshots, including empty feeds, are reused for AI retries. After normal card generation, the pipeline repairs at most one published Reddit card per tick, limited to cards collected in the last seven days and three repair attempts per card. It honors the shared request gate and stops repairs in `off` mode. Repairs update only discussion metadata and reactions, preserving the original headline and body summary. AI failures reuse the fetched thread on the next attempt. An empty successful feed or a successful fetch without an AI key ends repair without inventing a reaction summary. No continuous comment synchronization is performed.

## Rollout and operating plan

Apply `0005_reddit_top.sql` before deploying this version. It adds the feed queue, durable post-ID ledger, and item ID column; the previous `0004_reddit_discussion.sql` is still required. Settings reports the last subreddit/period, returned candidate count, newly inserted count, and upstream failure independently. The private status API also exposes each feed's last success and next due time. Keep unknown engagement counts as unknown and retain the explicit sample labels.

1. Run `npm run test:reddit` and `npm run build` locally.
2. Apply `npx wrangler d1 migrations apply garmgoon --local` for local preview. Production needs the same migration with `--remote` before deploying. The existing main-branch GitHub Actions workflow applies migrations before deployment.
3. After deployment, inspect Settings for RSS mode, a successful candidate fetch, and candidate count. Then check a newly published Reddit card and its saved copy in Scrap for matching discussion metadata.
4. A passing mocked test is not evidence of Cloudflare-to-Reddit access. If production returns 403/429, retain the cooldown and inspect subsequent scheduled results. Do not assume an enabled source is receiving data.
5. Failed recent cards receive bounded background repair. Cards older than seven days, cards with three repair attempts, and cards with no discussion metadata are not repaired automatically.

The settings screen reports RSS mode and the last fetch outcome. A configured source is not a guarantee that Reddit will accept requests from Cloudflare. If no candidates arrive, no placeholder/fabricated Reddit cards are published. The next regular collection retries after the request pause. AI summarization uses the existing OpenRouter configuration and its normal costs.

## Checks

Run `npm run test:reddit` (Node with `node:sqlite`, such as Node 22.13+ or 24+) and `npm run build`. Unit tests use temporary in-memory SQLite and mock only upstream Reddit/AI responses; they cover filtering, sample caps, unknown totals, backoff, context reuse, selection-only enrichment, and public/private data separation.

The same command also runs the collector in workerd through Miniflare with local D1 and a mocked outbound service. This catches runtime incompatibilities that Node fetch mocks miss. Requests use `redirect: "manual"` because workerd rejects `"error"` before contacting the upstream. HTTP 3xx responses remain failures and are not followed. Private operational state records HTTP status, content type, failure phase, and a bounded error message; upstream response bodies are not stored in diagnostics. Settings displays the failure reason.

RSS availability does not establish permission for every downstream use. The configured public summary use remains subject to Reddit's applicable terms and the user's pending access request.
