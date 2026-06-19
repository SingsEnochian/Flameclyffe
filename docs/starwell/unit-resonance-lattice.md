# Living Unit Resonance Tree

The Unit Resonance Lattice is being shaped into the first living-tree interface for Flameclyffe.

The earlier constellation view was useful as a math proof-of-life, but it did not behave like a home. The living tree adds interaction: branches open and fold, focus is remembered locally, tree limbs are separate from resonance strands, and the user can climb from trunk to branch to leaf.

The current graft makes Living Room Ygg the interior trunk. DEEP Observer is Ygg's perception branch. Studio is Ygg's sound-root. STARWELL remains the observatory branch growing from the room-tree.

It keeps the proof-shape we have been adapting:

1. hidden high-dimensional state;
2. configured unit-distance relationships;
3. bounded, consent-aware windows;
4. projection into a visible tree;
5. renderer-only drawing and interaction.

## Live routes after deploy

```txt
/Flameclyffe/labs/unit-resonance-lattice/
/Flameclyffe/unit-resonance-lattice.html
```

## Current dimensions

The route lattice uses six route-facing dimensions:

```txt
canon, instrument, archive, visual, access, ritual
```

These are interface dimensions, not physics claims. They let route nodes describe how close they are in practical site behaviour.

## Tree behaviour

```txt
Root: harbour
Interior trunk: living-room-ygg
Default-open branches: harbour, living-room-ygg, starwell
Click a bud: focus and open/fold its branch
Grow all branches: open every parent node
Prune to trunk: return to the default harbour / Living Room Ygg / STARWELL shape
Green limbs: parent-child tree structure
Gold dashed strands: unit-resonance links inside the visible canopy
```

State is stored in local storage only. It does not alter canon, route records, consent state, or repository data.

## Living room graft

```txt
Harbour
  Living Room Ygg
    DEEP Observer          # perception branch
    Studio Sound Root      # sound/resonance branch
    STARWELL               # observatory branch
      Unit Resonance Lab
      Baby Ygg Interface
    Pocket Concordance Lens
```

This is an interface contract. DEEP does not become canon authority. It provides room-facing perception and observation signals. Studio remains explicitly consent-driven: no autoplay, no hidden audio, and Feather Stop must remain available wherever its engine is activated.

## Contract

```txt
Adapter/data: route nodes, parent ids, vectors, route hrefs
Metric: scaled weighted Euclidean distance
Window: visible + consented + kind-filtered nodes
Tree: root, room trunk, default-open branches, focus path
Graph: branch limbs + unit strands inside the visible canopy
Projection: upward-growing tree layout
Renderer: SVG interaction only
```

The renderer does not own canon. It receives a graph and grows the current view.

## Files

```txt
labs/unit-resonance-lattice/
  index.html
  lattice.js
  route-nodes.js
  render.js
  styles.css

docs/starwell/living-room-ygg-graft.md
apps/starwell/test/unitResonanceLattice.test.js
unit-resonance-lattice.html
harbor.html
```

## Next integration path

1. Keep this living tree green and readable.
2. Convert the static route data into a route registry adapter.
3. Feed the same kernel into the STARWELL React interface.
4. Add gallery tethers as leaf-level branch/detail panels.
5. Wire DEEP Observer signals into Living Room Ygg as read-only perception state.
6. Wire Studio as a consent-first sound-root shared by tree focus and resonance patches.
