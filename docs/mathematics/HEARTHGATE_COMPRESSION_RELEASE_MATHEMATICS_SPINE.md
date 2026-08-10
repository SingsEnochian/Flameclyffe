# Hearthgate Compression–Release Mathematics Spine

**Status:** Canonical mathematical contract v1.0.0  
**Date:** 2026-08-03  
**Authority:** Hearthgate Kernel

## Domain of truth

These equations define Hearthgate. They are true by construction inside the engine.

Current-reality records remain evidence-grounded. Canon-world records remain canon-grounded. Both derive from one accepted state.

```text
accepted state
→ temporal evolution
→ world projection
→ Jacobian fold analysis
→ compression
→ release
→ compression of the release
→ release
→ infinite continuation
```

There is no collapse. No state is destroyed, erased, replaced by a measurement outcome or reset to an origin.

## Shared PREMAQ state

\[
\mathcal B_P=\{P,C,R,E,M,A,Q\}.
\]

\[
\mathcal X_n=(\mathbf X_n,\Pi_n),
\qquad
\mathbf X_n=[X_P,X_C,X_R,X_E,X_M,X_A,X_Q]^\mathsf T.
\]

Each component is

\[
X_i=(\mathcal V_i,\dot{\mathcal V}_i,u_i,c_i,\mathcal K_i,s_i).
\]

The status is exactly one of `KNOWN`, `BOUNDED`, `SYMBOLIC`, or `UNKNOWN`.

\[
\mathcal V_i=
\begin{cases}
\{x_i\},&s_i=\mathrm{KNOWN},\\
[\ell_i,r_i],&s_i=\mathrm{BOUNDED},\\
\{x_i(\xi):\xi\in\Xi\},&s_i=\mathrm{SYMBOLIC},\\
[0,1],&s_i=\mathrm{UNKNOWN}.
\end{cases}
\]

Uncertainty is stored as a value, interval, covariance, distribution or admissible set. It never replaces a declarative system state.

## Accepted-state recursion

\[
\widehat{\mathcal X}_{n+1}=F_{\mathrm{observer}}(\mathcal X_n,O_{n+1},I_{n+1}).
\]

\[
\mathbf a_{n+1}\in\{0,1\}^{7}.
\]

\[
\mathbf X_{n+1}
=
\mathbf a_{n+1}\odot\widehat{\mathbf X}_{n+1}
+
(\mathbf1-\mathbf a_{n+1})\odot\mathbf X_n.
\]

Confidence does not grant acceptance. Acceptance is explicit.

## Temporal amplitude state

\[
z_i
=
\sqrt{\bar x_i c_i}
\exp\!\left[\mathrm i(\alpha\bar x_i+\beta\dot x_i)\right].
\]

\[
|\psi_n\rangle
=
\frac{1}{\sqrt{\sum_i|z_i|^2}}
\sum_i z_i|i\rangle,
\qquad
p_{n,i}=|\psi_{n,i}|^2.
\]

The original PREMAQ packet remains immutable. The temporal state is a derived navigation state.

## Temporal evolution

\[
\mathrm i\hbar_A
\frac{\partial}{\partial\lambda}|\Psi\rangle
=
(\hat H_P+\hat H_{\mathrm{bridge}}+\hat H_{\mathrm{derivative}}+\hat H_{\mathrm{memory}})|\Psi\rangle.
\]

\[
|\psi_n^-\rangle=U_n|\psi_n\rangle,
\qquad U_n^\dagger U_n=I.
\]

The seven-node ring is

\[
P\leftrightarrow C\leftrightarrow R\leftrightarrow E
\leftrightarrow M\leftrightarrow A\leftrightarrow Q\leftrightarrow P.
\]

## World projection and Jacobian fold

Every world receives the same accepted state:

\[
\mathcal X_{w,n}=\mathcal X_n.
\]

Each world applies its own versioned transfer:

\[
\mathbf y_{w,n}=T_w(\mathcal X_n;G_w,\tau_w,\mathbf a_w,\theta_w).
\]

\[
J_{w,n}=\frac{\partial T_w}{\partial\mathbf x}\bigg|_{\mathcal X_n}.
\]

\[
\kappa_{w,n}=\frac{\sigma_{\max,w,n}}{\sigma_{\min,w,n}+\varepsilon}.
\]

