# Background Check Tracker

Filepino Background Check Tracker is a Next.js application for tracking background-check orders from intake through completion. It has two main surfaces:

- A public client portal where customers enter a tracking/reference number and view their background-check status.
- A protected admin operations console where internal staff browse Google Sheets intake rows, manage service checks, create workflow tasks, assign owners, and control what appears in the public tracker.

This README reflects the system as of April 14, 2026.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Google Sheets API (intake + operations)
- Google Drive API (per-client files)
- shadcn/Radix-style UI components
- Framer Motion for the public tracking modal
- Node test runner with `tsx`

## Core Mental Model

The system runs entirely on Google Sheets and Google Drive — there is no database.

- **Intake sheet** (`GOOGLE_SHEETS_SPREADSHEET_ID`) is the source of truth for every background-check request. Google Forms writes to it; the app reads from it only. Required column: `Order Tracking Number`.
- **Tracking sheet** (`GOOGLE_SHEETS_OPERATIONS_ID`) stores the per-applicant status and is the primary read/write store managed by staff. It uses a single tab with columns: `TrackingNumber`, `ApplicantName`, `Status`, `Summary`, `ETA`, `Notes`, `DriveFolderUrl`, `UpdatedAt`. See `.env.example` for the full recognized column list.
- **Drive root folder** (`GOOGLE_DRIVE_FOLDER_ID`) holds one subfolder per client. The app searches this folder for a subfolder whose name matches the tracking number or applicant name. Staff can override the match by pasting a Drive folder URL into the tracking sheet's `DriveFolderUrl` column.
- `trackingNumber` is the join key across the intake sheet, the tracking sheet, and (via subfolder name) the Drive folder.

## Current Feature Set

### Public Client Portal

The public portal lives at `/`.

Customers can:

- Enter a tracking/reference number.
- Search against the active data source.
- View a modal with the current background-check details.
- See the overall status, progress percentage, ETA, summary, request metadata, verification pipeline, check breakdown, task details, and recent activity.
- Download a generated PDF status report.
- Close results with the close button, backdrop click, or `Escape`.

Public statuses are shown as:

- Queued for Processing
- Background Check In Progress
- Active Investigation
- Background Check Complete

The public tracker accepts normalized references. Numeric references are formatted as `ORD-{number}` for display, and lookups support both numeric and `ORD-` aliases.

Example:

- Searching `307` can match `ORD-307`.
- Searching `ord-307` can also match `307`.

### Tracking Report PDF

The public modal includes an Export Report action.

The generated PDF includes:

- Filepino status report title
- Tracking number
- Generated timestamp
- Overall status
- Progress percentage and progress bar
- Expected completion label
- Summary
- Checks and tasks
- Check-level file links
- Task-level file links
- Verification pipeline
- Request metadata
- Recent activity

The PDF file name is sanitized into this pattern:

```text
{TRACKING-NUMBER}-status-report.pdf
```

### Mock Mode

The app can run without Google Sheets by using local mock data.

Mock records live in:

```text
data/tracking-records.json
```

Set:

```env
TRACKING_DATA_SOURCE=mock
```

This is useful for local UI testing and quick demos.

### Google Sheets Data Mode

The app can read live intake rows from Google Sheets.

Set:

```env
TRACKING_DATA_SOURCE=google-sheets
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
```

If `TRACKING_DATA_SOURCE` is not set but `GOOGLE_SHEETS_SPREADSHEET_ID` exists, the repository will use Google Sheets mode.

The app reads a configured range if provided:

```env
GOOGLE_SHEETS_RANGE=Tracking!A1:I
```

If `GOOGLE_SHEETS_RANGE` is omitted, the app resolves the first available sheet tab and reads:

```text
FirstTab!A:ZZ
```

### Google Sheets Authentication

The Google Sheets integration tries authentication in this order:

1. API key, when `GOOGLE_API_KEY` is configured.
2. Service account, when the API-key request fails or no API key is configured.

This means both methods can be configured at the same time. API keys usually work only for publicly readable or API-key-accessible sheets. Private sheets should be shared with the service-account email so the fallback path can read them.

