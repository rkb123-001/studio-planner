# Studio Planner

A weekly planner that budgets executive function instead of hours.

Studio Planner is the scheduling tool for a working jewellery and fine art practice. It starts from the observation that a studio week is not limited by available time but by available executive function: the capacity to start a task, to switch between unlike tasks, and to tolerate the sensory and administrative load each one carries. The planner makes that supply legible and asks the week to balance rather than to maximise.

Built and used daily in RKB Studio.

---

## What it does

**Energy budget.** You report your energy on opening the planner. That sets a daily budget in abstract units: High 18, Medium 15, Low 10. The figure is then adjusted by a personal rest ratio, so someone who needs more recovery gets a smaller nominal budget rather than a running deficit.

**Work modes with costs.** Every block placed on the grid belongs to a mode, and each mode carries an executive-demand cost that is subtracted from the day's budget:

| Mode | Cost | Covers |
|---|---|---|
| Systems | 2 | workflows, pricing, proposals |
| Making | 3 | casting, wax work, fabrication |
| Comms & Admin | 3 | emails, invoices, order tracking |
| Social * | 3 | studio visits, private views, peer contact |
| Growth | 4 | research, residencies, opportunities |
| Content | 4 | social, posts, photography |
| Rest | −2 | restores budget rather than spending it |

Non-exportable modes (Social, Health, Office Work, Rest) sit alongside these so the week reflects a whole life, not only billable studio time. Costs are editable per user.

**Runway actions.** Rather than showing an empty grid to someone who is depleted, each energy state maps to at most three concrete opening moves. High energy sends you straight to deep work. Low energy offers a runway task and then permission to stop.

**Transition buffers.** High-demand to high-demand switches are flagged and given a pad. Comms into making, office into content, social into studio work: the cost of the context switch is treated as a real cost rather than a free one.

**Projects on horizons.** Work is held as Now, Next, or Later, each with a progress percentage, a confidence rating, and a due month. Later is a legitimate resting place, not a backlog of failure.

**Weekly success metrics.** The week is judged on whether you stayed within capacity, avoided overload, completed at least one meaningful task, and progressed a fine art project. Volume is deliberately not a metric.

**Calendar sync.** A Google Calendar sync module reconciles planned blocks with the real calendar.

---

## Why it is built this way

Most planners model a week as a container of hours and treat the person filling it as a constant. That model fails for anyone whose available capacity varies, and it fails particularly badly across a practice that mixes physical making, client administration, and public-facing work, because those three draw on different and non-interchangeable reserves.

Studio Planner replaces the container model with an account. Capacity is finite and self-reported. Activities have unequal costs regardless of duration. Rest is income rather than absence of work. Overspend is surfaced on the day it happens rather than discovered weeks later as burnout.

Three design decisions follow from that:

1. **Cost is attached to mode, not to time.** Two hours of invoicing and two hours of wax carving occupy the same grid space and cost different amounts. Duration alone was never the constraint.
2. **The transition is a line item.** Switching cost is modelled explicitly because it is the cost most often paid and least often planned for.
3. **The success condition is homeostatic.** A week that balances is a good week. This removes the incentive to overfill the grid, which is the failure mode the tool exists to prevent.

The accompanying diagram, `studio-planner-system.html`, renders the whole model as a single Vester-style window picture: which variables feed which, and where the feedback closes.

---

## Stack

- React 19
- Create React App (`react-scripts` 5)
- `localStorage` as the primary store, key `studio-planner-v1`
- Supabase for cross-device sync

## Running locally

```bash
npm install
npm start
```

Runs on `http://localhost:3000`. The planner works fully offline against `localStorage`; Supabase sync is optional and degrades gracefully when unconfigured.

```bash
npm run build
```

Produces a production build in `build/`.

---

## Status

Actively used and actively changing. `src/App.js` is a single large component by deliberate choice at this stage: the model is still moving, and keeping it in one file has kept the cost of changing it low. Splitting it is the next structural task, not an oversight.

---

Studio Planner is one of several systems built to run RKB Studio, alongside a costing ledger and a capacity grid. They share a premise: that the infrastructure a practice runs on is itself a site of design, and worth making as carefully as the objects it produces.