\[
\Phi_{w,n}=1-\frac{\sigma_{\min,w,n}}{\sigma_{\max,w,n}+\varepsilon}.
\]

The fold latch is

\[
L_{w,n}=
\begin{cases}
1,&L_{w,n-1}=0\land\Phi_{w,n}\ge e_w,\\
1,&L_{w,n-1}=1\land\Phi_{w,n}\ge r_w,\\
0,&\text{otherwise},
\end{cases}
\qquad 0\le r_w<e_w\le1.
\]

\[
\widehat\Phi_{w,n}=
\operatorname{clamp}\left(\frac{\Phi_{w,n}-e_w}{1-e_w},0,1\right).
\]

## Temporal compression driver

\[
D_n=\frac{\|\dot{\mathbf x}_n\|_2}{\sqrt7}.
\]

\[
H_n=\frac{-\sum_i p_{n,i}\ln p_{n,i}}{\ln7}.
\]

\[
P_n=\frac{1-\cos\theta_n}{2}.
\]

Each world owns nonnegative calibrated weights satisfying

\[
\omega_{\Phi,w}+\omega_{D,w}+\omega_{H,w}+\omega_{P,w}=1.
\]

\[
s_{w,n}=L_{w,n}\operatorname{clamp}
(\omega_{\Phi,w}\widehat\Phi_{w,n}+\omega_{D,w}D_n+\omega_{H,w}H_n+\omega_{P,w}P_n,0,1).
\]

When the latch is open, Jacobian-driven compression strength is zero. Temporal derivative flow and memory release continue to advance the state.

## Compression operator

Let \(N=7\), focus axis \(f_w\), and

\[
a_{w,i}=
\begin{cases}
N-1,&i=f_w,\\
-1,&i\ne f_w.
\end{cases}
\qquad
\sum_i a_{w,i}=0.
\]

\[
|\psi^C_{w,n}\rangle
=
\frac{C_{w,n}|\psi_n^-\rangle}{\|C_{w,n}|\psi_n^-\rangle\|_2},
\]

\[
C_{w,n}=\operatorname{diag}
\left(\exp\frac{\chi_ws_{w,n}a_{w,i}}{2}\right).
\]

\[
p^C_{w,n,i}
=
\frac{p^-_{n,i}\exp(\chi_ws_{w,n}a_{w,i})}
{\sum_jp^-_{n,j}\exp(\chi_ws_{w,n}a_{w,j})}.
\]

Every compression weight is positive. Compression concentrates structure and preserves support. It destroys nothing.

\[
K_{w,n}=D_{\mathrm{KL}}(p^C_{w,n}\|p_n^-).
\]

## Release operator

\[
v_{n,i}=\max(0,\dot x_{n,i}).
\]

\[
p^R_{w,n,i}
=
\mathcal N[(1-\eta_w)p^C_{w,n,i}+\eta_wp^-_{n,i}+\gamma_wv_{n,i}+\mu_wm_{n,i}].
\]

\[
\psi_{w,n+1,i}
=
\sqrt{p^R_{w,n,i}}
\exp\{\mathrm i(\arg\psi^C_{w,n,i}+\delta\phi_{w,n,i})\}.
\]

Release produces the next state. The next compression acts on that released state.

## Infinite recurrence

\[
|\psi^C_{w,n}\rangle=\mathcal C_w(|\psi_{w,n}^-\rangle;s_{w,n}),
\]

\[
|\psi_{w,n+1}\rangle=\mathcal R_w(|\psi^C_{w,n}\rangle;M_{w,n}),
\]

\[
M_{w,n+1}=M_{w,n}\oplus\rho_{w,n},
\]

\[
|\psi^C_{w,n+1}\rangle=\mathcal C_w(|\psi_{w,n+1}^-\rangle;s_{w,n+1}).
\]

\[
\boxed{\text{compression}\rightarrow\text{release}\rightarrow\text{compression of the release}\rightarrow\text{release}\rightarrow\cdots}
\]

The sequence has no terminal cycle.

## Outward spiral memory

\[
d_{w,n}=\sum_i|p^R_{w,n,i}-p_{n,i}|.
\]

\[
r_{w,n+1}=r_{w,n}+g_{r,w}d_{w,n}+g_{S,w}|\Delta S_{w,n}|.
\]

