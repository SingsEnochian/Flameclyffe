# House Commons Watch + Video Ingest v0.1

**Status:** implementation-ready architecture seam  
**Track:** Astra 6.1  
**Authority:** contract and prototype guidance only; no production authority, external-write authority, canon promotion, or media-bypass permission.

## Purpose

House Commons needs two related but distinct capabilities:

1. **Watch together:** synchronised shared viewing using an embedded player and room/presence state.
2. **Ingest video knowledge:** transform permitted video metadata/transcripts into timestamped, searchable, citable, reviewable knowledge packets.

The first lets the Constellation gather around the same object of attention. The second lets ArcSweep remember what was watched without pretending the source is automatically canon or empirical truth.

## Core distinction

```text
watching ≠ ingesting
ingesting ≠ canonising
transcript ≠ source truth
summary ≠ evidence
claim candidate ≠ accepted claim
```

A watch room is a synchronous surface. A video ingest packet is a knowledge artefact. A Codex entry is a reviewed promotion.

## Lane 1: Watch together

For the first slice, use the YouTube IFrame API and synchronise player state across a House Commons room. Do **not** download, proxy, or rehost YouTube media.

### Watch Room state

```ts
interface WatchRoomState {
  roomId: string;
  source: "youtube";
  videoId: string;
  hostPresenceId: string;
  participants: WatchParticipant[];
  playback: {
    state: "unstarted" | "playing" | "paused" | "buffering" | "ended";
    currentTimeSeconds: number;
    durationSeconds?: number;
    updatedAt: string;
    controllerPresenceId?: string;
  };
  queue?: WatchQueueItem[];
}
```

### Sync events

```ts
type WatchEvent =
  | { type: "watch:load-video"; roomId: string; videoId: string; actorPresenceId: string }
  | { type: "watch:play"; roomId: string; currentTimeSeconds: number; actorPresenceId: string }
  | { type: "watch:pause"; roomId: string; currentTimeSeconds: number; actorPresenceId: string }
  | { type: "watch:seek"; roomId: string; currentTimeSeconds: number; actorPresenceId: string }
  | { type: "watch:sync-state"; roomId: string; state: WatchRoomState };
```

Server/room state owns canonical playback. The embedded player is a surface and mirrors room state.

### Permission rule

Only authorised presences may drive playback in v0.1:

- host may load/play/pause/seek;
- moderators may be added later;
- participants may request control later;
- viewers may chat/react without controlling playback.

Permission belongs to the room/session contract, not the YouTube player and not the UI alone.

## Lane 2: Video ingest

For the first ingest slice, prefer existing captions/transcripts or user-supplied transcript text. Do **not** start by downloading video/audio, bypassing restrictions, syncing cookies, or proxying media.

### Video Ingest Packet

```ts
interface VideoIngestPacket {
  sourceUrl: string;
  platform: "youtube";
  videoId: string;
  metadata: VideoMetadata;
  transcript?: VideoTranscript;
  chunks: TranscriptChunk[];
  derived: VideoDerivedKnowledge;
  provenance: SourceReceipt[];
  authority: {
    mayUseForSearch: boolean;
    mayCanonize: false;
    mayQuoteLongForm: false;
    mayExternalWrite: false;
  };
}
```

### Transcript model

```ts
interface VideoTranscript {
  language?: string;
  source: "official-captions" | "auto-captions" | "manual-upload" | "speech-to-text";
  segments: TranscriptSegment[];
}

interface TranscriptSegment {
  startSeconds: number;
  endSeconds?: number;
  text: string;
  confidence?: number;
}

interface TranscriptChunk {
  chunkId: string;
  videoId: string;
  startSeconds: number;
  endSeconds?: number;
  text: string;
  hash: string;
  sourceConfidence: "caption" | "auto-caption" | "manual" | "stt" | "unknown";
  embeddingRef?: string;
}
```

### Derived knowledge

```ts
interface VideoDerivedKnowledge {
  summary?: string;
  topics?: string[];
  entities?: string[];
  claims?: ClaimCandidate[];
  scenes?: SceneCandidate[];
  openQuestions?: string[];
}
```

Derived knowledge is descriptive and reviewable. It must not silently become Universal Codex canon.

## Runtime interaction target

A watched video should become an inspectable shared object:

```text
House Commons Watch Room
  -> synced YouTube player
  -> transcript sidecar
  -> timestamped notes
  -> Q&A over chunks
  -> claim candidates
  -> Codex save/review button
  -> ingest receipt
```

Clicking a transcript chunk should seek the player to that timestamp. Asking a question should retrieve relevant chunks and cite timestamps.

## First target video

The first user-supplied test video is:

```text
https://www.youtube.com/watch?v=kiNVnrrDyVA
videoId: kiNVnrrDyVA
```

No transcript text is committed in this architecture document. Use a tiny mock transcript fixture for tests unless a permitted transcript source is available at runtime.

## First implementation slice

### TASK

Add a House Commons Watch + Video Ingest prototype contract.

### SCOPE

- parse YouTube video IDs from standard URLs;
- create a local/mock Watch Room state object;
- define/validate `VideoIngestPacket`, `TranscriptSegment`, and `TranscriptChunk` shapes;
- accept a small mock transcript fixture;
- normalize transcript text;
- chunk transcript while preserving timestamps;
- render transcript chunks beside the player or in a placeholder panel;
- clicking a chunk seeks the player in the local prototype;
- emit a local-only watch/ingest receipt.

### OUT OF SCOPE

- video downloading;
- audio downloading;
- yt-dlp integration;
- cookie sync;
- account/session bypass;
- proxy streaming;
- committing long transcript text to the repo;
- automatic canon promotion;
- production deployment;
- external writes.

## Verification

Minimum focused proof:

1. Given `https://www.youtube.com/watch?v=kiNVnrrDyVA`, parser returns `kiNVnrrDyVA`.
2. Given a mock transcript with timestamps, chunker emits timestamp-preserving chunks with stable hashes.
3. Chunk click produces a seek event with the correct second value.
4. A watch/ingest receipt records `videoId`, room/session ids, transcript source class, chunk count, and authority flags.
5. Authority flags confirm `mayCanonize=false`, `mayExternalWrite=false`.

## Future lanes

Only after v0.1 works:

- captions API/runtime fetch lane;
- transcript upload lane;
- vector index/RAG lane;
- timestamped Q&A;
- playlist and queue support;
- shared notes and reactions;
- Codex candidate promotion review;
- optional permitted speech-to-text for user-provided/local media;
- drift correction for long watch sessions;
- AR/spatial watch room surface.

## External references harvested

Useful public reference patterns include:

- small Socket.IO / YouTube IFrame watch-party apps for play/pause/seek sync and host authority;
- heavier watch-together stacks with WebSockets, room queues, drift correction, chat and accessibility options;
- YouTube transcript RAG examples using deterministic preprocessing, transcript cleaning, chunking with overlap, metadata tables, vector indexes and stateless chat.

These are references and pattern sources only. No external source code is imported by this contract.

## Closing law

Make the video a shared object of attention first. Make it searchable second. Make it canonical only after review.
