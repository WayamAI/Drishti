# Drishti — 3D icon list for Google Flow (cards, badges, states)

The first 46 marks came from an earlier generation brief (in git history as
`DRISHTI_3D_ICON_PROMPTS.md`); this list covers what the cards, tiles and
status surfaces still need. Every prompt below is **complete and paste-ready** — the style prefix is
already built in, so each one produces a mark that sits beside the existing
set without looking like it came from a different studio.

Read §1 once. Then work down §4 in order.

---

## 0. Update — 15 of these came from the Wayam Assets Figma library

The Wayam Assets file (page **Iconography**, 544 icons) already had
matching renders for 15 of the slugs below. They are imported and live, so
**skip their prompts**. Only the **Glossy 3D** style was taken: its
Isometric Plinth, Slate and Line styles would clash with this set.

| Slug | Figma icon (node) | Used on |
|---|---|---|
| `investigating` | stage-rca (24:1232) | Threats › Investigating |
| `flagged` | stage-denial (24:614) | Access › Flagged |
| `noMfa` | mark-auth-key (24:97) | Access › Without MFA |
| `staleAccess` | status-queued (24:1305) | Access › Stale or never used |
| `members` | nav-profile-glossy (24:1187) | Identities & Members › Drishti members |
| `organisation` | stage-payer (24:642) | Identities & Members › Organisation |
| `inProgress` | status-in-progress (24:694) | Remediation › In progress |
| `baaGap` | sys-disconnected (24:1336) | Vendors › Without a valid BAA |
| `emptyNotifications` | empty-inbox (24:857) | Notifications panel |
| `appearance` | sys-theme (24:1378) | imported, not yet placed |
| `reopened` | stage-retry (24:1246) | imported, not yet placed |
| `falsePositive` | status-cancelled (24:1263) | imported, not yet placed |
| `riskAccepted` | approval-risk (24:833) | imported, not yet placed |
| `baaSigned` | approval-signoff (24:847) | imported, not yet placed |
| `baaExpired` | mid-cred-expiry (24:1023) | imported, not yet placed |

The Figma sources are 256px, so keep them off hero surfaces (88px and up).

**Still to generate in Flow (14):** `baaPending`, `baaMissing`, `neverUsed`,
`inactiveIdentity`, `excessiveAccess`, `controlPartial`, `controlIneffective`,
`policyReview`, `policyDraft`, and the five `band*` re-renders (§4.5). Check
the Figma library first whenever it grows; generate only what it lacks.

---

## 1. How to generate in Google Flow

1. One prompt per image. Never ask for two objects or a grid of icons.
2. **Square frame.** Use a 1:1 output if Flow offers it for images; if it only
   gives 16:9, generate anyway and keep the object dead centre — the build
   script trims to the object, so the extra width is discarded.
3. Generate 4 variants, keep the one whose **silhouette** reads best at thumbnail
   size. Detail does not survive; shape does.
4. **Backdrop must be plain** — flat dark graphite or flat white, nothing else
   in frame. Image models cannot output transparency; the build script keys a
   plain backdrop out (it floods in from the edges, so graphite *inside* the
   object is kept). A gradient, floor, or shadow pool breaks the key.
5. **Watermark.** Flow marks its renders with a small sparkle in the
   bottom-right corner — it is visible on the existing login backdrop source.
   Keep the object well away from that corner, and check each built icon; if
   the sparkle survives the trim, crop it off the source before building.
6. Name each keeper by its **slug** from the tables below (e.g. `noMfa.jpg`)
   and put it in `3D Icons/`. See §5 for the build.

### Acceptance — check every render before keeping it

- [ ] One object, centred, nothing else in frame
- [ ] Drishti orange `#F97316` is the only colour (except §4.5, the bands)
- [ ] Rim light on the upper-left edge — without it the object vanishes in dark mode
- [ ] Reads at 40px: shrink it and look. If you have to explain it, reroll it
- [ ] No text, numbers, letters, logos, faces, or medical red crosses
- [ ] Looks like it belongs next to `control`, `threat` and `remediation`

---

## 2. Where every card and badge stands today

