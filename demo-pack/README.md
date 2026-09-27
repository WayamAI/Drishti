# Drishti client demo pack — "A week at Drishti Demo Healthcare"

A rehearsable demonstration built from the documents a hospital team really
works from. Instead of clicking around a pre-loaded screen, you play one
working week: new paperwork arrives from IT, procurement, identity and
security, it goes into Drishti, and the team works it to done — exactly the way
a customer's own team would.

Everything here is invented. No system, vendor, person or event is real, and
there is no patient data of any kind.

---

## What is in the pack

Each file is what a real department would hand the compliance team, shaped
exactly to Drishti's import contract.

| # | Arrives from | File | What it is |
|---|---|---|---|
| 1 | IT — new department go-live | `1-oncology-go-live/01_assets__it_handover.csv` | 4 new oncology systems |
| | Data governance | `…/02_phi-types__data_classification.csv` | 2 new PHI categories |
| | Integration team | `…/03_data-flows__interface_catalogue.csv` | 6 new interfaces, 3 unencrypted |
| | Risk committee | `…/04_risks__go_live_risk_assessment.csv` | The go-live risk assessment |
| 2 | Procurement | `2-vendor-register-refresh/vendors__q3_procurement_register.csv` | 4 newly contracted vendors |
| 3 | Identity & access | `3-monthly-access-review/access-grants__iam_export_oncology.csv` | Who was given access to the new systems |
| 4 | Security operations | `4-siem-alert-batch/threats__siem_overnight_export.csv` | Last night's alerts |
| 5 | "Someone's spreadsheet" | `5-rejected-file/vendors__register_with_mistakes.csv` | A file with five real-world mistakes |

`generate.mjs` writes all of them, with dates relative to the day you run it.

---

## Before the demo (15 minutes, on the day)

1. **Reset the demo tenant** so every session starts identical. In the backend
   (`MedGuard_Shield_Backend`):
   ```bash
   npm run db:demo:reset      # returns "Drishti Demo Healthcare" to its seeded state
   ```
   It only ever touches the demo organisation. First time on a new database,
   run `npm run db:seed:demo` instead.
2. **Regenerate the files** so tonight's alerts say "today":
   ```bash
   node demo-pack/generate.mjs
   ```
3. **Sign in once as each role** to check the passwords work. The accounts are
   created by the demo seed with the password in `DEMO_USER_PASSWORD`:

   | Role you play | Sign in as |
   |---|---|
   | Compliance officer (Administrator) | `admin@drishti.ai` |
   | Security analyst (Analyst) | `analyst@drishti.ai` |
   | Executive / auditor (Viewer) | `viewer@drishti.ai` |

4. Open the files folder in a window beside the browser — dragging a file onto
   the upload area is part of the show.

---

## The cast

The organisation already has twelve systems, five vendors and six people
(the seed). The ones who appear in this week's paperwork:

| Person | Who they are | Their part in the story |
|---|---|---|
| Dr. Lena Ortiz | Cardiologist, now covering oncology | The access that is *fine* — contrast for the others |
| Samuel Adeyemi | IT infrastructure lead | Administers the treatment planning system |
| Priya Raman | Revenue cycle analyst, no MFA | Given access to the pump gateway, never uses it |
| Tomas Brandt (contractor) | Deactivated radiology contractor | Somehow granted access to the new oncology EHR anyway |
| svc-analytics-sync | Data platform service account | ADMIN on the research registry, never used |

---

## Monday 08:45 — "What needs me this morning?"  *(Viewer, then Administrator)*

**Story.** Before any new paperwork, show the posture the team walks in to.

1. Sign in as **viewer** (`viewer@drishti.ai`). Land on **Dashboard**.
2. Point at the **Action Centre**: open critical threats, extreme-risk assets,
   vendors without a BAA, unencrypted flows, flagged access — worst first.
3. Note there are no action buttons anywhere: an executive or auditor can see
   everything and change nothing.
4. Sign out, sign in as **admin**. Same page, now with the tools to act.

**Say:** *"This is the one screen a CISO opens. Every line is a query you can
click into — nothing on it is a number somebody typed."*

---

## Monday 10:00 — Oncology goes live  *(Administrator)*

**Story.** The hospital opened a new oncology department. IT sends the system
list, data governance classifies the new data, integration sends its interface
catalogue, and the risk committee sends its go-live assessment. None of it has
been looked at together until now.

