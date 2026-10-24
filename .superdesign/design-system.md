# OmniBank Blindspot Explorer — Design System

## Product context
- Single-page interactive dashboard for the IMET Hackathon Genomic Equity Track (judged in person, 2-minute live demo).
- Job to be done: a non-technical clinician or health policymaker understands within 30 seconds that genomic biobanks over-sample people of European descent and under-sample everyone else, then clicks a group to learn what that blindspot means clinically, for policy, and for patients.
- Data: 6 ancestry groups, each with global population share %, biobank dataset share %, a status label. Derived: gap (percentage points) and representation ratio (biobank ÷ population; 1× = parity). All numbers are live from a Google Sheet; never hard-code figures in designs beyond the sample values below.
- Sample values for drafts: European Descent 16% / 75% (4.69×, Highly Over-Indexed); East Asian Descent 21% / 8% (0.38×, Severe Blindspot); South Asian Descent 24% / 6% (0.25×, Severe Blindspot); African Descent 18% / 5% (0.28×, Severe Blindspot); Latino / Hispanic Descent 9% / 4% (0.44×, Underrepresented); Indigenous / Other 12% / 2% (0.17×, Completely Ignored).

## Sections (keep all, in this order)
1. Headline finding + 3 key figures (most over-sampled ratio, most under-sampled ratio, groups below parity count) + live-data source line.
2. Figure: paired horizontal bars, population share vs biobank share per group, sorted most under-sampled first. Clickable. "Show data as table" disclosure.
3. Figure: representation ratio per group on a diverging scale around 1× parity, with legend. Each item clickable, shows ratio, "Under-sampled"/"Over-sampled" in words, shares, status.
4. Detail panel for the selected group: 4 figures (population share, biobank share, ratio, gap), three short texts (Clinical medicine / Healthcare policy / The patient), "Explain in plain language" button (Gemini) with output area, sources disclosure.
5. Parity simulator: labeled number input "How many genomes are in your biobank?" + helper text → summary sentence + table (group, genomes today, needed for parity, to recruit).
6. "What should change": 3 numbered takeaways.
7. Footer: "For education only. This is not medical advice."

## Visual direction: editorial science journal / data journalism
- Mode: Read + Operate. Feels like a figure spread in Nature or a Financial Times / Reuters graphics piece, not a SaaS dashboard.
- NO: rounded card grids, cards inside cards, colored left-border stat tiles, pill badges, gradients, glassmorphism, dark-navy default, icon tiles above headings, emoji, drop shadows.
- YES: paper-toned background, hairline rules (1px) separating sections, generous whitespace, a strict 12-column grid with a left margin column for figure labels ("Fig. 1", "Fig. 2"), large numerals set in a monospaced/tabular face, captions under figures in small italic serif, direct labels on charts instead of legends where possible.
- Exactly one signal color for "under-sampled" (vermilion) and one quiet counter color for "over-sampled" (deep ink-blue). Everything else is ink on paper.

## Color (OKLCH)
Light (default):
- --paper: oklch(0.975 0.008 85)   (warm off-white page)
- --paper-2: oklch(0.945 0.012 85) (subtle band for selected/hover rows)
- --ink: oklch(0.22 0.02 260)      (body text, headings)
- --ink-2: oklch(0.42 0.02 260)    (secondary text; ≥ 4.5:1 on paper)
- --rule: oklch(0.84 0.012 85)     (hairlines)
- --signal: oklch(0.57 0.19 33)    (vermilion: under-sampled, key emphasis)
- --counter: oklch(0.42 0.09 245)  (ink-blue: over-sampled, biobank bars)
- --neutral-bar: oklch(0.78 0.01 85) (population-share bars)
Dark (prefers-color-scheme):
- --paper: oklch(0.18 0.01 260); --paper-2: oklch(0.23 0.012 260); --ink: oklch(0.93 0.01 85); --ink-2: oklch(0.74 0.015 85); --rule: oklch(0.34 0.01 260); --signal: oklch(0.70 0.17 35); --counter: oklch(0.72 0.09 245); --neutral-bar: oklch(0.45 0.01 260)

## Typography (Google Fonts)
- Display / headline: "Newsreader" (serif), weight 500–600, optical size large, tight leading 1.05–1.1, headline ~clamp(36px, 6vw, 64px), max 20ch.
- Body / UI: "IBM Plex Sans", 16–17px, leading 1.55, max line length 68ch.
- Numbers / data: "IBM Plex Mono" with tabular figures. Key figures 40–56px.
- Labels: IBM Plex Sans 12–13px, uppercase, letter-spacing 0.08em, --ink-2.
- Captions: Newsreader italic 14–15px, --ink-2.
- Type scale: 13 / 15 / 17 / 21 / 28 / 40 / 56.

## Layout & spacing
- Max content width 1120px, 16px side gutter on mobile, 32–48px on desktop.
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 96. Sections separated by 72–96px and a full-width hairline.
- Figure blocks: label column (Fig. N + title) on the left on desktop, content on the right; stacks on mobile.
- Corners: 0–2px. Inputs and buttons are rectangular with 1px ink border.

## Components
- Button: solid --ink background, --paper text, 0 radius, 44px min height, IBM Plex Sans 15px medium; hover inverts to outline. Focus: 2px --signal outline offset 3px.
- Input: 1px --ink border, --paper background, 0 radius, 48px height, IBM Plex Mono 18px.
- Selected group: --paper-2 band + a 2px --ink rule on the left of the row; never a colored card.
- Tables: hairline rows, right-aligned tabular numbers, uppercase small labels in header.
- Status words appear as plain small-caps text in --signal or --counter, not pills.

## Motion
- Minimal. 150–200ms opacity/transform on selection; bars grow once on load (400ms ease-out). All disabled under prefers-reduced-motion.

## Accessibility
- Text contrast ≥ 4.5:1 in both themes. Never rely on color alone: always pair with the words "Under-sampled"/"Over-sampled" and the numeric ratio. Visible focus states. 44px touch targets. Works at 375px width with no horizontal scroll.