**Have** = an existing render fits honestly and will be wired in now.
**New** = needs generating (§4). Table badges (12px) stay text — a render is
mud at that size — so badge *concepts* get marks for their 28px+ surfaces:
drawer headers, KPI tiles, confirmations and toasts.

### 2.1 KPI tiles — all 36

| Page | Tile | Mark | |
|---|---|---|---|
| Dashboard | Assets monitored | `kpiAssets` | Have |
| Dashboard | Critical or extreme | `kpiCritical` | Have |
| Dashboard | PHI records / day | `phi` | Have |
| Dashboard | Unencrypted flows | `kpiUnencrypted` | Have |
| Threats | Open threats | `threat` | Have |
| Threats | Open critical | `kpiCritical` | Have |
| Threats | Investigating | `investigating` | Figma |
| Threats | Resolved | `success` | Have |
| Access | Access grants | `identity` | Have |
| Access | Flagged | `flagged` | Figma |
| Access | Without MFA | `noMfa` | Figma |
| Access | Stale or never used | `staleAccess` | Figma |
| PHI Flow | Flows mapped | `dataFlow` | Have |
| PHI Flow | Violations | `kpiUnencrypted` | Have |
| PHI Flow | Warnings | `warning` | Have |
| PHI Flow | PHI in transit today | `phi` | Have |
| Assets | Assets | `kpiAssets` | Have |
| Assets | PHI records | `phi` | Have |
| Assets | Unencrypted | `kpiUnencrypted` | Have |
| Assets | Critical or extreme | `kpiCritical` | Have |
| Vendors | Vendors | `vendor` | Have |
| Vendors | Without a valid BAA | `baaGap` | Figma |
| Vendors | Assessment overdue | `clock` | Have |
| Vendors | PHI records exposed | `phi` | Have |
| Risk Register | Assets scored | `risk` | Have |
| Risk Register | Critical or extreme | `kpiCritical` | Have |
| Risk Register | High | `bandHigh` | Have — re-render in §4.5 |
| Risk Register | Highest score | `chart` | Have |
| Remediation | Awaiting work | `remediation` | Have |
| Remediation | In progress | `loading` | Have |
| Remediation | Overdue | `clock` | Have |
| Remediation | Closed | `success` | Have |
| Identities & Members | Identities | `identity` | Have |
| Identities & Members | Drishti members | `members` | Figma |
| Identities & Members | Assets | `kpiAssets` | Have |
| Identities & Members | Organisation | `organisation` | Figma |

Controls and Policies have no KPI row yet; §4.4 includes the marks for one.

### 2.2 Status and badge concepts

| Concept | States | Marks |
|---|---|---|
| Threat status | Open · Investigating · Resolved · False positive | `threat` · `investigating` · `success` · **`falsePositive`** |
| Finding status | Open · In progress · Resolved · Risk accepted · Reopened | `remediation` · `loading` · `success` · **`riskAccepted`** · **`reopened`** |
| BAA status | Signed · Pending · Expired · Missing | **`baaSigned`** · **`baaPending`** · **`baaExpired`** · **`baaMissing`** |
| Access findings | Stale · Never used · No MFA · Inactive identity · Excessive level | `staleAccess` · **`neverUsed`** · `noMfa` · **`inactiveIdentity`** · **`excessiveAccess`** |
| Encryption | Encrypted · Unencrypted | `control` · `kpiUnencrypted` (have) |
| Control status | Implemented · Partial · Not implemented · Ineffective | `control` · **`controlPartial`** · `emptyControls` · **`controlIneffective`** |
| Policy status | Active · Under review · Draft · Review overdue | `policy` · **`policyReview`** · **`policyDraft`** · `clock` |
| Risk band | Extreme · Critical · High · Moderate · Low | re-render all five — §4.5 |

### 2.3 Other card surfaces

| Surface | Mark | |
|---|---|---|
| Drawer headers (threat, asset, vendor, risk, grant, finding, control, policy, audit) | the domain mark of each | Have |
| Data Import record-type choices (7) | `asset` `phi` `dataFlow` `vendor` `identity` `threat` `risk` | Have |
| Settings → Your account | `identity` | Have |
| Settings → Appearance | `appearance` | Figma |
| Notifications panel, empty | `emptyNotifications` | Figma |

