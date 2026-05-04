# 11 - Production Floor Management & Kanban Board

## Linked Issues

- GitHub #8: Slice 7 — Configure production stages and spawn tasks
- GitHub #9: Slice 8 — Build operator production kanban

## Goal

Build the production floor: Admins configure ordered production stages, approving an order spawns one task per line item, and operators advance tasks through stages via a kanban board with requirement fulfillment and optional admin approval gates.

## Domain Language

| Term | Meaning |
|---|---|
| **Production stage** | An ordered step in the production workflow (e.g. 3D Design, Mold, Production, QC). Admins CRUD these. |
| **Queue** | Logical holding state. Tasks start here when spawned, before any operator has started them. |
| **Done** | Terminal state. Tasks land here when they've passed all production stages. |
| **Task** | A unit of production work representing one order line item. Spawned when an order is approved. |
| **Requirement** | A data field attached to a production stage that must be fulfilled to advance (e.g. upload file, enter quantity). Each requirement has a type (text/number/upload) and a required flag. |
| **Task activity** | An immutable audit event on a task (stage transition, requirement fulfillment, approval, rejection, comment). |
| **Advancement** | Moving a task from one stage to the next. May or may not require admin approval depending on the stage config. |

## Scope

- Rename `workflow_stages` → `production_stages` with added columns: `requirements JSON`, `need_approval boolean`, `description text`.
- Update `production_tasks`: make `stageId` nullable (null = queued), widen status to `'queued' | 'in_progress' | 'pending_approval' | 'completed'`.
- New `task_activity` table for immutable activity log.
- Server functions: stage CRUD, order approval + task spawning, kanban queries, task advancement, requirement fulfillment, approval/rejection, activity timeline.
- Admin order detail page: approve/reject pending orders.
- Kanban board at `/production` with filter bar + column view.
- Task detail modal (2 tabs: Details + Activity) with Advance button.
- Requirement fulfillment modal shown on advance click.
- Customer portal: production timeline (stage_transition events per task).
- Permission checks using existing `canAdvanceProductionTask` / `canViewProduction`.

## Out Of Scope

- Gantt chart view (post-MVP, data is supported via `task_activity.createdAt`).
- Drag-and-drop kanban (explicit button transitions only).
- Operator assignment and workload balancing.
- Automated deadline/SLA tracking.

## Database Changes

### Renamed Table: `workflow_stages` → `production_stages`

```sql
ALTER TABLE workflow_stages RENAME TO production_stages;

ALTER TABLE production_stages ADD COLUMN description TEXT;
ALTER TABLE production_stages ADD COLUMN need_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE production_stages ADD COLUMN requirements JSON NOT NULL DEFAULT '[]';
```

The `requirements` JSON column stores an array of requirement definitions:

```json
[
  { "id": "design_file", "label": "Design File", "type": "upload", "required": true },
  { "id": "notes", "label": "Notes", "type": "text", "required": false },
  { "id": "qty_produced", "label": "Quantity Produced", "type": "number", "required": true }
]
```

`id` is a unique key within each stage, `type` is `'text' | 'number' | 'upload'`, `required` is boolean.

### Updated Table: `production_tasks`

```sql
-- stageId becomes nullable (null = queued)
ALTER TABLE production_tasks ALTER COLUMN stage_id DROP NOT NULL;

-- Recreate FK to renamed table
ALTER TABLE production_tasks DROP CONSTRAINT production_tasks_stage_id_workflow_stages_id_fk;
ALTER TABLE production_tasks ADD CONSTRAINT production_tasks_stage_id_production_stages_id_fk
  FOREIGN KEY (stage_id) REFERENCES production_stages(id) ON DELETE RESTRICT;
```

Update `status` default and type docs to: `'queued' | 'in_progress' | 'pending_approval' | 'completed'`.

The `context` JSON is extended to include requirement responses:

```json
{
  "productName": "Custom T-Shirt",
  "customerName": "Acme Corp",
  "requirements": "Use PMS Cool Gray 1C",
  "requirementResponses": {
    "design_file": { "assetIds": ["uuid-1", "uuid-2"] },
    "qty_produced": { "value": "500" },
    "notes": { "value": "All molds passed quality check" }
  }
}
```

