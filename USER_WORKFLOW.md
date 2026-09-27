# Drishti — how to use it

A walkthrough written for the person doing the clicking. It is organised by
**what you are trying to get done**, because that is how people arrive at the
product. Every label in **bold** is what the screen actually says.

---

## Who uses Drishti, and for what

| Role | Typically | Comes to Drishti to | Can |
|---|---|---|---|
| **Administrator** | Privacy / compliance officer, CISO | Own the posture: load the estate, set policy, prove it to auditors | Everything, including **Data Import** and the **Audit Trail** |
| **Analyst** | Security or privacy analyst | Work what is live: triage threats, review access, drive fixes to done | Read everything; change threats, grants, findings, control assessments |
| **Viewer** | Executive, auditor, department head | See where the risk is, and whether it is being handled | Read-only. Action buttons are not shown |

Your role is under your name at the bottom of the left-hand menu. Screens a
role cannot use are left out of the menu rather than shown and refused.

---

## Before you start

Engineering runs two things: the app (the sign-in page loads) and the API
behind it (pages show numbers rather than an explanation that the API is
unreachable). If the API is down the app says so on each screen; it never
shows invented figures.

**Signing in.** Open the app, enter your **Email address** and **Password**,
and choose **Sign in**. The eye icon reveals the password. Demo accounts for
each role come from the backend seed — see `DRISHTI_DEMO_OPERATIONS.md`.

A reload keeps you signed in. If the session genuinely ends you return to
sign-in with **"Your session ended. Please sign in again to continue."**
Sign out with the exit icon beside your name.

---

## Finding your way around

**The menu** (left) is grouped by the job:

| Group | Screens |
|---|---|
| **Overview** | **Dashboard** |
| **Monitor** | **Threats** (red count = open threats), **Access & Identity**, **PHI Flow** |
| **Inventory** | **Assets**, **Vendors** |
| **Risk** | **Risk Register**, **Remediation** |
| **Governance** | **Controls**, **Policies**, **Audit Trail** *(admin)* |
| **Admin** | **Data Import** *(admin)*, **Identities & Members**, **Settings** |

The icon at the top right of the menu collapses it to icons; the sun/moon
beside your name switches light and dark.

**The top bar** says where you are (group · page). On the right: **Search**,
the **Live** pill (click it to refresh every figure now), and the bell.

**Search — Ctrl K (⌘K on Mac)** opens one box for everything. Type to jump to
a page, or two or more characters to search assets, vendors, risks, threats,
identities, findings, controls and policies across the whole estate. Arrow
keys move, Enter opens the record itself.

**Every list opens a record in a side panel.** The panel is part of the
address, so a copied link opens the same record for a colleague.

---

## 1. "What needs attention right now?" — every role

1. Open **Dashboard** (*Governance Overview*). Four figures lead: **Assets
   monitored**, **Critical or extreme**, **PHI records / day**, **Unencrypted
   flows**. Each is clickable.
2. **Action Centre**, directly below, lists every unresolved finding across
   the estate, worst first — e.g. **Open critical threats 2**, **Assets at
   extreme risk 1**, **Vendors without a valid BAA 4**, **Access grants
   flagged 13**.
3. Click a finding. You land on the list **already filtered to exactly those
   records** — *Access grants flagged* opens Access & Identity with **Flagged
   only** selected. You never re-apply a filter the dashboard already knew.
4. **Exposure** (right) summarises vendors, access grants and open threats,
   and **Risk distribution** shows how many assets sit in each band.
5. **Risk Matrix** (below) plots every scored asset by likelihood and impact.
   Click a chip to open that asset's risk record.

Viewers usually stop here: the Action Centre is the answer to "is this being
handled?". Analysts and administrators carry on into one of the flows below.

---

## 2. Triage a threat, and get it fixed — analyst

1. **Threats** → the red banner names the most urgent open item. **View
   details** opens it; so does clicking any row.
2. The panel shows severity, status, the affected system and when it was
   detected. Under **Change status** are exactly the moves the server allows —
   **Investigating**, **Resolved**, **False positive**.
3. If fixing it is more than a click, choose **Raise remediation**. The
   Remediation form opens **pre-filled and linked** to the threat and its
   asset — title, description and severity carried over, and a note saying
   what it is linked to. Pick an **Owner** and **Due** date, then **Raise
   finding**.
