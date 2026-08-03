# PREMAQ Cosmology Structural-Law Stress Tests

**Status:** Review fixture  
**Date:** 2026-08-03  
**Scope:** KBC local underdensity, DESI gigaparsec anisotropy, cosmological-principle registry, model comparison, unknown preservation, receipts and replay

## Governing rule

A challenged background law remains a usable mathematical object. Observations remain intact. Unknown parameters remain inside the equations. A failed or domain-limited test changes the registered status of the law in the tested domain.

```text
observation
→ derived statistic
→ null-model comparison
→ competing-model family
→ domain-scoped law status
→ receipt
```

## 1. KBC local underdensity

The observational object is a radial density field around the Local Group:

\[
\delta(r)=\frac{\rho(r)-\bar\rho}{\bar\rho}.
\]

The literature also uses the positive underdensity convention:

\[
\delta_{\mathrm{void}}(r)=1-\frac{\rho(r)}{\bar\rho}.
\]

The reported KBC value for the 40–300 Mpc region is:

\[
\delta_{\mathrm{void}}=0.46\pm0.06.
\]

The profile remains parameterised:

\[
\delta(r;\theta_v),
\qquad
\theta_v=\{\delta_0,r_0,\text{profile shape},\text{centre offset}\}.
\]

The local expansion model is:

\[
H_{\mathrm{local}}(z)=H_{\mathrm{background}}(z)+\Delta H_{\mathrm{void}}(z;\theta_v).
\]

A KBC-like profile generates predictions for galaxy density, luminosity density, peculiar velocity, bulk flow, luminosity distance, baryon acoustic scale and redshift-binned inferred expansion.

PREMAQ stores the layers separately:

```text
OBSERVED
  galaxy counts
  luminosity density
  redshifts
  distance indicators
  peculiar velocities
  survey mask and selection function

DERIVED
  radial density contrast
  bulk-flow field
  redshift-binned H0

MODEL-INTERPRETED
  void profile parameters
  Lambda-CDM likelihood
  modified-gravity likelihood
  Hubble-tension contribution
```

Unresolved profile parameters produce a prediction family:

\[
\mathcal H(z)=\{H_{\mathrm{local}}(z;\theta_v)\mid\theta_v\in\Theta_v\}.
\]

## 2. DESI gigaparsec anisotropy

The Nature analysis applies the Angular Distribution of Pairwise Distances to DESI galaxy samples and detects directional coherence extending to scales of order one gigaparsec. The reported signal exceeds isotropic controls and geometry-matched Lambda-CDM mocks at conservative significance above 3 sigma.

Let galaxy positions be:

\[
\mathbf r_i\in\mathbb R^3.
\]

For each pair:

\[
\mathbf d_{ij}=\mathbf r_j-\mathbf r_i,
\qquad
r_{ij}=\lVert\mathbf d_{ij}\rVert,
\qquad
\widehat{\mathbf d}_{ij}=\frac{\mathbf d_{ij}}{\lVert\mathbf d_{ij}\rVert}.
\]

Under statistical isotropy, the conditional angular distribution at fixed separation satisfies:

\[
P(\widehat{\mathbf d}\mid r)=\frac{1}{4\pi}
\]

up to the registered survey geometry, mask, selection function and estimator response.

Define the directional departure field:

\[
\Delta_{\Omega}(r,\widehat{\mathbf d})=P_{\mathrm{data}}(\widehat{\mathbf d}\mid r)-P_{\mathrm{null}}(\widehat{\mathbf d}\mid r).
\]

A PREMAQ-side anisotropy statistic is:

\[
\mathcal T(r)=\int_{S^2}\frac{\Delta_{\Omega}(r,\widehat{\mathbf d})^2}{\operatorname{Var}_{\mathrm{null}}(r,\widehat{\mathbf d})}\,d\Omega.
\]

The published ADPD statistic and covariance implementation remain authoritative for replay.

PREMAQ stores:

