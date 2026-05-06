-- Backfill: assign sequential task numbers per org for tasks with null task_number
WITH max_numbers AS (
  SELECT
    org_id,
    COALESCE(MAX(CAST(SUBSTRING(task_number FROM 5) AS INTEGER)), 0) AS max_num
  FROM production_tasks
  WHERE task_number IS NOT NULL
  GROUP BY org_id
),
numbered_tasks AS (
  SELECT
    pt.id,
    'TSK-' || LPAD(CAST(
      row_number() OVER (PARTITION BY pt.org_id ORDER BY pt.created_at, pt.id)
      + COALESCE(mn.max_num, 0)
    AS TEXT), 3, '0') AS new_number
  FROM production_tasks pt
  LEFT JOIN max_numbers mn ON mn.org_id = pt.org_id
  WHERE pt.task_number IS NULL
)
UPDATE production_tasks
SET task_number = numbered_tasks.new_number
FROM numbered_tasks
WHERE production_tasks.id = numbered_tasks.id;

-- Backfill: set line_item_id for old tasks where order has exactly one line item
UPDATE production_tasks
SET line_item_id = sub.line_item_id
FROM (
  SELECT pt.id AS task_id, oli.id AS line_item_id
  FROM production_tasks pt
  JOIN orders o ON o.id = pt.order_id
  JOIN order_line_items oli ON oli.order_id = o.id
  WHERE pt.line_item_id IS NULL
    AND (SELECT COUNT(*) FROM order_line_items WHERE order_id = o.id) = 1
) sub
WHERE production_tasks.id = sub.task_id;

-- Backfill: enrich context with orderNumber, quantity, customerName
-- Handles both tasks with and without line_item_id
WITH enriched AS (
  SELECT
    pt.id AS task_id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          CASE WHEN pt.context IS NULL THEN '{}'::jsonb ELSE pt.context::jsonb END,
          '{orderNumber}',
          to_jsonb(COALESCE(o.order_number, ''))
        ),
        '{quantity}',
        to_jsonb(COALESCE(
          (SELECT quantity FROM order_line_items WHERE id = pt.line_item_id),
          (SELECT quantity FROM order_line_items WHERE order_id = o.id ORDER BY created_at LIMIT 1),
          1
        ))
      ),
      '{customerName}',
      to_jsonb(COALESCE(c.name, ''))
    ) AS new_context
  FROM production_tasks pt
  JOIN orders o ON o.id = pt.order_id
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE pt.context IS NULL
    OR pt.context::jsonb->>'orderNumber' IS NULL
    OR pt.context::jsonb->>'quantity' IS NULL
    OR pt.context::jsonb->>'customerName' IS NULL
    OR pt.context::jsonb->>'customerName' = ''
)
UPDATE production_tasks
SET context = enriched.new_context::json
FROM enriched
WHERE production_tasks.id = enriched.task_id;
