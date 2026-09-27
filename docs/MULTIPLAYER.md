# Multiplayer connections

Typing race, typing fighter, and volleyball use `lib/roomPeer.js` for PeerJS signaling and reliable JSON WebRTC data channels. Same-browser tabs use this same transport; BroadcastChannel is no longer sent in parallel, which previously duplicated fighter attacks.

Creating a room waits for the signaling server to register the room ID. Joining waits for the host to admit the guest. Registration or admission must finish within 15 seconds. Missing rooms, duplicate codes, full rooms, network failures, and cancellation reject the operation and release its resources. A timeout never opens a successful lobby.

The host admits at most seven guests for races and one guest for fighter/volleyball. Membership is tied to the remote peer ID, not the nickname. Leaving releases the slot; ending the host session returns guests to the join screen. Game modes have separate room ID prefixes.

## Verification

```sh
npm ci
npx playwright install chromium
npm run test:multiplayer
npm run test:multiplayer:browser
npm run build
```

The unit suite uses an in-memory signaling/connection implementation to exercise delayed registration, duplicate codes, missing rooms, timeout, cancellation, identical nicknames, concurrent admission, disconnect/rejoin, combat delivery, and volleyball input agreement.

The browser suite uses separate Chromium browser contexts, the public PeerJS signaling service, and real WebRTC. It checks all three managers, game messages, and full-room rejection. It requires internet access.

For the actual React screens, start `npm run dev -- --hostname 127.0.0.1 --port 3100`, then run `npm run test:multiplayer:ui` in another terminal. Set `TEST_BASE_URL` to use a different local server address. It checks room creation, invitation links, joining, starting games, invalid-room retry, and host-disconnection recovery, including cancellation of a race countdown.

## Network coverage

The current ICE configuration supplies STUN servers only. Separate browser contexts on one computer verify real signaling and data channels, but do not prove connectivity between different networks. Some NAT/firewall combinations require an authenticated TURN relay; see the [PeerJS FAQ](https://peerjs.com/client/faq). No TURN service credentials are configured in this repository. Cross-network acceptance should include home Wi-Fi versus mobile data and a restricted network, with a TURN service configured if direct connections fail.

These changes require both host and guest to load the new version; reload any tabs left open from the previous version after deployment.

## Production investigation after a two-computer failure

The deployed site was examined using `tests/multiplayer-diagnostics.mjs`, with two separate Chromium processes and instrumentation of the actual RTCPeerConnection instances. No IP addresses or credentials are included in its output.

| Experiment | Result |
| --- | --- |
| Normal production configuration | Joined; selected candidate pair was `host` to `host` over UDP on the same computer. This does not verify connectivity between physical devices. |
| `FORCE_RELAY=1` | Room registration and SDP offer/answer exchange succeeded, but no relay candidates were available. Joining timed out. |
| `FORCE_RELAY=1` and `DEFAULT_ICE=1` | Restoring the installed PeerJS package's default TURN endpoints also timed out. Both TURN endpoints reported ICE error 701 and produced no relay candidates in this environment. |

The application explicitly replaces PeerJS's default ICE configuration with STUN-only entries. The resulting confirmed limitation is that there is no working fallback when direct peer connectivity is unavailable. A provisioned, verified TURN service or a server-based game-message relay is required to address that limitation. Merely restoring the package defaults was not sufficient in the experiment.

This is a reproduced failure class, not a captured trace from the user's two computers. Their exact failure still needs the game name, visible error, and network context to distinguish blocked direct connectivity from signaling, stale client versions, or a wrong game/room code. No production changes were made during this diagnostic investigation.