1. **Data Import** → *Record type* **Assets**. Show the **Columns** strip and
   **Download template** — this is how a customer's team gets the format.
2. **First, the mistake everyone makes.** Choose **Data Flows** and drop in
   `03_data-flows__interface_catalogue.csv` *before* the systems exist. Drishti
   refuses the whole file, e.g. *"No Asset found named "Oncology EHR Module".
   Create it first, then re-import."* — and the blue note under the picker
   already told you the order.
3. Now in order — each file shows **N rows ready to import**, a preview, and
   *"Checked only. Nothing has been written yet."* until you **Confirm Import**:
   1. **Assets** ← `01_assets__it_handover.csv` (4 rows)
   2. **PHI Types** ← `02_phi-types__data_classification.csv` (2 rows)
   3. **Data Flows** ← `03_data-flows__interface_catalogue.csv` (6 rows)
   4. **Risks** ← `04_risks__go_live_risk_assessment.csv` (4 rows)
4. After the flows file, choose **View Data Flows** → **PHI Flow**. The map now
   carries the oncology systems, and three new red ribbons: the pump gateway
   and the research registry send PHI unencrypted, and so does the new billing
   feed. The violations banner names one; **Open affected asset** goes to it.
5. After the risks file, open **Risk Register**. The four new systems landed in
   four different bands, scored by the engine from the committee's four
   judgements — the file cannot set a score or a band itself:

   | System | L · I · E · C | Score shown | Band |
   |---|---|---|---|
   | Oncology EHR Module | 2 · 5 · 3 · 2 | 9.6 | Low |
   | Radiation Therapy Planning | 3 · 4 · 3 · 4 | 23 *(23.04)* | Moderate |
   | Infusion Pump Gateway | 4 · 4 · 4 · 4 | 41 *(40.96)* | High |
   | Oncology Research Registry | 4 · 5 · 5 · 5 | 80 | Critical |

   The register shows one decimal; hover a score for the exact value.

**Say:** *"Four spreadsheets from four teams. Separately each one is fine.
Together they show a research copy of cancer treatment data, unencrypted and
never assessed, feeding the analytics warehouse."*

---

## Monday 14:00 — The quarterly vendor register  *(Administrator)*

**Story.** Procurement sends the vendors contracted this quarter.

1. **Data Import** → **Vendors** ← `vendors__q3_procurement_register.csv` → **Confirm Import**.
2. **View Vendors**. Filter **Missing**: *Meridose Oncology Software* — the
   dosing software the new department runs on — reaches 128,000 records with no
   BAA. **Expired**: *Courier Health Records Storage* holds 210,000.
3. Open *Meridose*. It shows **Not scored**: newly imported, never assessed —
   Drishti will not call an unassessed vendor safe. **Recompute risk** scores it.
4. **Raise remediation** — the finding opens pre-filled: *"Obtain a signed BAA
   from Meridose Oncology Software"*, severity High, linked to the vendor. Pick
   an owner and a due date → **Raise finding**.

**Say:** *"Under HIPAA, PHI with a vendor and no signed BAA is a violation on
its own — whether or not anything leaked. It is now owned, dated and on the
board."*

---

## Tuesday 09:30 — The monthly access review  *(Analyst)*

**Story.** Identity & access export who was given access to the new systems.

1. Import as **admin**: **Access Grants** ← `access-grants__iam_export_oncology.csv`.
   *(An analyst cannot import — sign in as analyst for the rest.)*
2. **Access & Identity** → **Flagged only**. The review is ordered by how much
   is wrong, not alphabetically:
   - **Tomas Brandt (contractor)** — deactivated, yet holds WRITE on the new
     Oncology EHR. His name is struck through.
   - **svc-analytics-sync** — ADMIN on the research registry, **Never used**.
   - **Priya Raman** — WRITE on the pump gateway, **Stale** (unused 140 days),
     **No MFA**.
   - Dr. Lena Ortiz's READ grant carries no finding — the clean one.
3. Work them the way a reviewer would:
   - Brandt → **Revoke**. Done on the spot.
   - svc-analytics-sync → **Reduce level** to READ.
   - Raman → **Raise remediation** — MFA has to be rolled out by someone else,
     so it becomes a tracked finding linked to the pump gateway.

