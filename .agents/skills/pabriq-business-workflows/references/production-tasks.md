# Production Tasks Reference

Use this reference when advancing tasks through stages, approving or rejecting task advancement, managing production stages, or transitioning between pre-production and production boards. Owned by `src/features/production/model.ts`, `src/features/production/spawner.ts`, and `src/features/production/task-spawn-helpers.ts`.

## Scope

Covers the production aggregate: two-board architecture (pre_production + production), stage CRUD, task spawning per order line item, task advancement through stages with approval gates, board transitions, and task archiving.

## State machines

### Task statuses

```
queued → in_progress → pending_approval → in_progress (rejected back)
       → in_progress → completed
       → ready_for_production (pre_production board last stage completion)
       → completed (production board last stage completion)
```

### Board transition

```
pre_production → production (via startProductionForOrder)
```

**Canonical sources:** `src/features/production/model.ts`, `src/features/production/spawner.ts`

### Task status detail

| Status | Meaning | Allowed transitions |
|--------|---------|-------------------|
| `queued` | Created but not started | → `in_progress` (via `advanceTask`) |
| `in_progress` | Active in a stage | → `pending_approval` (if stage has `needApproval`), → next stage, → `ready_for_production` (pre_production last stage), → `completed` (production last stage) |
| `pending_approval` | Waiting for reviewer | → `in_progress` (reject), → next stage / `ready_for_production` / `completed` (approve) |
| `ready_for_production` | Pre-production complete, awaiting board transition | → `in_progress` (on production board after `startProductionForOrder`) |
| `completed` | Done | Terminal (auto-archived after 24h) |

**Observed.**

## Invariants

| Invariant | Enforcement location | Error message |
|-----------|---------------------|--------------|
| Stage delete requires zero tasks | `deleteStage()` (model.ts) | `'Cannot delete stage: N task(s)...'` |
| Task approval role-gated | `approveTaskAdvance()` (model.ts:545), `rejectTaskAdvance()` (model.ts) | `canApproveProductionTask(role)` returns false → `'Not authorized to approve'` |
| Start production requires paid invoice | `startProductionForOrder()` (spawner.ts:138) | `'At least one paid invoice is required to start production'` |
| Start production requires all tasks ready_for_production | `startProductionForOrder()` (spawner.ts:138) | `'All pre-production tasks must be ready before production can start'` |
| Start production requires approved order | `startProductionForOrder()` (spawner.ts:138) | `'Only approved orders can start production'` |
| Start production requires active production stage | `startProductionForOrder()` (spawner.ts:138) | `'No active production stage'` |
| Advance requires task not completed/pending_approval/ready | `advanceTask()` (model.ts:365) | Returns `{ ok: false, error: 'Task cannot be advanced from current status' }` |
| Stage requirements must be fulfilled | `advanceTask()` (model.ts:365) via `validateStageRequirements()` | Returns error string from `validateStageRequirements()` |
| Production completion requires all tasks done | `completeProductionFn` (orders/server.ts:212) | `'Cannot complete production: N task(s) still in progress'` |

**Observed.**

## Recipes

### Spawn pre-production tasks

**Trigger:** Called inside `approveOrder()` transaction (cross-domain contract — see hub skill)

1. `spawnQueuedPreProductionTasksForOrder(client, {orderId, orgId, allowedStatuses})` at `src/features/production/task-spawn-helpers.ts:18`
2. Reads order, line items, customer name, product priorities
3. Skips line items that already have tasks (idempotent — checks `existingLineItemIds`)
4. Creates `queued` tasks on `pre_production` board, one per line item
5. Task number: `TSK-{N}` auto-increment
6. Context snapshot: `productName`, `designName`, `customerName`, `requirements`, `orderNumber`, `quantity`, `deadline`

**Canonical:** `production/task-spawn-helpers.ts:spawnQueuedPreProductionTasksForOrder` (line 18)

### Advance task through stages

**Trigger:** Worker advances task on production board

1. `advanceTask(taskId, orgId, actorId, requirementResponses?)` at `src/features/production/model.ts:365`
2. Load task, all active stages for board, ordered by `orderIndex`
3. If `queued` → enter first stage (`in_progress`), no requirement check
4. If not queued: validate current stage requirements via `validateStageRequirements()`
5. If current stage has `needApproval` → set `pending_approval`, log `advancement_requested`
6. If at last stage + `pre_production` → `ready_for_production` (stageId=null)
7. If at last stage + `production` → `completed` (stageId=null)
8. Otherwise → `transitionToStage()` to next stage by `orderIndex`

**Canonical:** `production/model.ts:advanceTask` (line 365)

### Approve task advancement

**Trigger:** Reviewer approves a task in `pending_approval` status

1. `approveTaskAdvance(taskId, orgId, actorId, actorRole, reviewNotes?)` at `src/features/production/model.ts:545`
2. Role guard: `canApproveProductionTask(actorRole)` — owner or admin only
3. Guard: `task.status === 'pending_approval'`
4. If last pre_production stage → `ready_for_production`
5. If last production stage → `completed`
6. Otherwise → advance to next stage