---

## 3. The recipe (already inside every prompt below)

Colour lock: Drishti orange `#F97316` body, `#FDBA74` rim, `#C2410C` recesses,
graphite `#18181B` as the only second material. Same key light, same camera
height, same satin-polymer finish as the first 46 — so the sets mix.

---

## 4. The prompts

Twenty-eight renders. Priority order: §4.1 fills the KPI tiles you can see
today; the rest unlock status marks, the Controls/Policies KPI rows and the
corrected band scale.

### 4.1 KPI tiles (8) — do these first

**`investigating`** — Threats › Investigating; threat status "Investigating"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 round magnifying lens held over a small graphite radar dish, the lens slightly tilted as if examining one contact — scrutiny, not alarm
```

**`flagged`** — Access › Flagged
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 pennant flag on a short graphite pole planted in a small graphite block — marked for review, a single flag, no emblem on it
```

**`noMfa`** — Access › Without MFA; access finding "No MFA"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 lock plate with two keyholes side by side, one graphite key inserted in the left keyhole and the right keyhole conspicuously empty — one factor where two are required
```

**`staleAccess`** — Access › Stale or never used; access finding "Stale"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 hourglass in a graphite frame with every grain of sand run through to the bottom bulb — time has passed, access left unused
```

**`baaGap`** — Vendors › Without a valid BAA
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 thick contract slab with physical ruled grooves and a round graphite wax seal broken cleanly in two — an agreement that does not hold, no readable text
```

**`members`** — Identities & Members › Drishti members
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: three faceless 3D person busts in a tight overlapping group, the front bust Drishti-orange #F97316 and the two behind it graphite — a team of accounts, same bust style as the single identity mark, no facial features
```

**`organisation`** — Identities & Members › Organisation
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 campus of two connected building blocks of different heights joined by a skybridge, standing on one graphite base plate — our own organisation, visibly different from the single external vendor office block, no signage, no medical cross
```

**`appearance`** — Settings › Appearance
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D disc on a small graphite stand, split vertically down the middle — the left half glossy Drishti-orange #F97316, the right half matte graphite — light and dark in one object
```

### 4.2 Threat and finding status (3)

**`falsePositive`** — threat status "False positive"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 radar scope dish whose single contact blip has gone dull graphite with a thin orange ring around it — detected, checked, and dismissed, calm not alarming
```

**`riskAccepted`** — finding status "Risk accepted"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 balance scale on a graphite column, its two pans resting perfectly level — the risk was weighed and deliberately accepted, not fixed
```

**`reopened`** — finding status "Reopened"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 thick ribbon bent into a loop that curves back on itself with a single arrowhead returning to its start, graphite core — the work came back
```

### 4.3 BAA and access findings (7)

**`baaSigned`** — BAA "Signed"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 thick contract slab with physical ruled grooves and an intact round graphite wax seal pressed into its lower corner — a binding agreement in force, no readable text
```

**`baaPending`** — BAA "Pending"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 thick contract slab with physical ruled grooves and an empty circular recess where the seal will go, a small graphite hourglass resting on it — awaiting signature
```

**`baaExpired`** — BAA "Expired"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 thick contract slab with its top corner curled over and a graphite wax seal that is cracked and faded — an agreement that has lapsed, no readable text
```

**`baaMissing`** — BAA "Missing"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: an empty 3D graphite document tray with Drishti-orange #F97316 rails and a clearly vacant slot where a contract should sit — there is no agreement at all
```

**`neverUsed`** — access finding "Never used"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 access key card still sealed inside a graphite sleeve, the sleeve's pull tab untouched — issued, never taken out
```

**`inactiveIdentity`** — access finding "Inactive identity"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a faceless 3D person bust rendered almost entirely in matte graphite, with only a thin Drishti-orange #F97316 outline tracing its edge — a deactivated identity that still exists, same bust style as the identity mark
```

**`excessiveAccess`** — access finding "Excessive level"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: an oversized 3D Drishti-orange #F97316 master key, far too large for the small graphite lock beside it — more access than the job needs
```

