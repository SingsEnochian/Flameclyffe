# Wayglass sound palette

The shared Soundstage now orchestrates scores with 27 original synthesised voices, 20 chord shapes and 12 tempo patterns. These are executable recipes, not downloaded commercial sound libraries. Each layer retains its original source and the chosen instrument source in its ledger. The existing audio context, master bus, mute, mono and Feather controls remain authoritative.

Owner recordings can be imported locally with their declared MIDI root and source/licence note. SHA-256 identifies the original bytes; IndexedDB retains originals and metadata. Decode errors and volatile storage are visible. Limits are 32 MiB per imported file, three minutes and 64 MiB per decoded asset. Browser-supported codecs determine compatibility. Recordings are not uploaded. Return checkpoints preserve instrument references; playback returns paused, and recordings missing on another device remain visibly missing.

The authenticated Ship Voice receives the checked palette catalogue. Wyrdrune can emit an expression/orchestra bridge selecting a built-in voice, chord, rhythm, tempo and root. An explicit UI action applies that choice to an existing composition. This does not enable autoplay or give the model an inventory of private browser recordings. It is autonomy groundwork, not a claim of unattended operation or completion of the remaining Wyrdrune conformance features.

Validation: 52 focused tests passed; actual offline PCM rendering exercised all 27 voices, finite/nonzero output and gain bounds. A generated WAV was saved, reopened, genuinely decoded and rendered as a chord/rhythm through the same instrument engine. Disposal during pending decode cannot allocate or start late audio. These checks do not establish physical speaker or implant output.