Optional API-key auth:

```env
GOOGLE_API_KEY=your-google-api-key
```

Service-account auth supports three credential styles.

Option 1: full JSON in one environment variable:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n..."}
```

Option 2: local JSON file path:

```env
GOOGLE_SERVICE_ACCOUNT_JSON_FILE=/absolute/path/to/service-account.json
```

Option 3: split credentials:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

If no credential env var is provided, the code currently falls back to:

```text
public/filepino-bgcheck-128c55091a24.json
```

For production, prefer environment variables or a private server-side file path. Do not commit new service-account credentials.

### Required Google Sheet Column

The only required Google Sheet column is:

```text
Order Tracking Number
```

Rows without a tracking number are ignored in order lists, and lookup cannot work without this join key.

### Intake Fields Read From Google Sheets

The app maps these columns when present:

- `Your complete name`
- `Your email address`
- `Company name (if applicable)`
- `Your phone number where to reach you`
- `Complete legal name, eg First, Middle and Last Name`
- `Email address`
- `Date of Birth`
- `Phone number`
- `Current address`
- `Apartment, suite, etc`
- `City`
- `State/Province`
- `ZIP / Postal Code`
- `Country`
- `Purpose`
- `Area where background check will be performed`
- `Order Tracking Number`

It also keeps every non-empty raw field from the row so admins can inspect original sheet data.

### Checkbox-Based Service Categories

Selected service checks are derived from checkbox-like Google Sheet columns.

The recognized service categories are:

- `Individual & Identity Checks`
- `Verification Services`
- `Legal & Immigration Checks`
- `Corporate & Financial Checks`
- `Specialized Checks`

Checkbox values count as selected when the cell contains:

```text
true, yes, y, checked, selected, 1, on
```

Google Form suffixes such as `Individual & Identity Checks|checkbox-1` are supported. The mapper strips the suffix and uses the human-readable label.

## Admin Operations Console

The admin console starts at:

```text
/admin
```

Admin routes are protected by a simple credential-based session cookie.

Required environment variables:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=filepino-admin
```

The login flow:

- `POST /api/admin/login` validates credentials.
- A hashed session cookie named `filepino_admin_session` is created.
- The cookie is HTTP-only, `sameSite=lax`, and secure in production.
- Session max age is 12 hours.
- `POST /api/admin/logout` clears the session.

### Admin Dashboard

Route:

```text
/admin
```

Current dashboard features:

- Shows Google Sheets as the configured source.
- Shows total rows loaded from the configured sheet range.
- Shows active assignee count.
- Links to the order list and assignee directory.
- Reserves space for future operations widgets.

### Order List

Route:

```text
/admin/orders
```

Admins can:

- Browse all Google Sheets rows that have an order tracking number.
- Search by tracking number, requestor name, requestor email, subject name, subject email, company, purpose, or area of check.
- Filter by all cases, with checks, Metro Manila, or outside Metro Manila.
- Switch between table view and card view.
- Use stat cards as quick filters.
- Paginate results with 12 rows per page.
- Open any order detail page.

### Order Detail

Route:

```text
/admin/orders/[trackingNumber]
```

Admins can:

- Review a specific order by tracking number.
- See current status, number of checks, requestor email, and subject email.
- Inspect the Google Sheets raw row data through the data dialog.
- View summary, ETA, admin notes, last updated timestamp, and check status snapshot.
- Sync service checks from the Google Sheet checkbox columns.
- Open each service check detail page.

When an order detail is opened, the system:

1. Finds the matching Google Sheets row.
2. Ensures an `OrderProgress` row exists in PostgreSQL.
3. Syncs selected Google Sheets categories into `CheckTypeProgress` records.
4. Loads checks, tasks, activities, and the public tracker record.

### Service Checks

Route:

```text
/admin/orders/[trackingNumber]/checks/[checkId]
```

Each service check has:

- Service label
- Current rolled-up status
- Timeline label
- Service notes
- File link
- Previous/next check navigation
- Reorder buttons for moving the service up or down
- Link to the full-screen task board