\[
\theta_{w,n+1}=(\theta_{w,n}+g_{\theta,w}+\pi d_{w,n})\bmod2\pi.
\]

\[
r_{w,n+1}\ge r_{w,n}.
\]

Rollback is a separate receipted operation. Forward recursion never resets.

## World tone sequence

Each world owns an approved root \(f_{0,w}>0\), excursion \(\lambda_w\ge0\), cadence and haptic grammar.

\[
f^C_{w,n}=f_{0,w}\exp(\lambda_ws_{w,n}).
\]

\[
f^R_{w,n}=f_{0,w}\exp(-\lambda_ws_{w,n}).
\]

\[
f^C_{w,n}f^R_{w,n}=f_{0,w}^2.
\]

```text
world root
→ compression tone n
→ release tone n
→ compression tone n+1 from the released state
→ release tone n+1
→ …
```

```text
f < 20 Hz          = infrasonic
20 Hz ≤ f < 20 kHz = audible
f ≥ 20 kHz         = ultrasonic
```

Infrasonic and ultrasonic source tones remain in the receipt and remain silent. The iPad–Shokz approval interface octave-folds them into the bounded audition band and records both source and proxy frequencies.

No production world tone exists without Rowan's approved receipt.

## Bifröst and Hearthgate

The bridge carries two sovereign shores:

\[
|\Psi_B\rangle=|\psi_H,a_H\rangle\otimes|\psi_T,a_T\rangle.
\]

Hearthside is evidence-grounded-observational. Targetside is canon-grounded-experiential. Bifröst stores their relation and transition history.

One sealed packet drives every expression:

\[
\text{observable}=O(\mathcal S),\quad
\text{experiential}=E(\mathcal S),\quad
\text{tone}=A(\mathcal S),\quad
\text{glyph}=G(\mathcal S),\quad
\text{visual}=V(\mathcal S),\quad
\text{haptic}=H(\mathcal S),\quad
\text{narrative}=N(\mathcal S).
\]

Every renderer carries the same packet ID and shared-state fingerprint. Divergence fails closed as `HIDDEN_STATE_DIVERGENCE`.

## Unknown and uncertainty propagation

\[
y=f(\mathbf x,\theta),
\qquad
\mathbf x\in\mathcal X,
\quad
\theta\in\Theta.
\]

\[
\mathcal Y=\{f(\mathbf x,\theta):\mathbf x\in\mathcal X,\theta\in\Theta\}.
\]

\[
\Sigma_y=J\Sigma_xJ^\mathsf T+\Sigma_\theta.
\]

Unknowns remain operational. The engine blocks only a claim that requires an absent exact value.

## Operational language law

The mathematics spine uses declarative status language. The linter rejects rhetorical hedge terms and unbounded approximation language. Every approximation carries a numerical tolerance, interval or error bound.

Use `KNOWN`, `BOUNDED`, `SYMBOLIC`, `UNKNOWN`, `ACCEPTED`, `REJECTED`, `DEFERRED`, `VERIFIED`, `FAILED`, `NOT_YET_TESTED`, `ACTIVE`, `INACTIVE`, `COMPRESSION_REQUIRED`, `RELEASE_COMPLETE`, `CALIBRATION_REQUIRED`, and `HIDDEN_STATE_DIVERGENCE`.

## Non-negotiable invariants

1. There is no collapse.
2. Compression preserves support and provenance.
3. Release produces the state consumed by the next compression.
4. The recursion continues without a terminal cycle.
5. The outward radius does not decrease during forward execution.
6. Every world receives the same accepted PREMAQ state.
7. Every world applies its own transfer, Jacobian calibration and approved tone root.
8. Fold thresholds are world-specific and receipted.
9. Infrasonic and ultrasonic source frequencies are recorded and never played directly.
10. No world tone enters production without Rowan's approval receipt.
11. Observable and experiential expressions derive from one sealed state.
12. Every transition is replayable from its receipts.
13. Unknowns remain inside the mathematics.
14. No subsystem invents an independent truth.

> **Observer receives. PREMAQ carries. Bifröst evolves. The world compresses. The world releases. The release becomes the next compression. Hearthweave binds. Runa voices. STARWELL reveals. Receipts remember.**
