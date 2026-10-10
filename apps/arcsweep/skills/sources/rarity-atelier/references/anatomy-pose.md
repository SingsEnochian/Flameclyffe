# Anatomy & Pose Bench

## Design goal

Use a library of templates to learn pose mechanics and body construction while keeping the new work recognisably its own design.

The source pose is evidence about balance, foreshortening, joint relationships, wing loading, weight distribution, silhouette and gesture. It is not an instruction to copy the finished source creature wholesale.

## Pose decomposition

Before rendering a new pose, identify:
- skull wedge and jaw mass;
- cervical curve;
- ribcage / pectoral mass;
- pelvis;
- shoulder and wing root;
- wing arm/digit fan or other source-specific structure;
- forelimb chain;
- hindlimb chain;
- tail axis and termination;
- major silhouette breaks.

Express these as volumes and axes before surface rendering.

## Species-lock checklist

For the target subject, explicitly carry forward any known invariants:
- limb count;
- digits per limb;
- wing count and attachment;
- horn/spine map;
- eye construction;
- tail termination;
- skull proportions;
- neck-to-ribcage proportion;
- forelimb/hindlimb proportion;
- stance mode (quadrupedal, perched, airborne, etc.);
- surface/material family.

Changing pose does not authorise changing these invariants.

## Inspiration distance

When deriving a new pose from a paid/source template:
1. retain the mechanical lesson;
2. alter at least several expressive variables when appropriate: camera, head turn, neck gesture, tail path, wing phase, limb timing, centre of gravity, object interaction;
3. preserve the target character's own proportions and anatomy;
4. do not recreate the source template line-for-line unless the user is explicitly colouring/customising that licensed template itself.

## Pre-render gate

Reject the sketch/study before polishing if:
- a new limb/digit appears;
- a tail blade, fin or fork changes without intent;
- wing roots migrate;
- torso becomes humanoid when the body plan is animal-first;
- object interaction forces hand anatomy the species does not have;
- the character identity changes because the generator found a more familiar dragon archetype.

Generated pose studies are disposable. Canon anatomy is not.