Service-check status is rolled up from child tasks when tasks exist. If a service check has no tasks, its status may be updated directly through the admin API.

### Service Check Task Board

Route:

```text
/admin/orders/[trackingNumber]/checks/[checkId]/board
```

The task board is the main day-to-day workflow view for a service check.

Admins can:

- Add tasks to a service check.
- Drag tasks between status columns.
- Reorder tasks by drag and drop.
- Assign tasks to staff members.
- Set task priority.
- Set task due date.
- Set a public step number.
- Attach a file link.
- Edit task title, description, notes, file link, priority, assignee, due date, and public step number.
- Delete tasks.
- View total tasks, active work, and public step count.

Task columns:

- Backlog (`QUEUED`)
- In Progress (`IN_PROGRESS`)
- Investigating (`ACTIVE_INVESTIGATION`)
- Blocked (`ON_HOLD`)
- Done (`COMPLETED`)

Task priorities:

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### Public Step Numbers

Public step numbers control what appears in the public verification pipeline.

Rules:

- A task with a `publicStepNumber` appears publicly.
- A task without a `publicStepNumber` remains internal.
- Step numbers must be positive whole numbers.
- Step numbers must be unique within the order.
- Public pipeline tasks are sorted by `publicStepNumber`.

If no public-numbered tasks exist, the public pipeline falls back to service checks.

### File Links

Service checks and tasks both support file links.

Validation rules:

- Empty values are allowed.
- Links must be valid URLs.
- Links must start with `http://` or `https://`.

File links can appear:

- In admin service/task views.
- In the public check breakdown.
- In the exported PDF report.

### Assignee Directory

Route:

```text
/admin/assignees
```

Admins can:

- View all staff members.
- Add a new assignee.
- Edit staff name and email.
- Activate or deactivate staff members.
- Assign active staff members to tasks.

Staff emails are normalized to lowercase and must be unique.

Inactive staff members:

- Do not appear as normal options for new assignments.
- Can remain visible on existing assigned tasks so history is preserved.

## Progress Rollup Rules

The system rolls child statuses up into parent statuses.

For a group of statuses:

1. If there are no child statuses, parent status is `QUEUED`.
2. If every child is `COMPLETED`, parent status is `COMPLETED`.
3. If any child is `ACTIVE_INVESTIGATION`, parent status is `ACTIVE_INVESTIGATION`.
4. If any child is `IN_PROGRESS`, parent status is `IN_PROGRESS`.
5. If any child is `ON_HOLD`, parent status is `ON_HOLD`.
6. Otherwise, parent status is `QUEUED`.

Task status changes roll up to the service check. Service-check rollups then update the overall order status.

## Progress Percentage Rules

When service checks exist:

- Completed checks count as `1`.
- In-progress or active-investigation checks count as `0.5`.
- The progress percentage is `score / numberOfChecks * 100`, rounded.

When no service checks exist:

- `COMPLETED` = 100%
- `ACTIVE_INVESTIGATION` = 75%
- `IN_PROGRESS` = 50%
- Everything else = 0%

## Public Tracker Content Rules

The public tracker record is built from the Google Sheets snapshot plus PostgreSQL progress.

It includes:

- `referenceNumber`
- `status`
- `title`
- `expectedCompletion`
- `percent`
- `summary`
- `metadataFields`
- `pipelineSteps`
- `checks`
- `recentActivity`

Summary behavior:

- If admin progress has a summary, use it.
- Otherwise, generate a default message based on selected verification streams and the tracking number.

Activity behavior:

- If admin activities exist, show them newest first.
- Otherwise, show a default "order intake found" activity.

Pipeline behavior:

- If public-numbered tasks exist, show those tasks as public steps.
- Otherwise, show service checks.
- If service checks have not been synced yet, generate queued pipeline steps from selected Google Sheets categories.

## API Routes

### Public APIs

`GET /api/tracking?referenceNumber=...`

- Requires `referenceNumber`.
- Returns `{ record }` when found.
- Returns 404 when the reference is not found.
- Returns configuration errors when the selected data source is not configured.

`GET /api/tracking/samples`