### New Table: `task_activity`

```sql
CREATE TABLE task_activity (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_stage_id TEXT REFERENCES production_stages(id) ON DELETE SET NULL,
  to_stage_id TEXT REFERENCES production_stages(id) ON DELETE SET NULL,
  data JSON DEFAULT '{}',
  actor_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_order ON task_activity(org_id, created_at DESC);
```

`type` values: `'stage_transition'`, `'requirement_fulfilled'`, `'advancement_requested'`, `'approved'`, `'rejected'`, `'comment'`.

`data` JSON examples:
- `requirement_fulfilled`: `{ "requirementId": "design_file", "responses": { "assetIds": ["..."] } }`
- `advancement_requested`: `{ "fromStage": "mold", "toStage": "production" }`
- `approved`: `{ "reviewNotes": "Looks good" }`
- `rejected`: `{ "reviewNotes": "Need better photos" }`
- `comment`: `{ "text": "Need client logo for design file" }`
- `stage_transition`: `{ "completedRequirements": ["design_file", "qty_produced"] }`

## Server Functions

### Stage Management (`src/features/production/server.ts`)

- `listStagesFn` — list active stages ordered by `orderIndex`.
- `createStageFn` — create stage with name, description, requirements, need_approval.
- `updateStageFn` — update stage config.
- `reorderStagesFn` — update `orderIndex` for batch reorder.
- `toggleStageFn` — activate/deactivate a stage.

### Order Approval & Task Spawning (`src/features/orders/server.ts`)

- `approveOrderFn` — validate status is `pending`, update to `approved`, call task spawner.
- `rejectOrderFn` — validate status is `pending`, update to `rejected`.

### Task Spawning Module (`src/features/production/spawner.ts`)

```ts
export async function spawnTasksForApprovedOrder(
  orderId: string,
  orgId: string,
): Promise<void>
```

- Fetches order with line items and customer.
- Fetches active production stages ordered by `orderIndex`.
- Creates one `production_tasks` row per line item:
  - `status: 'queued'`, `stageId: null`
  - `context`: snapshot of product name, customer name, line item notes
- Logs initial `task_activity` with `type: 'stage_transition'`, `fromStageId: null`, `toStageId: null`.

### Kanban & Tasks (`src/features/production/server.ts`)

- `listBoardTasksFn` — returns all tasks for org grouped by status/stage, with search and stage filter.
- `getTaskDetailFn` — returns single task with full context, current stage info, requirement status.
- `listTaskActivitiesFn` — returns activity timeline for a task (type, actor, timestamps, data).
- `advanceTaskFn` — the main advancement action:
  1. Validate current task status allows advancement.
  2. If current stage has requirements, validate all required ones are fulfilled.
  3. If current stage has `need_approval`:
     - Set task status to `pending_approval`.
     - Log `advancement_requested` activity.
     - Return `{ ok: true, pendingApproval: true }`.
  4. If no approval needed:
     - Find next production stage by `orderIndex`.
     - If no next stage, set `status: 'completed'`, `stageId: null`.
     - Else set `status: 'in_progress'`, `stageId: nextStageId`.
     - Log `stage_transition` activity with requirement responses.
     - Return `{ ok: true, pendingApproval: false }`.
- `approveTaskAdvanceFn` — admin approves pending advancement:
  1. Validate task status is `pending_approval`.
  2. Advance to next stage (same logic as step 4 above).
  3. Log `approved` + `stage_transition` activities.
- `rejectTaskAdvanceFn` — admin rejects advancement:
  1. Set task back to `in_progress` on current stage.
  2. Log `rejected` activity.
- `saveTaskCommentFn` — add a comment to a task.

### Customer Portal (`src/features/portal/model.ts`)

- `getOrderTasksTimeline(token)` — returns `task_activity` rows (`type: 'stage_transition'`) for all tasks in the order, ordered by `createdAt`.

