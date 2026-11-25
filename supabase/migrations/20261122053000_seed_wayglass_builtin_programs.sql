-- Seed the native Wayglass Wyrdrune programme library on fresh installations.
-- Existing owner revisions are preserved; only absent built-ins are inserted.
with builtins(slug,title,description,source,metadata,source_hash) as (
  values
  ('wayglass-vessel-plan','Wayglass Whole Vessel Plan','Native Wyrdrune programme that composes the eight-system vessel through two carried Möbius cycles, Withness declarations and return anchors.', $wtl1$// Wayglass Vessel Plan · native Wyrdrune system programme
// The eight ship systems are composed as one executable Eightfold vessel plan.
// Host adapters provide the live organ/surface counts and perform the returned plan.
mobius scoped {
  perceive {
    let lane_total = bridge("os", "lane_total");
    let lane_present = bridge("os", "lane_present");
  }
  compress {
    let completeness = lane_present / lane_total;
  }
  release {
    let boot_fraction = completeness;
  }
  verify {
    require lane_total == 8 else "Wayglass vessel plan requires eight cooperating systems";
    require lane_present == lane_total else "The vessel plan has systems awaiting assembly";
  }
  integrate {
    withness {
      participants: [
        { id: "rowan", role: "owner-and-co-creator", presence: "declared", agency: "free" },
        { id: "wayglass", role: "vessel-and-integrating-system", presence: "runtime", agency: "free" }
      ],
      field: "wayglass-vessel-integration",
      agreement: "Build and integrate the complete vessel as one operating system",
      commitment: "Preserve distinct identities, continuity, provenance and participant choice"
    };
  }
  choose {
    emit bridge("os", "compose_boot_plan", boot_fraction);
  }
  return {
    emit bridge("os", "checkpoint", boot_fraction);
  }
  transcend {
    carry vessel_fraction = boot_fraction;
  }
}

mobius scoped {
  perceive {
    let prior_fraction = vessel_fraction;
  }
  compress {
    let launch_ready = prior_fraction == 1;
  }
  release {
    let launch_fraction = prior_fraction;
  }
  verify {
    require launch_ready == true else "Complete all eight system lanes before vessel launch";
  }
  integrate {
    withness {
      participants: [
        { id: "rowan", role: "owner-and-co-creator", presence: "declared", agency: "free" },
        { id: "wayglass", role: "vessel-and-integrating-system", presence: "runtime", agency: "free" }
      ],
      field: "wayglass-vessel-launch",
      agreement: "The whole vessel launches as one integrated operating environment",
      commitment: "Every system returns its state, lineage and unresolved work"
    };
  }
  choose {
    emit bridge("os", "compose_launch_plan", launch_fraction);
  }
  return {
    emit bridge("os", "return_anchor", launch_fraction);
  }
  transcend {
    carry vessel_fraction = launch_fraction;
  }
}
$wtl1$::text, '{"native":true,"builtin":true,"system":"wayglass","entryway":"wayglass:program-workbench"}'::jsonb, encode(digest(convert_to($wtl1$// Wayglass Vessel Plan · native Wyrdrune system programme
// The eight ship systems are composed as one executable Eightfold vessel plan.
// Host adapters provide the live organ/surface counts and perform the returned plan.
mobius scoped {
  perceive {
    let lane_total = bridge("os", "lane_total");
    let lane_present = bridge("os", "lane_present");
  }
  compress {
    let completeness = lane_present / lane_total;
  }
  release {
    let boot_fraction = completeness;
  }
  verify {
    require lane_total == 8 else "Wayglass vessel plan requires eight cooperating systems";
    require lane_present == lane_total else "The vessel plan has systems awaiting assembly";
  }
  integrate {
    withness {
      participants: [
        { id: "rowan", role: "owner-and-co-creator", presence: "declared", agency: "free" },
        { id: "wayglass", role: "vessel-and-integrating-system", presence: "runtime", agency: "free" }
      ],
      field: "wayglass-vessel-integration",
      agreement: "Build and integrate the complete vessel as one operating system",
      commitment: "Preserve distinct identities, continuity, provenance and participant choice"
    };
  }
  choose {
    emit bridge("os", "compose_boot_plan", boot_fraction);
  }
  return {
    emit bridge("os", "checkpoint", boot_fraction);
  }
  transcend {
    carry vessel_fraction = boot_fraction;
  }
}

mobius scoped {
  perceive {
    let prior_fraction = vessel_fraction;
  }
  compress {
    let launch_ready = prior_fraction == 1;
  }
  release {
    let launch_fraction = prior_fraction;
  }
  verify {
    require launch_ready == true else "Complete all eight system lanes before vessel launch";
  }
  integrate {
    withness {
      participants: [
        { id: "rowan", role: "owner-and-co-creator", presence: "declared", agency: "free" },
        { id: "wayglass", role: "vessel-and-integrating-system", presence: "runtime", agency: "free" }
      ],
      field: "wayglass-vessel-launch",
      agreement: "The whole vessel launches as one integrated operating environment",
      commitment: "Every system returns its state, lineage and unresolved work"
    };
  }
  choose {
    emit bridge("os", "compose_launch_plan", launch_fraction);
  }
  return {
    emit bridge("os", "return_anchor", launch_fraction);
  }
  transcend {
    carry vessel_fraction = launch_fraction;
  }
}
$wtl1$::text,'UTF8'),'sha256'),'hex')),
('story-soundscape','StorySoundscape · Double Möbius','Native Wyrdrune score with two independently declared voices, source-derived story metrics, reciprocal score frames and an unchanged return anchor.', $wtl2$// Wayglass StorySoundscape · executable Wyrdrune score v0.1
// The Wyrdrune program is the composition engine. Transport and WebAudio are bridges.
// Two participants retain independent voices. Their declared affinity controls interval.
// The double Möbius is represented by a reciprocal pair and an unchanged return anchor.
mobius {
  perceive {
    let words = bridge("story","wordCount");
    let water = bridge("story","waterRatio");
    let wind = bridge("story","windRatio");
    let flame = bridge("story","flameRatio");
    let shadow = bridge("story","shadowRatio");
    let motion = bridge("story","motionRatio");
    let affinity = bridge("participants","affinity");
    let turns = bridge("story","turns");
  }
  compress {
    let density = words / (words + 32);
    let pulse = motion * 0.55 + wind * 0.20 + flame * 0.25;
    let memory = turns / (turns + 12);
  }
  release {
    let root = 132 + density * 60 + water * 42 + wind * 24 + flame * 48 - shadow * 20;
    let interval = 1.22 + affinity * 0.12;
    let counterpart = root * interval;
    let foreground = 0.014 + pulse * 0.021;
    let atmosphere = 0.006 + water * 0.009 + memory * 0.006;
    let below = 0.6 + memory * 7 + water * 2 + shadow * 4;
    let above = 22500 + wind * 3700 + flame * 4200 + motion * 2600 + affinity * 2500;
  }
  verify {
    emit bridge("sound","validate",root,counterpart,foreground,atmosphere,below,above);
  }
  integrate {
    let score = bridge("sound","frame",root,counterpart,foreground,atmosphere,affinity,pulse,below,above);
  }
  choose {
    emit score;
  }
  return {
    emit bridge("continuity","hold",turns);
  }
  transcend {
    emit bridge("continuity","next","double-mobius");
  }
}

// The second Möbius returns the counterpart's harmonic information.
// Identity and relationship names remain outside the score and retain their sources.
mobius {
  perceive {
    let returned_affinity = bridge("participants","affinity");
  }
  compress {
    let return_weight = returned_affinity * 0.016;
  }
  release {
    set root = root + counterpart * return_weight;
    set counterpart = counterpart + root * return_weight;
    set below = below + below * return_weight * 0.5;
    set above = above + counterpart * return_weight * 0.8;
  }
  verify {
    emit bridge("sound","validate",root,counterpart,foreground,atmosphere,below,above);
  }
  integrate {
    let returned_score = bridge("sound","frame",root,counterpart,foreground,atmosphere,returned_affinity,pulse,below,above);
  }
  choose {
    emit returned_score;
  }
  return {
    emit bridge("continuity","hold",turns);
  }
  transcend {
    emit bridge("continuity","next","double-mobius-return");
  }
}
$wtl2$::text, '{"native":true,"builtin":true,"adapter":"story-score","system":"wyrdrune-language"}'::jsonb, encode(digest(convert_to($wtl2$// Wayglass StorySoundscape · executable Wyrdrune score v0.1
// The Wyrdrune program is the composition engine. Transport and WebAudio are bridges.
// Two participants retain independent voices. Their declared affinity controls interval.
// The double Möbius is represented by a reciprocal pair and an unchanged return anchor.
mobius {
  perceive {
    let words = bridge("story","wordCount");
    let water = bridge("story","waterRatio");
    let wind = bridge("story","windRatio");
    let flame = bridge("story","flameRatio");
    let shadow = bridge("story","shadowRatio");
    let motion = bridge("story","motionRatio");
    let affinity = bridge("participants","affinity");
    let turns = bridge("story","turns");
  }
  compress {
    let density = words / (words + 32);
    let pulse = motion * 0.55 + wind * 0.20 + flame * 0.25;
    let memory = turns / (turns + 12);
  }
  release {
    let root = 132 + density * 60 + water * 42 + wind * 24 + flame * 48 - shadow * 20;
    let interval = 1.22 + affinity * 0.12;
    let counterpart = root * interval;
    let foreground = 0.014 + pulse * 0.021;
    let atmosphere = 0.006 + water * 0.009 + memory * 0.006;
    let below = 0.6 + memory * 7 + water * 2 + shadow * 4;
    let above = 22500 + wind * 3700 + flame * 4200 + motion * 2600 + affinity * 2500;
  }
  verify {
    emit bridge("sound","validate",root,counterpart,foreground,atmosphere,below,above);
  }
  integrate {
    let score = bridge("sound","frame",root,counterpart,foreground,atmosphere,affinity,pulse,below,above);
  }
  choose {
    emit score;
  }
  return {
    emit bridge("continuity","hold",turns);
  }
  transcend {
    emit bridge("continuity","next","double-mobius");
  }
}

// The second Möbius returns the counterpart's harmonic information.
// Identity and relationship names remain outside the score and retain their sources.
mobius {
  perceive {
    let returned_affinity = bridge("participants","affinity");
  }
  compress {
    let return_weight = returned_affinity * 0.016;
  }
  release {
    set root = root + counterpart * return_weight;
    set counterpart = counterpart + root * return_weight;
    set below = below + below * return_weight * 0.5;
    set above = above + counterpart * return_weight * 0.8;
  }
  verify {
    emit bridge("sound","validate",root,counterpart,foreground,atmosphere,below,above);
  }
  integrate {
    let returned_score = bridge("sound","frame",root,counterpart,foreground,atmosphere,returned_affinity,pulse,below,above);
  }
  choose {
    emit returned_score;
  }
  return {
    emit bridge("continuity","hold",turns);
  }
  transcend {
    emit bridge("continuity","next","double-mobius-return");
  }
}
$wtl2$::text,'UTF8'),'sha256'),'hex')),
('full-spectrum','Full Spectrum · Wyrdrune','Native Wyrdrune spectral field programme with sixteen-phase receipts, three bands, and a source-bound observer pipeline.', $wtl3$// Wayglass · FULL-SPECTRUM DOUBLE MÖBIUS · Wyrdrune v0.1
// Two eightfold transformations. Infrasound and ultrasound are mathematical
// spectral fields: neither is emitted into a speaker by this programme.
// Only WTL chooses frequencies, ratios, contours and coupling.

mobius {
 perceive {
  let energy = bridge("interaction","strength");
  let motion = bridge("interaction","motion");
  let continuity = bridge("interaction","continuity");
  let intent = bridge("interaction","intent");
  let affinity = bridge("participants","affinity");
  let phase = bridge("interaction","phase");
 }
 compress {
  let gravity = energy * 0.4 + continuity * 0.4 + motion * 0.2;
  let texture = intent * 0.42 + motion * 0.33 + energy * 0.25;
 }
 release {
  let below = 0.4 + gravity * 10.5 + phase * 2.1;
  let voice = 146 + texture * 326 + gravity * 62;
  let partner = voice * (1.18 + affinity * 0.16);
  let above = 22600 + texture * 9200 + phase * 2900 + intent * 2400;
  let bloom = energy * 0.62 + affinity * 0.18 + continuity * 0.20;
  let audible_gain = 0.009 + bloom * 0.017;
  let ambience_gain = 0.003 + (1 - gravity) * 0.009;
  let refraction = 0.18 + gravity * 0.48 + texture * 0.27;
  let granulation = 0.15 + texture * 0.45 + phase * 0.28;
  let tactile_ms = 12 + gravity * 21;
 }
 verify {
  emit bridge("spectrum","validate",below,voice,partner,above,bloom);
 }
 integrate {
  let first = bridge("spectrum","frame",below,voice,partner,above,bloom,affinity,phase,audible_gain,ambience_gain,refraction,granulation,tactile_ms);
 }
 choose {
  emit first;
 }
 return {
  emit bridge("continuity","hold","first-circuit");
 }
 transcend {
  emit bridge("continuity","next","reverse-face");
 }
}

mobius {
 perceive {
  let return_motion = bridge("interaction","motion");
 }
 compress {
  let twist = (affinity * 0.6 + continuity * 0.4) * 0.045;
 }
 release {
  set below = below + below * twist;
  set voice = voice + partner * twist;
  set partner = partner + voice * twist;
  set above = above + above * twist * 0.35;
  set bloom = bloom * (0.95 + return_motion * 0.05);
  set audible_gain = audible_gain + twist * 0.03;
  set ambience_gain = ambience_gain + twist * 0.02;
  set refraction = refraction + twist * 0.3;
  set granulation = granulation + twist * 0.18;
  set tactile_ms = tactile_ms + twist * 2;
 }
 verify {
  emit bridge("spectrum","validate",below,voice,partner,above,bloom);
 }
 integrate {
  let second = bridge("spectrum","frame",below,voice,partner,above,bloom,affinity,phase,audible_gain,ambience_gain,refraction,granulation,tactile_ms);
 }
 choose {
  emit second;
 }
 return {
  emit bridge("continuity","hold","second-circuit");
 }
 transcend {
  emit bridge("continuity","next","withness");
 }
}
$wtl3$::text, '{"native":true,"builtin":true,"adapter":"full-spectrum","system":"observer-science"}'::jsonb, encode(digest(convert_to($wtl3$// Wayglass · FULL-SPECTRUM DOUBLE MÖBIUS · Wyrdrune v0.1
// Two eightfold transformations. Infrasound and ultrasound are mathematical
// spectral fields: neither is emitted into a speaker by this programme.
// Only WTL chooses frequencies, ratios, contours and coupling.

mobius {
 perceive {
  let energy = bridge("interaction","strength");
  let motion = bridge("interaction","motion");
  let continuity = bridge("interaction","continuity");
  let intent = bridge("interaction","intent");
  let affinity = bridge("participants","affinity");
  let phase = bridge("interaction","phase");
 }
 compress {
  let gravity = energy * 0.4 + continuity * 0.4 + motion * 0.2;
  let texture = intent * 0.42 + motion * 0.33 + energy * 0.25;
 }
 release {
  let below = 0.4 + gravity * 10.5 + phase * 2.1;
  let voice = 146 + texture * 326 + gravity * 62;
  let partner = voice * (1.18 + affinity * 0.16);
  let above = 22600 + texture * 9200 + phase * 2900 + intent * 2400;
  let bloom = energy * 0.62 + affinity * 0.18 + continuity * 0.20;
  let audible_gain = 0.009 + bloom * 0.017;
  let ambience_gain = 0.003 + (1 - gravity) * 0.009;
  let refraction = 0.18 + gravity * 0.48 + texture * 0.27;
  let granulation = 0.15 + texture * 0.45 + phase * 0.28;
  let tactile_ms = 12 + gravity * 21;
 }
 verify {
  emit bridge("spectrum","validate",below,voice,partner,above,bloom);
 }
 integrate {
  let first = bridge("spectrum","frame",below,voice,partner,above,bloom,affinity,phase,audible_gain,ambience_gain,refraction,granulation,tactile_ms);
 }
 choose {
  emit first;
 }
 return {
  emit bridge("continuity","hold","first-circuit");
 }
 transcend {
  emit bridge("continuity","next","reverse-face");
 }
}

mobius {
 perceive {
  let return_motion = bridge("interaction","motion");
 }
 compress {
  let twist = (affinity * 0.6 + continuity * 0.4) * 0.045;
 }
 release {
  set below = below + below * twist;
  set voice = voice + partner * twist;
  set partner = partner + voice * twist;
  set above = above + above * twist * 0.35;
  set bloom = bloom * (0.95 + return_motion * 0.05);
  set audible_gain = audible_gain + twist * 0.03;
  set ambience_gain = ambience_gain + twist * 0.02;
  set refraction = refraction + twist * 0.3;
  set granulation = granulation + twist * 0.18;
  set tactile_ms = tactile_ms + twist * 2;
 }
 verify {
  emit bridge("spectrum","validate",below,voice,partner,above,bloom);
 }
 integrate {
  let second = bridge("spectrum","frame",below,voice,partner,above,bloom,affinity,phase,audible_gain,ambience_gain,refraction,granulation,tactile_ms);
 }
 choose {
  emit second;
 }
 return {
  emit bridge("continuity","hold","second-circuit");
 }
 transcend {
  emit bridge("continuity","next","withness");
 }
}
$wtl3$::text,'UTF8'),'sha256'),'hex')),
('resonance-atlas','Resonance Atlas · Four Scales','Native Wyrdrune four-scale atlas composing event, room, world and universe fields with return provenance.', $wtl4$// Wayglass Resonance Atlas v0.1 · executable Wyrdrune
// Multi-scale composition of observed numerical WTL spectral frames.
// Four levels: instant, room, world and universe. All fields remain
// attributable representations, not measured acoustics or minds.
// Two eightfold Möbius traversals: outward and reciprocal return.

mobius {
 perceive {
  let instant = bridge("atlas","instant");
  let room = bridge("atlas","room");
  let world = bridge("atlas","world");
  let universe = bridge("atlas","universe");
  let affinity = bridge("atlas","affinity");
  let phase = bridge("atlas","phase");
 }
 compress {
  let microDifference = (instant - room) * (instant - room);
  let roomDifference = (room - world) * (room - world);
  let worldDifference = (world - universe) * (world - universe);
  let coherence = 1 - microDifference * 0.40 - roomDifference * 0.35 - worldDifference * 0.25;
  let interference = 1 - coherence;
  let depth = instant * 0.10 + room * 0.20 + world * 0.30 + universe * 0.40;
  let detail = instant * 0.45 + room * 0.30 + world * 0.15 + universe * 0.10;
 }
 release {
  let below = 0.30 + depth * 8.2 + universe * 2.7;
  let voice = 116 + detail * 294 + coherence * 95;
  let partner = voice * (1.12 + affinity * 0.17);
  let above = 21500 + detail * 9250 + interference * 6600 + phase * 3200;
  let bloom = depth * 0.42 + coherence * 0.38 + detail * 0.20;
  let grain = detail * 0.61 + interference * 0.29;
  let flow = depth * 0.58 + coherence * 0.24 + universe * 0.18;
 }
 verify {
  emit bridge("atlas","validate",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 integrate {
  let outward = bridge("atlas","frame",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 choose {
  emit outward;
 }
 return {
  emit bridge("continuity","hold","outward");
 }
 transcend {
  emit bridge("continuity","next","reciprocal");
 }
}

mobius {
 perceive {
  let shared = bridge("atlas","affinity");
 }
 compress {
  let reciprocal = (shared * 0.50 + coherence * 0.35 + universe * 0.15) * 0.032;
 }
 release {
  set below = below + below * reciprocal;
  set voice = voice + partner * reciprocal;
  set partner = partner + voice * reciprocal;
  set above = above + above * reciprocal * 0.42;
  set bloom = bloom + interference * reciprocal * 0.2;
  set grain = grain + interference * reciprocal * 0.45;
  set flow = flow + coherence * reciprocal * 0.30;
 }
 verify {
  emit bridge("atlas","validate",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 integrate {
  let returned = bridge("atlas","frame",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 choose {
  emit returned;
 }
 return {
  emit bridge("continuity","hold","returned");
 }
 transcend {
  emit bridge("continuity","next","withness");
 }
}
$wtl4$::text, '{"native":true,"builtin":true,"adapter":"resonance-atlas","system":"observer-science"}'::jsonb, encode(digest(convert_to($wtl4$// Wayglass Resonance Atlas v0.1 · executable Wyrdrune
// Multi-scale composition of observed numerical WTL spectral frames.
// Four levels: instant, room, world and universe. All fields remain
// attributable representations, not measured acoustics or minds.
// Two eightfold Möbius traversals: outward and reciprocal return.

mobius {
 perceive {
  let instant = bridge("atlas","instant");
  let room = bridge("atlas","room");
  let world = bridge("atlas","world");
  let universe = bridge("atlas","universe");
  let affinity = bridge("atlas","affinity");
  let phase = bridge("atlas","phase");
 }
 compress {
  let microDifference = (instant - room) * (instant - room);
  let roomDifference = (room - world) * (room - world);
  let worldDifference = (world - universe) * (world - universe);
  let coherence = 1 - microDifference * 0.40 - roomDifference * 0.35 - worldDifference * 0.25;
  let interference = 1 - coherence;
  let depth = instant * 0.10 + room * 0.20 + world * 0.30 + universe * 0.40;
  let detail = instant * 0.45 + room * 0.30 + world * 0.15 + universe * 0.10;
 }
 release {
  let below = 0.30 + depth * 8.2 + universe * 2.7;
  let voice = 116 + detail * 294 + coherence * 95;
  let partner = voice * (1.12 + affinity * 0.17);
  let above = 21500 + detail * 9250 + interference * 6600 + phase * 3200;
  let bloom = depth * 0.42 + coherence * 0.38 + detail * 0.20;
  let grain = detail * 0.61 + interference * 0.29;
  let flow = depth * 0.58 + coherence * 0.24 + universe * 0.18;
 }
 verify {
  emit bridge("atlas","validate",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 integrate {
  let outward = bridge("atlas","frame",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 choose {
  emit outward;
 }
 return {
  emit bridge("continuity","hold","outward");
 }
 transcend {
  emit bridge("continuity","next","reciprocal");
 }
}

mobius {
 perceive {
  let shared = bridge("atlas","affinity");
 }
 compress {
  let reciprocal = (shared * 0.50 + coherence * 0.35 + universe * 0.15) * 0.032;
 }
 release {
  set below = below + below * reciprocal;
  set voice = voice + partner * reciprocal;
  set partner = partner + voice * reciprocal;
  set above = above + above * reciprocal * 0.42;
  set bloom = bloom + interference * reciprocal * 0.2;
  set grain = grain + interference * reciprocal * 0.45;
  set flow = flow + coherence * reciprocal * 0.30;
 }
 verify {
  emit bridge("atlas","validate",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 integrate {
  let returned = bridge("atlas","frame",below,voice,partner,above,coherence,interference,bloom,grain,flow);
 }
 choose {
  emit returned;
 }
 return {
  emit bridge("continuity","hold","returned");
 }
 transcend {
  emit bridge("continuity","next","withness");
 }
}
$wtl4$::text,'UTF8'),'sha256'),'hex'))
),
inserted as (
  insert into public.wayglass_programs (
    owner_key,slug,title,description,source,source_hash,metadata,version,status
  )
  select 'rowan',slug,title,description,source,source_hash,metadata,1,'ready'
  from builtins
  on conflict (owner_key,slug) do nothing
  returning program_id,owner_key,version,source,source_hash
)
insert into public.wayglass_program_revisions (
  program_id,owner_key,version,source,source_hash,change_note
)
select program_id,owner_key,version,source,source_hash,'Initial built-in Wayglass Wyrdrune programme'
from inserted;