### 4.4 Controls and Policies (4) — for their KPI rows and status

**`controlPartial`** — control "Partial"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 padlock with its graphite shackle pushed only halfway down into the body — engaged, but not fully locked; same padlock as the control mark
```

**`controlIneffective`** — control effectiveness "Ineffective"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a closed 3D Drishti-orange #F97316 padlock with a clean fracture running through its body to a dark ember #431407 interior — in place, but it would not hold; same padlock as the control mark
```

**`policyReview`** — policy "Under review"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 barrier gate with a round graphite-framed magnifying lens resting against it — the policy is being examined; same barrier as the policy mark
```

**`policyDraft`** — policy "Draft"
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 barrier gate still half-assembled, one graphite post standing and the crossbar lying beside it waiting to be fitted — not yet in force
```

### 4.5 Risk bands (5) — re-render in the validated colours

The existing band markers used the old severity colours (Low was blue,
Moderate brown), which contradict the band badges and the risk matrix. Same
object, same camera, only the colour changes. These are the only prompts that
leave the orange lock, because here the band *is* the colour. Render all five
from one rig; if one is off, rerun the set.

**`bandLow`**
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no watermarks, no extra props. Subject: a 3D band marker monolith in deep green #2B7046 with a soft lighter rim on the upper-left edge, standing on a graphite #18181B plinth, the shortest of a five-step scale
```

**`bandModerate`**
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no watermarks, no extra props. Subject: a 3D band marker monolith in warm yellow #FFD22D with a soft lighter rim on the upper-left edge, standing on a graphite #18181B plinth, second step of a five-step scale, slightly taller than the lowest
```

**`bandHigh`**
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no watermarks, no extra props. Subject: a 3D band marker monolith in bright orange #FF7B1C with a soft lighter rim on the upper-left edge, standing on a graphite #18181B plinth, middle step of a five-step scale
```

**`bandCritical`**
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no watermarks, no extra props. Subject: a 3D band marker monolith in red #C62830 with a soft lighter rim on the upper-left edge, standing on a graphite #18181B plinth, fourth step of a five-step scale, one step below the tallest
```

**`bandExtreme`**
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no watermarks, no extra props. Subject: a 3D band marker monolith in very deep red #4B0D10 with a clearly visible lighter red rim on the upper-left edge so it does not disappear on a dark page, standing on a graphite #18181B plinth, the tallest of a five-step scale, a faint ember glow in its core
```

### 4.6 Notifications (1)

**`emptyNotifications`** — the notifications panel when there is nothing new
```
3D product icon, one object, centered, 1:1 square, studio key light from upper left, plain flat dark graphite #111113 backdrop with nothing else in frame, Drishti orange #F97316 as the only chromatic color with #FDBA74 rim light on the upper-left contour and #C2410C recesses, graphite #18181B as the only second material, satin polymer with a single glass specular, crisp silhouette readable at 40px, no text, no letters, no numbers, no logos, no faces, no watermarks, no extra props. Subject: a 3D Drishti-orange #F97316 bell resting upright and perfectly still, its graphite clapper hanging centred — quiet, nothing to report
```

---

## 5. Getting them into the app

The source folder and build script are not on `main`; they are kept under the
`archive/feat-ui-overhaul` tag. Bring them into a working copy first:
`git checkout archive/feat-ui-overhaul -- "3D Icons" scripts`.

1. Save each keeper as `3D Icons/<slug>.jpg` (the slug is the bold name above).
2. Add one line per slug to `MAP` in `scripts/build-3d-icons.mjs`
   (`noMfa: "noMfa.jpg",`) and the slug to `ICON_3D_NAMES` in
   `src/lib/icons3d.ts`. For §4.5, point the existing `band*` slugs at the new
   files.
3. `node scripts/build-3d-icons.mjs` — writes `public/brand/icons-3d/`.
4. Check each output on both themes (the §1 checklist), then wire it to the
   slot named in §2.

---

## 6. What deliberately stays text

Severity, band, status and BAA **badges inside table rows** stay text pills.
At 12px a render is an orange smudge, it cannot recolour, and a row with five
images in it is noise. The marks above carry the same concepts where there is
room to see them.
