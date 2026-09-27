import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { RoomPeer } from "../lib/roomPeer.js";
import { RacePeerManager } from "../lib/webrtcRace.js";
import { FighterBattleManager } from "../lib/webrtcFighter.js";
import { FIGHTER_SKILLS } from "../lib/fighterSkills.js";
import { VolleyNet, Lockstep } from "../lib/volley/net.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));
function broker({ delay = 0, silent = false } = {}) {
  const peers = new Map();
  let sequence = 0;
  class Connection extends EventEmitter {
    constructor(peer) { super(); this.peer = peer; this.open = false; }
    send(msg) { const data = structuredClone(msg); queueMicrotask(() => { if (this.other.open) this.other.emit("data", data); }); }
    close() {
      if (this.closed) return;
      this.closed = true; this.open = false; this.emit("close"); this.other.close();
    }
  }
  return async (requested) => {
    const peer = new EventEmitter();
    peer.id = requested || `guest-${++sequence}`;
    peer.connections = [];
    peer.destroy = () => {
      peer.destroyed = true;
      if (peers.get(peer.id) === peer) peers.delete(peer.id);
      for (const conn of peer.connections) conn.close();
    };
    peer.reconnect = () => {};
    peer.connect = (id) => {
      const conn = new Connection(id);
      const remote = peers.get(id);
      if (!remote) { queueMicrotask(() => peer.emit("error", { type: "peer-unavailable" })); return conn; }
      const other = new Connection(peer.id);
      conn.other = other; other.other = conn;
      peer.connections.push(conn); remote.connections.push(other);
      queueMicrotask(() => {
        remote.emit("connection", other);
        conn.open = other.open = true;
        other.emit("open"); conn.emit("open");
      });
      return conn;
    };
    if (!silent) setTimeout(() => {
      if (peer.destroyed) return;
      if (peers.has(peer.id)) peer.emit("error", { type: "unavailable-id" });
      else { peers.set(peer.id, peer); peer.emit("open", peer.id); }
    }, delay);
    return peer;
  };
}

function manager(Class, makePeer, handlers = {}) {
  const instance = new Class(handlers);
  if (instance.makeTransport) {
    const original = instance.makeTransport.bind(instance);
    instance.makeTransport = () => { const transport = original(); transport.makePeer = makePeer; transport.timeout = 100; return transport; };
  } else { instance.transport.makePeer = makePeer; instance.transport.timeout = 100; }
  return instance;
}

test("registration waits for signaling; collisions and missing rooms reject", async () => {
  const makePeer = broker({ delay: 20 });
  const host = new RoomPeer({ prefix: "test-", makePeer, timeout: 100 });
  let opened = false;
  const pending = host.open("ABCDE", true).then(() => { opened = true; });
  await flush(); assert.equal(opened, false);
  await pending;
  const duplicate = new RoomPeer({ prefix: "test-", makePeer });
  await assert.rejects(duplicate.open("ABCDE", true), { code: "taken" });
  const guest = new RoomPeer({ prefix: "test-", makePeer });
  await assert.rejects(guest.open("XXXXX", false), { code: "notFound" });
  assert.equal(guest.closed, true); host.close();
});

test("timeout and cancellation settle pending operations and dispose peers", async () => {
  const host = new RoomPeer({ prefix: "test-", makePeer: broker({ silent: true }), timeout: 10 });
  await assert.rejects(host.open("ABCDE", true), { code: "timeout" });
  assert.equal(host.peer.destroyed, true); assert.equal(host.timers.size, 0);
  const cancelled = new RoomPeer({ prefix: "test-", makePeer: broker({ delay: 50 }) });
  const pending = cancelled.open("ABCDE", true);
  await flush(); cancelled.close();
  await assert.rejects(pending, { code: "cancelled" });
  const importing = new RoomPeer({ prefix: "test-", makePeer: broker() });
  const loading = importing.open("ABCDE", true); importing.close();
  await assert.rejects(loading, { code: "cancelled" });
});

