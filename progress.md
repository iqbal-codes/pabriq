# DB State Check - Design 3D Advancement Issue

**Date:** 2026-05-15  
**Org:** BfHif0g2nkpIB4HusS3ogxEXVvGqVj8g

## Summary

Found a **duplicate task pattern** and issues with the Design 3D → Production advancement.

## Tasks for Order ORD-2026-001

| Task # | Product | Status | Board | Stage ID | Archived |
|--------|---------|--------|-------|----------|----------|
| TSK-1 | Patch 3D Rubber - Garuda | completed | pre_production | a3d08d44-ddcb-4074-a14b-72b2c7f8c4f1 | ✅ 06:12:49 |
| TSK-2 | Patch 3D Rubber - Onic | completed | pre_production | a3d08d44-ddcb-4074-a14b-72b2c7f8c4f1 | ✅ 06:12:49 |
| TSK-3 | Patch 3D Rubber - Garuda | **queued** | production | **NULL** ⚠️ | ❌ |
| TSK-4 | Patch 3D Rubber - Onic | **queued** | production | **NULL** ⚠️ | ❌ |

## Key Findings

### 1. Duplicate Task Pattern
Each line item produced **TWO tasks**:
- Line item `1e2e3924-...` (Garuda, qty 50): TSK-1 + TSK-3
- Line item `8583597d-...` (Onic, qty 24): TSK-2 + TSK-4

The pre_production tasks (TSK-1/2) were properly archived after completion.
The production tasks (TSK-3/4) remain in queued state with **NULL stage_id**.

### 2. NULL stage_id Issue ⚠️
The production tasks have `stage_id = null` instead of pointing to the first production stage ("Molding" - `68b9bfc8-a05c-43c9-9114-df7f0e5ea347`).

### 3. Activity Timeline

```
04:45:48.129  [system]  stage_transition: TSK-1, TSK-2 created (no stage)
04:46:01.467  [k408t...] advancement_requested: TSK-1 → Design 3D
04:46:13.735  [k408t...] advancement_requested: TSK-2 → Design 3D
06:12:49.261  [k408t...] stage_transition: TSK-1 Design 3D → null (complete)
06:12:49.372  [system]  TSK-1, TSK-2 archived
06:12:49.529  [system]  stage_transition: TSK-3, TSK-4 created (no stage)
```

### 4. Production Stages Available

| Stage | Board | Order |
|-------|-------|-------|
| Design 3D | pre_production | 0 |
| Molding | production | 0 |
| Produksi | production | 1 |
| QC & Packaging | production | 2 |

## Root Cause

When Design 3D tasks were advanced/completed, the system created new production tasks (TSK-3/4) but:
1. Failed to assign them to the first production stage ("Molding")
2. Left them with `stage_id = NULL`

## Status

- 2 tasks stuck in `queued` status with no stage assigned
- `task_activity` table exists and records history
- `activity_events` table is empty for this org (not being used)

## Next Steps

1. **Fix stage assignment** - Update TSK-3 and TSK-4 to have `stage_id = '68b9bfc8-a05c-43c9-9114-df7f0e5ea347'` (Molding)
2. **Investigate advancement logic** - The code that creates production tasks after advancement is not assigning the stage
3. **Consider adding validation** - Prevent tasks from entering production board without a valid stage_id