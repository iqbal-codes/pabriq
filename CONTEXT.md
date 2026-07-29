# Pabriq Domain Context

Pabriq is a configurable operating platform for made-to-order businesses. The shared language describes the work common across verticals while allowing each business to supply its own terminology and operating rules.

## Platform and Business

**Organization**:
A business workspace that owns its customers, catalog, orders, workflows, documents, and operating configuration.
_Avoid_: Tenant when speaking with business users
**Organization Slug**:
A unique, platform-managed public identifier for an Organization's standard Pabriq address, such as `akzproduction.pabriq.com`. It is part of the Organization's URL identity and is not the same as a custom domain.

**Business Template**:
A starter operating model for a type of made-to-order business, including useful terminology, fields, workflow stages, and defaults.
_Avoid_: Industry module when the behavior is configuration rather than separate code

**Made-to-Order Business**:
A business that begins or commits production to fulfill a specific customer request rather than producing only for anonymous stock.
_Avoid_: Generic manufacturer

## Commercial SaaS

**Plan**:
A package of capabilities, limits, and commercial terms offered to an Organization for a recurring price.

**Subscription**:
An Organization's active commercial agreement for a Plan, including its billing cadence and lifecycle state.

**Trial**:
A time-limited period during which an Organization can evaluate a Plan before starting a paid Subscription.

**Entitlement**:
A capability or resource allowance granted to an Organization by its Plan.

**Billing Organization**:
The Organization that owns the Subscription and whose users, operators, customers, orders, and production work are covered by it.
_Avoid_: Seat when referring to the commercial customer

**Usage Limit**:
A maximum quantity of a measurable resource or activity allowed by an Organization's Plan; reaching it blocks new creation or activation without deleting existing records.

**Subscription Status**:
The lifecycle state of an Organization's SaaS Subscription, including trialing, active, past due, grace period, suspended, and canceled states.

**Subscription Suspension**:
A read-only access state applied when a Subscription is no longer entitled to operational writes; existing Organization data remains retained and accessible.

**SaaS Billing**:
The commercial billing relationship between Pabriq and a Billing Organization for its Subscription, distinct from the Organization's invoices and payments collected from its customers.

**Billing Cadence**:
The recurring interval for a Subscription, initially monthly or annual.

**Platform Administrator**:
An authorized Pabriq operator who manages platform-wide Organizations, Plans, Subscriptions, Entitlements, billing exceptions, and support actions without becoming an Organization member.

## Commercial Work

**Customer Request**:
The customer’s requested product, quantity, configuration, timing, and supporting information before it becomes a committed order.
_Avoid_: Lead when the request is already actionable production input

**Quote**:
A priced proposal for a customer request with terms and a validity period.
_Avoid_: Invoice

**Order**:
A customer commitment to receive the configured work at an agreed price and target date.
_Avoid_: Job when referring to the commercial commitment

**Order Line**:
One requested product or service quantity within an order, including its captured configuration and price.
_Avoid_: Product when referring to a specific customer request

**Configured Product**:
A catalog product combined with the options, measurements, materials, files, and other values selected for one order line.
_Avoid_: Variant when the values are specific to an order

**Specification**:
The structured and attached information required to quote, approve, produce, or verify a configured product.
_Avoid_: Notes when the information is required for repeatable work

## Production Work

**Production Work**:
The executable work created to fulfill an approved order line.
_Avoid_: Order when referring to shop-floor execution

**Workflow Stage**:
A configurable step or gate through which production work progresses.
_Avoid_: Board column when the stage also carries rules, requirements, or approvals

**Requirement**:
A configured piece of information or evidence that must be supplied or verified at a workflow stage.
_Avoid_: Custom field when it is specifically part of production control

**Approval Gate**:
A workflow rule that prevents the next action until an authorized person accepts the relevant specification, evidence, or result.
_Avoid_: Status when approval is a decision rather than a location in the workflow

**Quality Record**:
Evidence that a production result was checked against configured acceptance criteria.
_Avoid_: Approval when the check can pass or fail independently of customer authorization

## Configuration and Extensibility

**Operating Rule**:
A business-specific rule controlling pricing, quantities, lead time, approvals, documents, or fulfillment.
_Avoid_: Hardcoded policy

**Template Default**:
A recommended starting value supplied by a Business Template that the organization may change.
_Avoid_: Global default when it belongs to a selected business setup

**Extension**:
A separately bounded capability required when configuration cannot safely express a business process or integration.
_Avoid_: Customization when the behavior requires independently maintained code

**Specification Snapshot**:
The immutable configuration and commercial values captured on an Order Line at commitment time so later catalog changes do not rewrite history.
_Avoid_: Live product configuration
