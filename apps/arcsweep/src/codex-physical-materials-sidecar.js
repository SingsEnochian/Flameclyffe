import { installCodexDesignTokens } from './codex/codex-design-tokens.js';

export const CODEX_PHYSICAL_MATERIALS_SCHEMA = 'hearthweave.codex-physical-materials/v0.1';

let installed = false;

function installStyles() {
  if (document.getElementById('universal-codex-physical-materials')) return;
  const style = document.createElement('style');
  style.id = 'universal-codex-physical-materials';
  style.textContent = `
#arcsweep-magic-book[data-codex-alive] .magic-book-stage{
  background:
    radial-gradient(ellipse at 50% 16%,color-mix(in srgb,var(--codex-ocean-700) 15%,transparent),transparent 55%),
    linear-gradient(180deg,color-mix(in srgb,var(--codex-abyss-1000) 72%,transparent),transparent 44%);
}

#arcsweep-magic-book[data-codex-alive] .magic-book-spread{
  border-color:color-mix(in srgb,var(--codex-old-gold) 28%,var(--codex-gunmetal))!important;
  background:
    radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--codex-old-gold) 8%,transparent),transparent 42%),
    linear-gradient(90deg,
      color-mix(in srgb,var(--codex-abyss-1000) 88%,#090604) 0%,
      color-mix(in srgb,var(--codex-copper) 17%,var(--codex-abyss-1000)) 3%,
      var(--codex-abyss-1000) 9%,
      color-mix(in srgb,var(--codex-abyss-1000) 92%,#020303) 50%,
      var(--codex-abyss-1000) 91%,
      color-mix(in srgb,var(--codex-copper) 17%,var(--codex-abyss-1000)) 97%,
      color-mix(in srgb,var(--codex-abyss-1000) 88%,#090604) 100%)!important;
  box-shadow:
    0 30px 80px rgba(0,0,0,.64),
    0 8px 20px rgba(0,0,0,.52),
    inset 0 0 0 1px color-mix(in srgb,var(--codex-copper) 20%,transparent),
    inset 0 0 0 4px color-mix(in srgb,var(--codex-gunmetal) 35%,transparent),
    var(--codex-shadow-inset)!important;
}

#arcsweep-magic-book[data-codex-alive] .magic-book-spread::after{
  border-color:color-mix(in srgb,var(--codex-copper) 28%,transparent)!important;
  box-shadow:inset 0 0 24px rgba(0,0,0,.58),0 0 0 1px color-mix(in srgb,var(--codex-old-gold) 5%,transparent)!important;
}

#arcsweep-magic-book[data-codex-alive] .magic-book-page{
  border-color:color-mix(in srgb,var(--codex-old-gold) 17%,var(--codex-stone-600))!important;
  background:
    linear-gradient(180deg,rgba(255,255,255,.006),transparent 18%),
    radial-gradient(circle at 50% 8%,color-mix(in srgb,var(--codex-seafoam-300) 4%,transparent),transparent 35%),
    linear-gradient(180deg,
      color-mix(in srgb,var(--codex-ocean-900) 32%,#111a17) 0%,
      color-mix(in srgb,var(--codex-abyss-1000) 34%,#111a17) 46%,
      color-mix(in srgb,var(--codex-abyss-1000) 48%,#0c1411) 100%)!important;
  box-shadow:
    inset 0 0 40px rgba(0,0,0,.26),
    inset 0 0 0 1px rgba(255,255,255,.014),
    inset 0 0 18px rgba(103,198,193,var(--codex-wear-fibre-depth,.02)),
    0 2px 0 color-mix(in srgb,var(--codex-old-gold) 7%,transparent)!important;
}

#arcsweep-magic-book[data-codex-alive] .magic-book-page::after{
  border-color:color-mix(in srgb,var(--codex-copper) 16%,var(--codex-stone-600))!important;
  opacity:calc(.62 + var(--codex-wear-edge-opacity,0));
}

#arcsweep-magic-book[data-codex-alive] .magic-book-left::before,
#arcsweep-magic-book[data-codex-alive] .magic-book-right::before{
  background:repeating-linear-gradient(180deg,
    color-mix(in srgb,var(--codex-old-gold) 18%,var(--codex-stone-600)) 0 1px,
    color-mix(in srgb,var(--codex-ocean-900) 38%,var(--codex-gunmetal)) 1px 3px)!important;
  opacity:calc(.56 + var(--codex-wear-edge-opacity,0));
}

#arcsweep-magic-book[data-codex-alive] .magic-book-spread::before{
  background:linear-gradient(90deg,
    transparent,
    rgba(0,0,0,.62) 43%,
    color-mix(in srgb,var(--codex-old-gold) 7%,transparent) 50%,
    rgba(0,0,0,.62) 57%,
    transparent)!important;
}

#arcsweep-magic-book[data-codex-alive] .magic-book-page h1,
#arcsweep-magic-book[data-codex-alive] .magic-book-page h2,
#arcsweep-magic-book[data-codex-alive] .magic-book-page h3{
  color:color-mix(in srgb,var(--codex-champagne) 76%,var(--codex-foam-100));
  text-shadow:0 1px 0 rgba(0,0,0,.32);
}

#arcsweep-magic-book[data-codex-alive] .magic-book-page p,
#arcsweep-magic-book[data-codex-alive] .magic-book-page li,
#arcsweep-magic-book[data-codex-alive] .magic-book-page label{
  color:color-mix(in srgb,var(--codex-foam-100) 72%,var(--codex-champagne));
}

#arcsweep-magic-book[data-codex-alive] .magic-book-page small,
#arcsweep-magic-book[data-codex-alive] .magic-book-page .muted{
  color:color-mix(in srgb,var(--codex-lilac-300) 54%,var(--codex-stone-600));
}

#arcsweep-magic-book[data-codex-alive] .universal-codex-control-dock{
  border-color:color-mix(in srgb,var(--codex-champagne) 26%,transparent)!important;
  background:
    linear-gradient(145deg,color-mix(in srgb,var(--codex-glass-smoke) 86%,transparent),color-mix(in srgb,var(--codex-glass-teal) 32%,transparent))!important;
  box-shadow:var(--codex-shadow-glass),var(--codex-shadow-inset)!important;
  color:var(--codex-foam-100)!important;
  backdrop-filter:blur(16px) saturate(108%)!important;
}

#arcsweep-magic-book[data-codex-alive] .universal-codex-control-dock button{
  border-color:color-mix(in srgb,var(--codex-silver) 18%,transparent)!important;
  background:color-mix(in srgb,var(--codex-glass-smoke) 42%,transparent)!important;
  color:color-mix(in srgb,var(--codex-foam-100) 82%,var(--codex-champagne))!important;
  box-shadow:none!important;
}

#arcsweep-magic-book[data-codex-alive] .universal-codex-control-dock button[aria-pressed="true"]{
  border-color:color-mix(in srgb,var(--codex-teal-500) 48%,var(--codex-champagne))!important;
  background:color-mix(in srgb,var(--codex-glass-teal) 44%,transparent)!important;
  box-shadow:0 0 10px color-mix(in srgb,var(--codex-teal-500) 9%,transparent)!important;
}

/* Semantic wear is deliberately subtle. History changes the object; it does not smear dirt across it. */
#arcsweep-magic-book[data-codex-wear="familiar"] .magic-book-page{
  background-blend-mode:soft-light,normal,normal!important;
}
#arcsweep-magic-book[data-codex-wear="deep"] .magic-book-page{
  background-blend-mode:soft-light,normal,normal!important;
  outline:1px solid color-mix(in srgb,var(--codex-old-gold) 4%,transparent);
  outline-offset:-.55rem;
}

@media(prefers-reduced-motion:reduce){
  #arcsweep-magic-book[data-codex-alive] .magic-book-page,
  #arcsweep-magic-book[data-codex-alive] .magic-book-spread,
  #arcsweep-magic-book[data-codex-alive] .universal-codex-control-dock{transition:none!important;animation:none!important}
}
`;
  document.head.append(style);
}

export function installCodexPhysicalMaterials() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installCodexDesignTokens(document);
  installStyles();
}

if (typeof document !== 'undefined') installCodexPhysicalMaterials();