## UI Flow

### Page: `/production` (Kanban Board)

```
Layout: Tabs (Kanban | List) + Filter bar + Board columns
  - Tabs: Kanban (default) | List (table view) | Gantt (post-MVP, disabled)
  - Filter bar:
    - Stage filter dropdown ("All Stages" | specific stage)
    - Order search input
  - Board: scrollable horizontal columns
    - Queue column (tasks with status='queued')
    - One column per active production_stage (tasks with status='in_progress' or 'pending_approval', stageId matches)
    - Done column (tasks with status='completed')
    - Each column shows task cards with: product name, customer, qty, status indicators, action button
    - Column header shows stage name + task count
```

### Page: `/production/stages` (Stage Management)

```
Layout: Table list + Create/Edit modal
  - Ordered list of all stages (including Queue + Done as read-only rows)
  - Each row: order, name, description, active, need_approval, requirement count
  - Drag-handle or up/down buttons for reorder
  - Create/Edit modal with form fields:
    - Name (text), Description (textarea), Active (toggle), Need Approval (toggle)
    - Requirements sub-form: dynamic list where each has:
      - Label (text), Type (select: text/number/upload), Required (toggle), Remove button
    - Add Requirement button
  - Delete: only allowed if no tasks reference the stage (ON DELETE RESTRICT)
```

### Task Detail Modal (2 tabs + bottom action)

```
Trigger: Click a task card on kanban board

Tab 1: Details
  - Task summary bar: order number, product name, customer, quantity, current stage
  - Specification / Notes from order line item
  - Attachments (assets linked to the line item)

Tab 2: Activity
  - Activity timeline (task_activity ordered by created_at DESC)
    - Stage transitions with timestamps and actor
    - Approvals/rejections with notes
    - Requirement fulfillments
  - Comment input: textarea + send button
  - Existing comments rendered inline in timeline

Bottom action button:
  - If status='queued': [Start Production] → advances to first production stage
  - If status='in_progress' and advanceable: [Advance to {nextStage}]
    - Button is disabled if required requirements are unfulfilled (show tooltip)
  - If status='pending_approval': no button (waiting for admin)
  - If status='completed': no button
  - If user is admin and status='pending_approval': [Review] → opens approval modal
```

### Requirement Fulfillment Modal

```
Trigger: Click Advance button while requirements exist

Layout:
  - Title: "Complete Requirements — Advance to {nextStage}"
  - List of requirement fields for current stage:
    - Upload type: file upload button (reuses existing asset upload components)
    - Text type: textarea input
    - Number type: number input
  - Each field shows required/optional label
  - Action buttons: [Cancel] [Advance]
  
On submit:
  - Save requirement responses to task context
  - If stage has need_approval: create advancement_requested activity, set pending_approval
  - If not: create stage_transition activity, set to next stage
```

### Task Review Modal (admin only)

```
Trigger: Admin clicks Review on a pending_approval task

Layout:
  - Shows "Requesting advancement from {stage} → {nextStage}"
  - Lists fulfilled requirements (read-only)
  - Notes textarea for admin
  - Actions: [Reject] [Approve & Advance]
```

### Order Detail Page Approve Action

```
On admin order detail page, when order.status === 'pending':
  - Show [Cancel Order] and [Approve] buttons
  - Approve: calls approveOrderFn → spawns tasks → redirects to /production
  - Cancel: calls rejectOrderFn → sets status to 'rejected'
```

### Customer Portal Timeline

```
In OrderSummary view, when order has tasks:
  - Per task: show vertical timeline of stage_transition events
  - Each event: date, from → to stage name
  - Current position highlighted
```

## i18n Keys (namespace: `production`)