- Returns up to 10 sample records from the active data source.
- In mock mode, returns sample mock records.
- In Google Sheets mode, returns the first 10 sheet orders with any available progress summaries.

### Admin APIs

`POST /api/admin/login`

- Validates admin credentials.
- Creates the admin session cookie.

`POST /api/admin/logout`

- Clears the admin session cookie.

`GET /api/admin/tracking/[trackingNumber]`

- Returns the full admin tracking detail for an order.

`PUT /api/admin/tracking/[trackingNumber]`

- Updates overall progress fields such as summary, ETA, admin notes, and sometimes overall status.

`PUT /api/admin/tracking/[trackingNumber]/checks`

- Updates service-check notes, timeline label, file URL, and direct status when allowed.

`POST /api/admin/tracking/[trackingNumber]/activities`

- Adds an activity message and optional highlight to the order.

Task creation, editing, deletion, and reordering are implemented through server actions in:

```text
app/actions/service-checks.ts
```

Staff creation and updates are implemented through server actions in:

```text
app/actions/staff.ts
```

## Data Schema

All state lives in Google Sheets + Google Drive.

- **Intake sheet** — see the expected columns at the bottom of `.env.example`.
- **Tracking sheet** — single tab with `TrackingNumber`, `ApplicantName`, `Status`, `Summary`, `ETA`, `Notes`, `DriveFolderUrl`, `UpdatedAt`. Column names are matched case-insensitively; missing columns are treated as empty. Status values: `QUEUED | IN_PROGRESS | ACTIVE_INVESTIGATION | COMPLETED | ON_HOLD`.
- **Drive root folder** — one subfolder per client; name should contain the tracking number or applicant name so the app can find it. Use the `DriveFolderUrl` column on the tracking sheet to override/QA the match.

### Enums

`ProgressStatus`

- `QUEUED`
- `IN_PROGRESS`
- `ACTIVE_INVESTIGATION`
- `COMPLETED`
- `ON_HOLD`

`TaskPriority`

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### Models

`OrderProgress`

- Top-level progress record for one tracking number.
- Stores `trackingNumber`, `overallStatus`, `summary`, `etaLabel`, `adminNotes`, timestamps.
- Has many `CheckTypeProgress` records.
- Has many `ProgressActivity` records.

`CheckTypeProgress`

- One service check under an order.
- Stores `serviceKey`, `serviceLabel`, `status`, `timelineLabel`, `notes`, `fileUrl`, `sortOrder`, timestamps.
- Unique per `orderProgressId` and `serviceKey`.
- Has many `CheckTask` records.

`CheckTask`

- One workflow task under a service check.
- Stores title, description, status, priority, public step number, due date, notes, file URL, sort order, and optional assignee.

`ProgressActivity`

- One activity feed entry for an order.
- Stores message, optional highlight, and creation timestamp.

`StaffUser`

- One admin assignable staff member.
- Stores name, unique email, active state, and timestamps.

## Important Files

```text
app/page.tsx
```

Public landing/tracking portal.

```text
components/tracking/TrackingPortalDemo.tsx
```

Client-side search modal, API lookup, and PDF export.

```text
lib/tracking/repository.ts
```

Selects between mock and Google Sheets data sources.

```text
lib/tracking/google-sheets.ts
```

Google Sheets auth, row reading, header matching, and intake row mapping.

```text
lib/tracking/format.ts
```

Builds the public `TrackingRecord` from intake data and progress data.

```text
lib/tracking/progress.ts
```

Loads progress records and handles rollup logic.

```text
lib/tracking/admin.ts
```

Main admin workflow service for order detail, check sync, service updates, task CRUD, task reordering, and activity creation.

```text
lib/tracking/staff.ts
```

Staff directory CRUD and validation.

```text
lib/tracking/report-pdf.ts
```

Lightweight PDF generation for exported tracking reports.

```text
components/admin/AdminDashboard.tsx
```

Order list search, filters, table/card view, stat filters, and pagination.

```text
components/admin/ServiceCheckList.tsx
```

Order-level service-check list and sheet sync action.

```text
components/admin/ServiceCheckEditor.tsx
```