**Say:** *"Access reviews usually live in a ticket queue and a spreadsheet.
Here the review, the fix and the evidence are the same click."*

---

## Wednesday 07:10 — Last night's SIEM alerts  *(Analyst)*

**Story.** Security operations export the overnight detections.

1. Import as **admin**: **Threats** ← `threats__siem_overnight_export.csv`.
   The **Threats** count in the menu goes up immediately.
2. Sign in as **analyst**. **Threats** leads with the new critical: *"Infusion
   pump gateway accepting unauthenticated commands"*. **View details**.
3. **Investigating** → then **Raise remediation**. The finding opens linked to
   the threat *and* the pump gateway, severity Critical, with a recommended
   action already written. Assign it, set a due date → **Raise finding**.
4. Show the others: a registry extract to personal cloud storage (High), an
   expired certificate on the claims gateway (High), after-hours chart access
   (Medium, already investigating), and a port scan closed as a **False
   positive** — the noise a real SIEM produces, kept for context but greyed.

**Say:** *"Detected, triaged, owned — and the finding points back at the
threat, so in six months anyone can see why it exists."*

---

## Thursday 11:00 — Following it to done  *(Analyst)*

1. **Remediation**. This week's findings sit beside the ones already open:
   Meridose BAA, Raman's MFA, the pump gateway.
2. Open the pump-gateway finding → **In progress**. Later → **Resolved**.
3. Open the BAA finding and show **Risk accepted** as a separate outcome:
   deciding to live with something is never counted as fixing it.

---

## Thursday 15:00 — The file that should be refused  *(Administrator)*

**Story.** Someone in finance "fixed" the vendor register in Excel.

1. **Data Import** → **Vendors** ← `vendors__register_with_mistakes.csv`.
2. Drishti refuses the whole file — **"5 problems found across 5 rows. Nothing
   was imported."** — and names each one:

   | Line | Problem Drishti reports |
   |---|---|
   | 2 | `baaStatus must be one of: SIGNED, PENDING, EXPIRED, MISSING. Got "UNSIGNED"` |
   | 3 | `lastAssessedAt must be YYYY-MM-DD, got "31/08/2026"` |
   | 4 | `name starts with "=", which spreadsheets treat as a formula. Remove the leading character.` |
   | 5 | `name is required` |
   | 6 | `Vendor "Northgate Claims Services" already exists, matched on name. Import only adds new records.` |

**Say:** *"A file with one bad row is refused whole. There is no such thing as a
half-imported register."*

---

## Friday 16:00 — Proving it to the auditor  *(Administrator, then Viewer)*

1. **Dashboard** as **admin** — **Recent activity**, beside the risk matrix,
   already tells the week's story in one glance: the imports ("Threats · 5
   rows"), the revoke, the threat moving to Investigating, the new findings,
   each with who did it and when. Choose **Audit trail** from that card.
2. **Audit Trail** — every event, including sign-ins, with who did it and
   when. Filter by **Imports**, then **Access**.
3. **Controls** and **Policies** — the safeguards and the documents that cite
   them, with their assessed status.
4. Back to **Dashboard** as **viewer**. The week's work shows in the Action
   Centre: the new criticals are owned, the revoked grant is gone from the
   flagged count. There is no activity feed here — the audit trail is for
   administrators only, and a viewer's dashboard does not even ask for it.

**Say:** *"The auditor's question is not 'are you secure', it is 'show me'.
This is the showing."*

---

## Short on time? The 10-minute cut

1. Monday 08:45 — Dashboard as viewer (1 min)
2. Oncology go-live — assets, flows, PHI Flow map (4 min)
3. Wednesday SIEM — pump gateway threat → **Raise remediation** (3 min)
4. The refused file (1 min)
5. Recent activity on the Dashboard, then Audit Trail (1 min)

---

## Good to know

- **Run the files once per reset.** Import only ever adds: the second time,
  every row reports *"already exists"* — which is correct, and a fine thing to
  show on purpose.
- **Order matters** only within the go-live: assets and PHI types before flows
  and risks. The other scenarios can run in any order after the go-live.
- **Imported vendors are not linked to systems** — the import contract has no
  column for it — so their *Systems reachable* reads 0 until linked in the app.
- **Nothing here is real**, and the dates move: regenerate on the day.