```ts
production: {
  title: string
  kanbanTab: string
  listTab: string
  stagesTab: string
  searchPlaceholder: string
  allStages: string
  queue: string
  done: string
  noTasks: string
  taskDetail: string
  specification: string
  attachments: string
  activity: string
  comments: string
  commentPlaceholder: string
  send: string
  startProduction: string
  advanceTo: string
  completeRequirements: string
  requirementRequired: string
  requirementOptional: string
  uploadFile: string
  requestReview: string
  reviewAdvancement: string
  approve: string
  reject: string
  reviewNotes: string
  canceled: string
  stageManagement: string
  addStage: string
  editStage: string
  deleteStage: string
  deleteStageConfirm: string
  stageName: string
  stageDescription: string
  stageDescriptionPlaceholder: string
  needApproval: string
  needApprovalHint: string
  active: string
  inactive: string
  requirements: string
  addRequirement: string
  requirementLabel: string
  requirementType: string
  requirementTypeText: string
  requirementTypeNumber: string
  requirementTypeUpload: string
  required: string
  optional: string
  reorder: string
  movedToStage: string
  advancedFromQueue: string
  advancementRequested: string
  approved: string
  rejected: string
  savedRequirement: string
  taskCompleted: string
}
```

## Route Changes

| Route | File | Auth |
|---|---|---|
| `/production` | `src/routes/_org/production/index.tsx` | Auth + org |
| `/production/stages` | `src/routes/_org/production/stages.tsx` | Auth + org (admin only) |

Both routes sit under the `_org` layout with existing sidebar guard.

Preexisting sidebar item `production` points to `/production`.

## Component Tree

```
src/features/production/
  server.ts              — createLoggedServerFn wrappers
  model.ts               — data types + pure functions
  spawner.ts             — task spawning module
  components/
    kanban-board.tsx      — horizontal scrollable board
    kanban-column.tsx     — single column with task cards
    kanban-task-card.tsx  — task card with status indicators
    task-detail-modal.tsx — 2-tab modal (details + activity)
    requirement-form.tsx  — requirement fulfillment form
    requirement-field.tsx — single field (text/number/upload)
    review-modal.tsx      — admin approval/rejection modal
    stage-list.tsx        — stage management table
    stage-form.tsx        — stage create/edit modal
  hooks.ts               — TanStack Query hooks
  pages/
    kanban-page.tsx       — kanban board page
    stage-management-page.tsx — stage CRUD page
```

## Permission Model

Existing guards in `src/features/permissions/model.ts`:
- `canViewProduction(role)` — `'owner' | 'admin'` — controls access to `/production` route
- `canAdvanceProductionTask(role)` — `'owner' | 'admin'` — controls advance/review buttons

All server functions check org membership + session from the authenticated user (not client input).

## Tests

### Model Tests (`src/features/production/model.test.ts`)

- Stage CRUD: create, update, reorder, toggle, list.
- Stage delete rejects when tasks reference it.
- Task spawning: approve order creates one task per line item with queued status.
- Task advancement without approval: queues requirements check → stage transition.
- Task advancement with approval: queues requirements → pending_approval → admin approve → stage transition.
- Task advancement with approval → admin reject → task returns to in_progress.
- Task advancement: last stage moves to completed.
- Activity logging: each action creates correct activity type.
- Invalid transitions blocked (already queued, already completed, etc).

### Component Tests

- `kanban-board`: renders Queue/production/Done columns, shows task count.
- `kanban-task-card`: shows correct status indicators (⚡, 🔒), action button visibility.
- `task-detail-modal`: renders tabs, advance button visibility per status.
- `requirement-form`: renders fields by type, validates required fields.

### Route Tests

- `/production` redirects unauthenticated users.
- `/production/stages` redirects non-admin users.

## Acceptance Criteria

- `production_stages` table exists with requirements, need_approval, description.
- `task_activity` table exists.
- Admins can CRUD and reorder production stages.
- Approving a pending order spawns one queued task per line item.
- Kanban board renders Queue / production stages / Done columns.
- Operators can advance tasks with requirement fulfillment.
- Stages with `need_approval` gate advancement behind admin approval.
- Task detail modal shows Details + Activity tabs with Advance button.
- Customer portal shows stage transition timeline per task.
- Permission checks prevent unauthorized advancement.
- `bun run check`, `bun run typecheck`, `bun run test`, `bun run build` all pass.
