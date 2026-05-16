import { and, eq } from 'drizzle-orm'
import { db } from './src/db/index.ts'
import {
  organization,
  productionStages,
  productionTasks,
} from './src/db/schema.ts'

async function main() {
  // 1. Get orgId for 'labq-dev'
  const orgResult = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, 'labq-dev'))
    .limit(1)

  if (orgResult.length === 0) {
    console.log('❌ No org found with slug "labq-dev"')
    return
  }

  const orgId = orgResult[0].id
  console.log(`✅ Found org "labq-dev" with id: ${orgId}\n`)

  // 2. Query stages with board='pre_production'
  console.log('=== STAGES (board=pre_production) ===')
  const stagesResult = await db
    .select()
    .from(productionStages)
    .where(
      and(
        eq(productionStages.orgId, orgId),
        eq(productionStages.board, 'pre_production'),
      ),
    )
    .orderBy(productionStages.orderIndex)

  if (stagesResult.length === 0) {
    console.log('❌ No stages found for pre_production board\n')
  } else {
    console.log(`Found ${stagesResult.length} stages:\n`)
    stagesResult.forEach((stage) => {
      console.log(`  ID: ${stage.id}`)
      console.log(`  Name: ${stage.name}`)
      console.log(`  Order: ${stage.orderIndex}`)
      console.log(`  Active: ${stage.active}`)
      console.log('---')
    })
  }

  // 3. Query tasks with board='pre_production'
  console.log('\n=== TASKS (board=pre_production) ===')
  const tasksResult = await db
    .select()
    .from(productionTasks)
    .where(
      and(
        eq(productionTasks.orgId, orgId),
        eq(productionTasks.board, 'pre_production'),
      ),
    )
    .orderBy(productionTasks.createdAt)

  if (tasksResult.length === 0) {
    console.log('❌ No tasks found for pre_production board\n')
  } else {
    console.log(`Found ${tasksResult.length} tasks:\n`)
    tasksResult.forEach((task) => {
      console.log(`  Task ID: ${task.id}`)
      console.log(`  Task Number: ${task.taskNumber}`)
      console.log(`  Stage ID: ${task.stageId}`)
      console.log(`  Status: ${task.status}`)
      console.log(`  Order ID: ${task.orderId}`)
      console.log(`  Context: ${JSON.stringify(task.context)}`)
      console.log('---')
    })
  }

  // 4. Summary
  console.log('\n=== VALIDATION ===')
  const stageIds = new Set(stagesResult.map((s) => s.id))
  const tasksWithStageId = tasksResult.filter((t) => t.stageId)
  const tasksWithInvalidStageId = tasksWithStageId.filter(
    (t) => !stageIds.has(t.stageId),
  )

  console.log(`Total stages: ${stagesResult.length}`)
  console.log(`Total tasks: ${tasksResult.length}`)
  console.log(`Tasks with stageId: ${tasksWithStageId.length}`)
  console.log(
    `Tasks with NULL stageId: ${tasksResult.length - tasksWithStageId.length}`,
  )
  console.log(`Tasks with invalid stageId: ${tasksWithInvalidStageId.length}`)

  if (tasksWithInvalidStageId.length > 0) {
    console.log('\n⚠️  Tasks with stageIds not matching any stage:')
    tasksWithInvalidStageId.forEach((t) => {
      console.log(`  - ${t.id} (stageId: ${t.stageId})`)
    })
  }

  // Show status distribution
  const statusCounts = {}
  tasksResult.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
  })
  console.log('\nTask status distribution:')
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
}

main().catch(console.error)