**Canonical:** `production/model.ts:approveTaskAdvance` (line 545)

### Reject task advancement

**Trigger:** Reviewer rejects a task in `pending_approval` status

1. `rejectTaskAdvance(taskId, orgId, actorId, reason?)` at `src/features/production/model.ts`
2. Role guard: `canApproveProductionTask(actorRole)`
3. Guard: `task.status === 'pending_approval'`
4. Reverts to `in_progress` on current stage
5. Logs `rejected` activity

**Canonical:** `production/model.ts:rejectTaskAdvance`

### Board transition (start production)

**Trigger:** Operator clicks "Start Production" after pre-production completes

1. `startProductionForOrder(orderId, orgId, actorId)` at `src/features/production/spawner.ts:138`
2. Guards: order `approved`, at least one paid invoice, all tasks `ready_for_production`, active production stage exists
3. Inside `db.transaction()`: update all tasks to `board='production'`, `status='in_progress'`, `stageId=firstProdStage.id`
4. Log `board_transition` activity for each task (from `pre_production` to `production`)
5. Call `advanceOrderStatus(orderId, orgId, actorId)` → `approved→in_progress`

**Cross-domain contract:** See hub skill "Pre-production completion → board transition".

**Canonical:** `production/spawner.ts:startProductionForOrder` (line 138)

## Task spawning details

`spawnQueuedPreProductionTasksForOrder` accepts a `TaskSpawnClient` (either `db` or a transaction client), making it composable inside parent transactions. The `allowedStatuses` parameter gates which order statuses permit spawning — currently `['approved']`.

`spawnProductionTasks()` in `spawner.ts:48` creates tasks on the production board when an order enters `in_progress`.

`spawnTasksForApprovedOrder()` in `spawner.ts:37` is a convenience wrapper that calls `spawnQueuedPreProductionTasksForOrder` with `db` as the client.

**Observed.**

## Stage management

Stages have: `name`, `board` (`'pre_production'` | `'production'`), `needApproval` (boolean), `requirements` (`Requirement[]`), `orderIndex` (integer), `active` (boolean).

Requirement types: `text | number | upload`. Each requirement has `id`, `type`, `label`, and `required` (boolean). `validateStageRequirements()` checks all required requirements are fulfilled before advancing from a stage.

`READY_FOR_PRODUCTION_STATUS = 'ready_for_production'` constant in `src/features/production/constants.ts`.

**Observed.**

## Task archiving

Completed tasks older than 24h (configurable via `archiveCompletedAfterHours`) are auto-archived in `listBoardTasks()`. Archived tasks are excluded from active board views.

**Observed.**

## Auth and role guards

| Operation | Required role | Guard function |
|-----------|--------------|---------------|
| Advance production task | owner, admin, member | `canAdvanceProductionTask` |
| Approve production task | owner, admin | `canApproveProductionTask` |
| Manage stages | owner, admin | `canManageStages` |

**Observed.** Source: `src/features/permissions/model.ts`.

## Canonical symbols

| Symbol | File | Line |
|--------|------|------|
| `Stage` (type) | `src/features/production/model.ts` | 16 |
| `ProductionTask` (type) | `src/features/production/model.ts` | 52 |
| `CreateStageInput` (type) | `src/features/production/model.ts` | 30 |
| `advanceTask()` | `src/features/production/model.ts` | 365 |
| `approveTaskAdvance()` | `src/features/production/model.ts` | 545 |
| `rejectTaskAdvance()` | `src/features/production/model.ts` | — |
| `spawnQueuedPreProductionTasksForOrder()` | `src/features/production/task-spawn-helpers.ts` | 18 |
| `spawnProductionTasks()` | `src/features/production/spawner.ts` | 48 |
| `startProductionForOrder()` | `src/features/production/spawner.ts` | 138 |
| `spawnTasksForApprovedOrder()` | `src/features/production/spawner.ts` | 37 |
| `archiveBoardTasks()` | `src/features/production/spawner.ts` | 127 |
| `READY_FOR_PRODUCTION_STATUS` | `src/features/production/constants.ts` | 1 |

## Focused safe tests

Run: `bun run test -- src/features/production/model.test.ts`

| Scenario | Test location | What's verified |
|---------|--------------|----------------|
| Stage CRUD + org isolation | `production/model.test.ts` `production stages` | Cross-org leak prevention, delete-when-tasks-exist guard |
| Task advancement through stages | `production/model.test.ts` `task advancement` | Queued→first stage, requirement validation, approval flow |
| Pre-production → ready_for_production | `production/model.test.ts` | Last pre_production stage auto-transitions |
| Board transition (start production) | `production/model.test.ts` | All tasks must be ready, order status guard, stage assignment |
| Task archiving | `production/model.test.ts` | Auto-archive after 24h |

**Observed.**

## Exhaustive completion criterion

Every task status transition is accounted for in the state machine; every stage invariant has an enforcement location and error message; every recipe names its canonical function and source file; the board transition recipe covers all four guards and the transaction boundary; the task spawning details explain the `TaskSpawnClient` abstraction and `allowedStatuses` gate; stage management covers all stage properties and requirement types; auth guards map to named functions.