4. **Open ‹system›** jumps to the affected asset, with its PHI, flows, access,
   vendors and threats on tabs.

## 3. Review access — analyst

1. **Access & Identity** leads with the worst grant (e.g. *"Over-privileged
   grant: … holds ADMIN … despite being a deactivated identity"*). Filters:
   **All levels / ADMIN / WRITE / READ** and **All grants / Flagged only**.
2. Open a grant. **Findings** lists what is wrong — **Stale**, **Never used**,
   **No MFA**, **Inactive identity**, **Excessive level**.
3. Fix it on the spot — **Reduce level** (downgrading keeps the grant and its
   history), **Revoke**, or **Mark reviewed** when it is justified.
4. If it needs someone else (an owner to confirm, MFA to roll out), **Raise
   remediation** turns it into a tracked finding linked to the asset.

## 4. Close a vendor gap — administrator or analyst

1. **Vendors** leads with the worst BAA gap. Filter by **Signed / Pending /
   Expired / Missing**.
2. Open the vendor: BAA status, PHI records it can reach, systems, and whether
   its assessment is overdue. A vendor imported but never assessed shows
   **Not scored** — unknown, not safe.
3. **Raise remediation** (shown when the BAA is not signed or the assessment
   is overdue) creates a linked finding such as *"Obtain a signed BAA from …"*.
   **Recompute risk** rescores it once things change.

## 5. Follow a finding to done — analyst or administrator

1. **Remediation** — **Awaiting work**, **In progress**, **Overdue**,
   **Closed** across the top; filter by status and severity.
2. Open a finding: what is wrong, the recommended action, what it is linked
   to (each link opens that record), owner and due date.
3. Assign an **Owner**, then move it: **In progress** → **Resolved**, or
   **Risk accepted** when the decision is to live with it. Accepted is never
   counted as fixed.
4. Closing a finding records who decided what, and when. It does not change
   the asset, control or threat it points at — change those directly.

## 6. Understand how PHI moves — every role

1. **PHI Flow** — **Flows mapped**, **Violations**, **Warnings**, **PHI in
   transit today**, then the map: systems left to right from ingress to
   onward recipients, ribbon width proportional to records per day.
2. A red banner names any unencrypted flow. **Inspect flow** opens the system;
   **Open affected asset** goes straight to that asset.
3. **All PHI types** and **All flows** narrow the map; **Export** downloads it.

## 7. Assess risk — analyst or administrator

1. **Risk Register** — the matrix, then every scored asset worst first,
   filterable by band (**Extreme, Critical, High, Moderate, Low**).
2. Open a risk to see its four factors — likelihood, impact, exposure and
   control gap. The colour is the band the API derived; it weighs exposure and
   control gap as well, so it can differ from what the grid square suggests.
3. **Recompute** rescores; **Open asset** goes to the system.

## 8. Prove governance — administrator

1. **Controls** — each safeguard with its status and effectiveness, the
   assets it applies to and the policies that cite it. Record what your team
   found under **Assessment**, then **Record assessment**.
2. **Policies** — each document, its owner, review date and the controls it
   cites, with their status. Move it through **Active / Draft / Under review /
   Archived** and **Save status**.
3. **Audit Trail** — every sign-in and change, filterable by area. Open an
   entry for the actor, subject, result and source IP.

## 9. Load the estate — administrator

1. **Data Import** → choose **Record type**. The **Columns** strip shows each
   column as **Required** or **Optional** with its type; **Download template**
   gives a CSV with the right headings.
2. Types that refer to others say so up front — e.g. Data Flows refer to
   Assets and PHI Types, so import those first.
3. Drop the CSV onto the upload area, or choose it. The file is **checked
   before anything is written**: either **N rows ready to import** with a
   preview, or a table of problems and **Nothing was imported**.
4. **Confirm Import**. Then **View ‹type›** takes you to what you just loaded;
   every screen has already refreshed.

---

## If something looks wrong

| You see | It means | Do |
|---|---|---|
| A screen explains the API is unreachable | The backend is down | Ask engineering; the page recovers by itself |
| **"Your session ended."** | The server ended your session | Sign in again |
| A menu item is missing | Your role cannot use it | Ask an administrator |
| No action buttons in a panel | You are signed in as a Viewer | Expected |
| A vendor shows **Not scored** | Imported but never assessed | **Recompute risk** |
| Figures look stale | Polling runs every 30s | Click **Live** in the top bar |