```text
OBSERVED
  galaxy catalogue
  positions and redshifts
  survey footprint
  angular completeness
  target selection

DERIVED
  pair separations
  pair directions
  ADPD bins
  covariance
  test statistic

MODEL-COMPARATIVE
  isotropic controls
  geometry-matched Lambda-CDM mocks
  significance
  scale dependence
```

The result establishes persistent anisotropy in the analysed DESI samples under the registered statistic and controls. It does not establish global anisotropy outside the analysed domain.

## 3. Structural-law registry

A scientific principle used as a model assumption receives a versioned registry entry:

```json
{
  "law_id": "cosmological-principle",
  "statement": "The universe is statistically homogeneous and isotropic above the registered scale.",
  "scope": "large-scale matter distribution",
  "status": "UNDER_TEST",
  "null_models": [],
  "tests": [],
  "violations": [],
  "surviving_domains": [],
  "version": "1.0.0"
}
```

Registered statuses:

```text
ACTIVE
UNDER_TEST
DOMAIN_LIMITED
REVISED
REJECTED
```

A failed test changes the law status in the tested domain. It does not rewrite source observations, delete successful predictions in other domains or invalidate equations that retain explanatory and predictive power.

## 4. Model comparison packet

Every structural-law test produces:

\[
\mathcal C=(D,M_0,M_1,S,\Omega,\Pi)
\]

where:

- \(D\) is immutable data and survey description;
- \(M_0\) is the registered null model;
- \(M_1\) is the competing model family;
- \(S\) is the statistic and covariance method;
- \(\Omega\) is the tested domain;
- \(\Pi\) is provenance, software, calibration and receipt metadata.

The comparison records:

\[
\mathcal L(D\mid M_0),
\qquad
\mathcal L(D\mid M_1,\theta),
\qquad
\Theta_{\mathrm{allowed}}=\{\theta:\text{acceptance rule satisfied}\}.
\]

Unknown parameters remain inside \(M_1\). Their presence does not cancel the comparison.

## 5. PREMAQ implementation requirements

1. PREMAQ represents laws and assumptions as versioned objects, not invisible premises.
2. Every test records its spatial, temporal, survey and estimator domain.
3. Observations, derived statistics, model comparisons and ontology claims remain separate.
4. Survey masks and selection functions travel with the receipt.
5. Null models and mock-generation versions remain replayable.
6. Unknown model parameters remain symbolic, bounded, distributed or set-valued.
7. A model failure changes model status; it does not erase the observation.
8. A law survives in every domain where its registered tests remain satisfied.
9. Current-reality projection reports the exact tested claim and domain.
10. World projections inherit the same source packet without converting model conflict into external causal certainty.

## 6. Acceptance tests

1. A KBC profile with unresolved radius and depth produces a prediction envelope.
2. No void-profile midpoint enters without a receipt.
3. DESI anisotropy replay preserves catalogue, mask, estimator, covariance, mocks and statistic version.
4. A cosmological-principle test updates only the registered test domain.
5. `UNDER_TEST` remains operational and does not block downstream mathematics.
6. Observational anisotropy and global ontology remain separately classified.
7. Competing cosmological models receive the same immutable observational packet.
8. Model comparison never overwrites galaxy catalogue data.
9. Structural-law status changes append to the receipt chain.
10. Source articles and primary papers remain linked through provenance records.

## 7. Source records

- New Scientist article 2426698, local cosmic void.
- Haslbauer, Banik and Kroupa, *Monthly Notices of the Royal Astronomical Society* 499, 2845–2883 (2020), DOI `10.1093/mnras/staa2348`.
- Mazurenko, Banik and Kroupa, *Monthly Notices of the Royal Astronomical Society* 536, 3232–3241 (2025), DOI `10.1093/mnras/stae2758`.
- New Scientist article 2581589, cosmological principle.
- Sylos Labini and Galoppo, *Nature* 655, 327–331 (2026), DOI `10.1038/s41586-026-10702-5`.
