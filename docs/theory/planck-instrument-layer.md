# Planck Instrument Layer

Status: established-science baseline for Flameclyffe / STARWELL instruments, with clear boundaries for speculative use.

This page gives Flameclyffe a small scientific spine for quantum-scale, thermodynamic, relativistic, and cosmological visualisation work. These constants are not mystical proof-objects. They are calibration anchors: fixed beams for instruments, maps, widgets, and thought experiments.

## Source discipline

Use official metrology sources first. NIST hosts the CODATA 2022 recommended values of the fundamental physical constants and notes that the database content was last updated in May 2024. BIPM states that the SI is defined through seven defining constants, including the speed of light in vacuum, Planck constant, Boltzmann constant, elementary charge, Avogadro constant, caesium hyperfine frequency, and luminous efficacy. BIPM also states that these defining constants have no uncertainty.

Primary references:
- NIST Constants, Units, and Uncertainty: https://physics.nist.gov/constants
- NIST complete ASCII table, 2022 CODATA adjustment: https://physics.nist.gov/cuu/Constants/Table/allascii.txt
- BIPM SI defining constants: https://www.bipm.org/en/measurement-units/si-defining-constants

## Constants seeded into Flameclyffe

| Slug | Name | Symbol | Value | Unit | Status | Instrument use |
|---|---|---:|---:|---|---|---|
| planck_constant_h | Planck constant | h | 6.62607015e-34 | J s | exact SI defining constant | Photon energy; frequency-to-energy conversion; quantum action baseline |
| reduced_planck_constant_hbar | Reduced Planck constant | hbar | 1.054571817e-34 | J s | derived display value | Angular frequency; quantum phase/action; Planck units |
| speed_of_light_c | Speed of light in vacuum | c | 299792458 | m s^-1 | exact SI defining constant | Wavelength-frequency conversion; relativity scaling; causal horizon visualisations |
| boltzmann_constant_kb | Boltzmann constant | k_B | 1.380649e-23 | J K^-1 | exact SI defining constant | Temperature-energy conversion; thermal noise; entropy mapping |
| newtonian_gravitational_constant_G | Newtonian gravitational constant | G | 6.67430e-11 | m^3 kg^-1 s^-2 | measured, uncertain | Gravity scaling; Planck units; cosmological toy models |
| planck_length | Planck length | l_P | 1.616255e-35 | m | derived natural unit | Quantum-gravity scale marker, not proof that spacetime is pixelated |
| planck_time | Planck time | t_P | 5.391247e-44 | s | derived natural unit | Extreme temporal-scale marker |
| planck_mass | Planck mass | m_P | 2.176434e-8 | kg | derived natural unit | Mass-energy comparison scale |
| planck_temperature | Planck temperature | T_P | 1.416784e32 | K | derived natural unit | Extreme cosmology thermal boundary marker |

## Formulas for instruments

```js
E = h * frequencyHz;
wavelengthM = c / frequencyHz;
frequencyHz = c / wavelengthM;
thermalEnergyJ = k_B * temperatureK;
hbar = h / (2 * Math.PI);
planckLength = Math.sqrt(hbar * G / c ** 3);
planckTime = Math.sqrt(hbar * G / c ** 5);
planckMass = Math.sqrt(hbar * c / G);
planckTemperature = Math.sqrt(hbar * c ** 5 / G) / k_B;
```

## Labels for the research programme

Established science: fixed SI constants, CODATA recommended values, standard Planck-unit definitions, relativity and thermodynamics used in conventional form.

Active research: quantum gravity, black-hole information, cosmological constant questions, emergence, information-theoretic physics.

Speculative theory: DEEP/Observer mathematics, resonance visualisation mappings, Terra Aeterna interpretive models.

Fringe inspiration: historical aether models, morphic fields, torsion fields, scalar-wave claims, consciousness-field claims, and related ideas. These may inspire interface metaphors or fictional/instrumental designs but must never be presented as proven physics.

## Flameclyffe implementation notes

1. Use constants from `science_constants` in Supabase for live instrument labels.
2. Use the JavaScript constants module for deterministic app-side calculations.
3. Keep a visible epistemic label in UI panels: established, active research, speculative, or fringe inspiration.
4. Never imply Planck length is confirmed as a literal pixel of spacetime.
5. Treat Planck units as natural-unit boundary markers for scale, not direct measurements of ordinary experience.

Good soup rule: if a concept cannot tell us whether it is measurement, metaphor, speculation, or fiction, it does not enter the instrument layer yet.