test("race: identical nicknames stay distinct, start/progress/reset/leave synchronize", async () => {
  const makePeer = broker(); const events = [];
  const host = manager(RacePeerManager, makePeer);
  const guest = manager(RacePeerManager, makePeer, { onStateChange: (s) => events.push(s) });
  await host.createRoom("ABCDEF", "same"); await guest.joinRoom("abcdef", "same");
  assert.equal(host.players.length, 2); assert.equal(guest.players.length, 2);
  assert.notEqual(host.myId, guest.myId);
  host.startRace({ text: "hello" }); await flush();
  assert.equal(events.filter((s) => s.raceStarting).length, 1);
  guest.sendProgress({ progress: 100, wpm: 60, accuracy: 97, finished: true }); await flush();
  assert.equal(host.players[1].rank, 1); assert.equal(guest.players[1].progress, 100);
  host.resetRace(); await flush(); assert.equal(guest.players[1].finished, false);
  guest.destroy(); await flush(); assert.equal(host.players.length, 1); host.destroy();
});

test("an open data channel without host admission never counts as a joined room", async () => {
  const makePeer = broker();
  const host = new RoomPeer({ prefix: "test-", makePeer });
  host.bind = () => {}; // Simulate an old or unresponsive host protocol.
  await host.open("ABCDE", true);
  const guest = new RoomPeer({ prefix: "test-", makePeer, timeout: 20 });
  await assert.rejects(guest.open("ABCDE", false), { code: "timeout" });
  assert.equal(guest.connections.size, 0);
  assert.equal(guest.peer.destroyed, true);
  host.close();
});

test("fighter: concurrent guests cannot replace opponent; attack applies once; rejoin works", async () => {
  const makePeer = broker();
  const host = manager(FighterBattleManager, makePeer);
  const one = manager(FighterBattleManager, makePeer);
  const two = manager(FighterBattleManager, makePeer);
  await host.createRoom("ABCDEF", "host");
  const results = await Promise.allSettled([one.joinRoom("ABCDEF", "one"), two.joinRoom("ABCDEF", "two")]);
  assert.equal(results[0].status, "fulfilled"); assert.equal(results[1].reason.code, "full");
  assert.equal(host.battleState.p2.id, one.myId);
  host.startBattle(); await flush(); one.castSkill(FIGHTER_SKILLS[0]); await flush();
  assert.equal(host.battleState.p1.hp, 100 - FIGHTER_SKILLS[0].damage);
  assert.deepEqual(one.battleState, host.battleState);
  one.destroy(); await flush(); assert.equal(host.battleState.p2.id, null);
  const replacement = manager(FighterBattleManager, makePeer);
  await replacement.joinRoom("ABCDEF", "new"); assert.equal(host.battleState.p2.id, replacement.myId);
  replacement.destroy(); host.destroy(); two.destroy();
});

test("volley: hello is delivered, full guest never opens, lockstep input agrees", async () => {
  const makePeer = broker(); const received = []; let rejectedOpened = false;
  const host = manager(VolleyNet, makePeer, { onOpen: () => host.send({ t: "hello" }) });
  const guest = manager(VolleyNet, makePeer, { onMessage: (msg) => received.push(msg) });
  const extra = manager(VolleyNet, makePeer, { onOpen: () => { rejectedOpened = true; } });
  await host.host("ABCDE"); await guest.join("ABCDE");
  assert.deepEqual(received, [{ t: "hello" }]);
  await assert.rejects(extra.join("ABCDE"), (error) => error === "full");
  assert.equal(rejectedOpened, false);
  const a = new Lockstep(0, 3, "match"); const b = new Lockstep(1, 3, "match");
  for (let frame = 0; frame < 100; frame++) {
    a.pump(() => ({ xDirection: 1, yDirection: 0, powerHit: false }));
    b.pump(() => ({ xDirection: -1, yDirection: 1, powerHit: true }));
    a.flush((m) => b.receive(m.f, m.v)); b.flush((m) => a.receive(m.f, m.v));
    assert.ok(a.ready() && b.ready()); assert.deepEqual(a.take(), b.take());
  }
  host.close(); guest.close(); extra.close();
});
