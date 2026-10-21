---
version: 1
slug: "capstone-frontend-src-app-page-tsx"
primary_target: "capstone-frontend/src/app/page.tsx"
related_targets: []
---

Brief: Full-Bleed Sky-Blue Portal Canvas + De-Containerized Spotlight & 2-Column Job Grid (Seed Key: 579b9428)

## Design Direction Contract
1. **Top Navbar (Header visible with Logo & Auth, Center Nav Hidden at Top & Revealed on Scroll)**: Fixed navbar (`fixed top-0 inset-x-0 z-40 transition-all duration-300`). At the top (`scrollY <= 20`), the header is transparent (`bg-transparent`) showing the `TM` brand mark on the left and `Recruiter Portal | Log in | Sign up` on the right, while the center `<nav>` (`Home`, `Explore`, `Bookmark`) is hidden (`opacity-0 -translate-y-2 pointer-events-none`). When scrolled (`scrollY > 20`), the header turns into solid `bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs`, and the center `<nav>` smoothly reveals into view (`opacity-100 translate-y-0 pointer-events-auto`) with `#2196F3` active indicator on `Home`.
2. **Bold `#1988f5` Blue Hero Stage**: Full-width rich blue hero banner (matching `Login.png` & `Sign up.png`) with subtle 48px architectural grid lines, crisp single-color white headline ("Find the job that fits your skills, not just your keywords."), sky-tinted `#e0f2fe` subtitle, and translucent clickable Popular Search chips.
3. **Floating Pill Search Command Bar**: Elevated white pill bar (`-mt-9 sm:-mt-10`) bridging directly between the bottom edge of the `#1988f5` blue hero and the full-bleed `#e3f1fe` sky-blue canvas below (zero flat white gap between them), featuring a keyword input with a circular `#2196F3` search submit button on the left and `Job Type | Category | Salary range` dropdowns on the right.
4. **De-Containerized Full-Bleed `#e3f1fe` Open Positions Stage (Matches `Applicant portal.png` Canvas)**:
   - **Full-Bleed `#e3f1fe` Ground (No Middle Wrapper Box, No Outer White Gutters)**: Removed the intermediate `rounded-[2.25rem]` box wrapper and outer `#ffffff` page gutters so the `#e3f1fe` sky-blue canvas runs edge-to-edge below the hero and search bar, with a compact section header and white-pill department filter strip sitting directly on `#e3f1fe`.
   - **Featured Role Split Spotlight Card (`Login.png` Blue-and-White Split)**: Top featured role presented as a 12-column split card directly on `#e3f1fe`, with a `#1988f5` blue left panel (department icon, `Monthly Compensation` in bold tabular numerals, and work-mode pills) and a `#ffffff` white right panel (role title, location, bookmark button, concise role summary, borderless sky-blue skill pills, and `#2196F3` `Apply this job ->` CTA).
   - **2-Column `Applicant portal.png` Job Cards**: Clean white `rounded-3xl` cards directly on the `#e3f1fe` canvas below the spotlight role using strictly the Talent Match Blue (`#1988f5` / `#2196F3`), Sky-Blue (`#e1f0fe` / `#f0f7ff`), White (`#ffffff`), and Slate (`#1e293b`) palette (plus `#16a34a` green for relative timestamps).
5. **Portal Redirect Handoff**: Submitting the search bar, clicking any popular chip, or clicking any job card redirects directly to `/careers` with query parameters (`q`, `type`, `category`, `salary`, `jobId`).
6. **Footer**: Clean white footer containing system name (`Talent Match` brand mark + copyright), complete navigation links (`Home`, `Explore Jobs`, `Bookmarks`, `Applicant Portal`, `Recruiter Portal`), and interactive `Terms of Service` / `Privacy Policy` accessible dialogs.

## Dominant — TYPE / MATERIAL / GROUND
- **TYPE**: `Geist Sans` bold display and card titles (`font-bold tracking-tight`), tabular numerals (`tabular-nums`) for salary ranges and role counts.
- **MATERIAL**: Elevated `#ffffff` pill and card surfaces (`rounded-3xl`) and a `#1988f5` blue split spotlight panel resting directly on the full-bleed `#e3f1fe` sky-blue portal canvas.
- **GROUND**: `#1988f5` hero banner + full-bleed `#e3f1fe` sky-blue portal canvas + `#ffffff` navbar/footer.