Service-check notes, timeline label, file link, and order controls.

```text
components/admin/CheckTaskList.tsx
```

Task board, task creation, drag/drop status movement, editing, deletion, public step numbers, file links, and assignees.

```text
components/admin/StaffDirectory.tsx
```

Assignee management UI.

## Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Common local mock setup:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=filepino-admin
```

Google Sheets + Drive setup:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=filepino-admin
GOOGLE_SHEETS_SPREADSHEET_ID=your-intake-spreadsheet-id
GOOGLE_SHEETS_OPERATIONS_ID=your-tracking-spreadsheet-id
GOOGLE_DRIVE_FOLDER_ID=your-drive-root-folder-id
GOOGLE_SHEETS_RANGE=Tracking!A1:ZZ
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SERVICE_ACCOUNT_JSON_FILE=/absolute/path/to/service-account.json
```

Share both Google Sheets and the Drive root folder with the service-account email — Editor on the tracking sheet (writes), Viewer on the intake sheet, Viewer on the Drive folder.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Admin:

```text
http://localhost:3000/admin
```

## Scripts

```bash
npm run dev
```

Starts the Next.js development server.

```bash
npm run build
```

Builds the production app.

```bash
npm run start
```

Starts the production server after a build.

```bash
npm run lint
```

Runs ESLint.

```bash
npm test
```

Runs all tests under `tests/**/*.test.ts`.

## Tests

Current test coverage includes:

- Public tracking API behavior in mock mode.
- Google Sheets header aliasing and row mapping.
- Reference alias handling for numeric and `ORD-` references.
- Public tracker record formatting.
- Public pipeline behavior with numbered public tasks.
- Progress rollup priority logic.
- PDF report generation, file links, progress bar output, and safe file names.

Test files live in:

```text
tests/tracking
```

Run tests:

```bash
npm test
```

## Common Workflows

### Add a New Order From Google Sheets

1. Add or confirm a row in Google Sheets.
2. Make sure `Order Tracking Number` is filled in.
3. Select the applicable service checkbox columns.
4. Go to `/admin/orders`.
5. Open the order.
6. Click sync if service checks are not already loaded.
7. Open each service check and create tasks.
8. Assign public step numbers only to tasks that should be visible to the client.
9. Move tasks through the board as work progresses.

### Make a Task Visible to the Client

1. Open the service check board.
2. Create or edit a task.
3. Set `Step #` to a positive unique number for that order.
4. Add a clear title and description or notes.
5. Save the task.

That task will be included in the public verification pipeline and check breakdown.

### Keep a Task Internal Only

Leave `Step #` empty.

The task remains part of admin operations and status rollups, but it does not become a public pipeline step.

### Add Supporting Documents

1. Paste a public or accessible `http://` or `https://` file URL into the service check or task.
2. Save the record.

The link can show in:

- Admin task cards
- Admin service views
- Public check breakdown
- Exported PDF report

### Add Public Activity

Use:

```http
POST /api/admin/tracking/[trackingNumber]/activities
```

With:

```json
{
  "message": "Employer verification request sent.",
  "highlight": "Acme HR"
}
```

The newest activity appears first in the public tracker.

## Known Notes

- The admin dashboard root is intentionally still a placeholder for future overview widgets.
- Google Sheets (intake) provides the request data; Google Sheets (tracking) provides the workflow state.
- Google Drive provides per-client file delivery.
- Service checks are synced from selected checkbox categories.
- Public task steps are opt-in through `publicStepNumber`.
- Overall and service statuses are mostly driven by rollups once tasks exist.
- The app currently uses simple environment-configured admin credentials rather than a full user account system.
- Keep service-account credentials out of commits and production public assets.

## Suggested Future Improvements

- Add full admin user accounts and role-based access.
- Add a dashboard with live counts by status, overdue tasks, assignee workload, and blocked checks.
- Add an activity composer in the admin UI instead of relying only on the API.
- Add audit history for task and status changes.
- Add email notifications for completed reports or status changes.
- Move any fallback service-account JSON out of `public`.
- Add end-to-end browser tests for the public search and admin task board.
