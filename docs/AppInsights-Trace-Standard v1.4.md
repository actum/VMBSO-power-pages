# Application Insights — Trace Standard

> Version 1.4
> Applies to: Canvas Apps, Next.js / React SPAs, and any future client app sending telemetry to Azure Application Insights.
>
> **Changelog v1.4:**
> - Added `CALL | AppBootstrap | Start` / `Success` / `Error` as new required traces, replacing the practice of inferring "did the app open successfully" from `NAV | Screen | Navigate`. The NAV-based approach matched each `AUTH | App | Start` to the *nearest subsequent* NAV event in the same session with no time bound — in production this produced success rates deflated by session-scoped false negatives (an app-open with no immediately-following NAV was scored as failed even when it rendered correctly) and load-time percentiles inflated by outliers in the tens of minutes (a Start event matched to an unrelated, much later navigation). It also structurally didn't fit canvas-style single-page apps, where a successful open often never fires a route-change event at all. See "Note on App Open / Load Success" below.
> - `AppBootstrap` is deliberately a `CALL`, not a new category and not a variant of `AUTH`. Timing was consolidated onto `CALL` in v1.1 specifically so duration data has one home; adding `durationMs` back onto `AUTH` would reintroduce the fragmentation that change was meant to prevent. `AUTH | App | Start` is unchanged — it remains the identity/session marker with no timing semantics, and continues to be what DAU and session-heatmap queries key off.
> - `durationMs` on `CALL | AppBootstrap | Success` / `Error` must be computed client-side (e.g. `performance.now()` diff, matching `callWithTrace`), not derived by joining two independently-ingested trace timestamps. Timestamp-diff joins across separately-sent trace rows are what caused both bugs described above — matching by proximity rather than by a shared identity is unreliable whenever an app can emit more "start" signals than "completion" signals in the same session.
> - Extended `CallType` from `"flow" | "endpoint" | "connector"` to include `"bootstrap"`, for calls that represent an app's own required startup sequence rather than a call to an external flow, API, or connector.
> - Added Canvas and Next.js implementation examples for `AppBootstrap`, and two new KQL reference queries (bootstrap success rate, bootstrap load time percentiles).
>
> **Changelog v1.3:**
> - Corrected every KQL reference query: the table is **`traces`**, not `customTraces`. `customTraces` does not exist in this environment's Application Insights schema — confirmed by a direct query error while building the Product Dashboard workbook. `customEvents` / `customMetrics` are unaffected (those really are the correct names for `trackEvent()` / `trackMetric()` calls); only trace telemetry was mislabeled.
> - Added `ms-isTest` as a documented, required property (see Property Schema) so dashboards can consistently exclude dev/test sessions. This property was already assumed by the dashboard spec's trace-filter rule but was never actually defined here — apps had no instruction to set it.
> - Fixed a user-attribution gap in the **All failures across every category** reference query. It previously fell back only to `user_Id` (a JS-SDK-only anonymous fingerprint), so Canvas app errors would show no user at all. It now falls back to `customDimensions["userId"]` as well.
> - Added an explicit note on which native AI columns are JS-SDK-only vs. populated for all clients, since this was the source of two separate bugs this cycle (see "Native Column Availability" note below).
>
> **Changelog v1.2:** Clarified which context fields are automatically captured by the App Insights JavaScript SDK and must not be duplicated in `customDimensions`. Updated Next.js `traceClient` implementation to remove redundant `sessionId` and `userId` custom properties. Introduced `setAuthenticatedUserContext` as the standard way to associate the user email with telemetry. Updated KQL queries to use native AI columns (`session_Id`, `user_AuthenticatedId`) instead of custom dimensions where applicable.
>
> **Changelog v1.1:** Removed `PERF` as a standalone category. Timing (`durationMs`) now lives on `CALL | Success` and `CALL | Error` traces. Renamed actions for consistency: `Triggered → Start`, `Completed → Success`, `Failed → Error`.

---

## Purpose

This document defines how traces are sent to Application Insights across all client applications. Following this standard ensures that:

- KQL queries and dashboards are **reusable across projects**
- Telemetry is **clean and queryable** without string parsing
- Every trace is **self-describing** through structured properties
- The standard works for **any client** — Power Apps Canvas, Next.js, React SPA, etc.

---

## Trace Message Format

Every trace message follows this pattern:

```
{Category} | {Feature} | {Action}
```

Examples:

```
AUTH  | App | Start
NAV   | Screen | Navigate | MatchList
USAGE | Match | SendEmail
CALL  | SendEmailFlow | Start
CALL  | SendEmailFlow | Success
CALL  | SendEmailFlow | Error
CALL  | AppBootstrap | Start
CALL  | AppBootstrap | Success
ERROR | Match | CreateStep1
```

The message is for **human readability** in raw logs. Queries must use the structured properties below, not string matching on the message. The format is strictly three segments — `Category | Feature | Action` — never four. An outcome (Start / Success / Error) always replaces the action segment; it is never appended after it.

---

## Categories

| Category | Purpose |
|---|---|
| `AUTH` | App launch, session start/end, login events |
| `NAV` | Screen or page navigation events |
| `USAGE` | User-driven feature actions (button clicks, form submits) |
| `CALL` | All timed operations with a Start/Success/Error outcome — outbound flows, API endpoints, connectors, and an app's own required startup sequence (`AppBootstrap`). Carries timing and outcome. |
| `ERROR` | Caught / handled errors not tied to an outbound call |

> **Why no PERF category?** Timing (`durationMs`) belongs on the `CALL | Success` or `CALL | Error` trace where it naturally occurs. A separate PERF trace for the same event creates redundancy and forces queries to join two categories to get a complete picture of a single operation. This is also why app-startup timing (`AppBootstrap`, added in v1.4) is a `CALL` rather than living on `AUTH` — see the v1.4 changelog above.

---

## Note on App Open / Load Success

Do not use `NAV | Screen | Navigate` as a proxy for "did the app open successfully," and do not infer load duration by joining an `AUTH | App | Start` trace to the nearest subsequent event in the same session. Both approaches were tried and both failed in production:

- **False negatives:** any real app-open that doesn't happen to be followed by a route-change event within the query's cutoff window gets scored as failed, even though the app rendered correctly. This is structurally common in canvas-style / single-screen apps, where using the app doesn't require a navigation at all.
- **Outlier contamination:** matching "the next event in the session" rather than "the event caused by this specific open" means a Start event with no immediately-following navigation will instead match whatever unrelated navigation happens next — sometimes tens of minutes later — which then reports as an absurd load time.

Both problems share one root cause: matching two independently-fired traces by time proximity within a shared session, rather than by an explicit shared identity. The fix is `CALL | AppBootstrap`, below — a single client-computed duration on a single trace, with no cross-event matching required.

---

## Native Column Availability — read this before writing any cross-client query

Native Application Insights columns (`user_AuthenticatedId`, `session_Id`, `client_Type`, `operation_Name`, `user_Id`) are populated by the **App Insights JavaScript SDK**. Canvas Apps do **not** run this SDK — `Trace()` calls go through the Power Apps telemetry pipeline instead — so for Canvas telemetry these columns are simply absent.

The one exception is `client_CountryOrRegion` (and `client_City`): these are derived from the ingestion request's IP address at the Application Insights endpoint level, not the SDK, so they populate for **both** Canvas and Next.js telemetry.

**Practical consequence:** any KQL query that reports on users or sessions across both client types must use `coalesce()` against the native column first, then the manual `customDimensions` property, e.g. `coalesce(user_AuthenticatedId, tostring(customDimensions["userId"]))`. A query that only reads the native column will silently show nothing for Canvas app data; a query that only reads `customDimensions` will silently show nothing for Next.js data. This bit us twice this cycle — once in the dashboard spec's KPI tiles, once in the reference query below — so it's called out here explicitly rather than left implicit.

---

## Required Trace Events

Every app must fire the following traces as a minimum:

| Trace | When | Notes |
|---|---|---|
| `AUTH \| App \| Start` | `App.OnStart` / app mount | Captures session start with all base properties. No timing — see `AppBootstrap` for load performance. |
| `NAV \| Screen \| Navigate \| {ScreenName}` | Every screen `OnVisible` / route change | Do not use this to infer app-open success or load time (see note above) |
| `USAGE \| {Feature} \| {Action}` | On every meaningful user action | Before the call is made — records user intent. Not every USAGE has a corresponding CALL (e.g. opening a modal). |
| `CALL \| {CallName} \| Start` | Immediately before every outbound call | Captures `requestPayload`. No `durationMs` yet. |
| `CALL \| {CallName} \| Success` | After every outbound call succeeds | Captures `durationMs` and `responsePayload` |
| `CALL \| {CallName} \| Error` | After every outbound call fails | Captures `durationMs`, `errorMessage`, `errorCode` |
| `CALL \| AppBootstrap \| Start` | **New in v1.4.** App mount, before the app's required startup queries/render begin | Marks the start of the load-time measurement window |
| `CALL \| AppBootstrap \| Success` | **New in v1.4.** Once required startup queries and first render complete | Carries `durationMs` computed client-side. This is the canonical "app opened successfully" signal — decoupled from whatever the user does afterward (navigate, sit idle, close the tab) |
| `CALL \| AppBootstrap \| Error` | **New in v1.4.** If a required startup query or render throws | Carries `durationMs`, `errorMessage`, `errorCode` |
| `ERROR \| {Feature} \| {Action}` | In every `IfError()` / `catch` block | Only for errors **not** tied to an outbound call |

---

## Property Schema

### Automatically Captured by the App Insights JavaScript SDK (Next.js / React only — see Native Column Availability above)

The following fields are populated automatically by the SDK on every telemetry item, **only for clients running the JS SDK**. **Do not duplicate these in `customDimensions`** — doing so inflates the payload and risks saturating the SDK send buffer.

| Native AI Column | Description |
|---|---|
| `session_Id` | Browser session identifier, auto-rotated by the SDK |
| `user_Id` | Anonymous browser fingerprint (not the user's email) |
| `user_AuthenticatedId` | Authenticated user email — populated by calling `setAuthenticatedUserContext(email)` once after login. Use this instead of a custom `userId` property. |
| `client_Type` | `Browser` \| `PC` \| `Mobile` |
| `client_Browser` | Browser name and version e.g. `Chrome 146.0` |
| `client_OS` | Operating system e.g. `Windows 10` |
| `client_City`, `client_CountryOrRegion` | Geo-location derived from ingestion IP — populated for **all** clients, including Canvas |
| `operation_Name` | Current route / page e.g. `/detail/22899` |
| `operation_Id` | Correlation ID for the current operation |
| `sdkVersion` | App Insights SDK version |

> **Canvas Apps** have no built-in session or user tracking. Continue to put `sessionId`, `userId`, `userDisplayName`, and `deviceType` in `gblTraceBase` as before.

---

### Always Present in customDimensions (every trace)

| Property | Type | Canvas | Next.js | Description |
|---|---|---|---|---|
| `appName` | string | ✅ manual | ✅ manual | App identifier, hardcoded per project. Note: the native `appName` AI column contains the full Azure resource path — set a short friendly name here. |
| `appVersion` | string | ✅ manual | ✅ manual | Semantic version e.g. `1.2.0` |
| `sessionId` | string | ✅ manual | ❌ use native `session_Id` | Canvas only: GUID generated once per app launch, never persisted |
| `userId` | string | ✅ manual | ❌ use native `user_AuthenticatedId` | Canvas only: `User().Email`. In Next.js call `setAuthenticatedUserContext(email)` instead |
| `userDisplayName` | string | ✅ manual | optional | Full name if needed for display in dashboards |
| `userRole` | string | ✅ manual | optional | App-specific role resolved at startup |
| `screenName` | string | ✅ manual | ✅ manual | Current screen or route at time of trace. Note: `operation_Name` carries the route automatically, but `screenName` allows a human-readable label. For `AppBootstrap`, set this to the entry screen/route — bootstrap can start from any screen via deep linking. |
| `deviceType` | string | ✅ manual | ❌ use native `client_Type` | Canvas only |
| `category` | string | ✅ manual | ✅ manual | One of the five categories above |
| `feature` | string | ✅ manual | ✅ manual | Screen, flow, endpoint, or feature name |
| `action` | string | ✅ manual | ✅ manual | `Start` \| `Navigate` \| `Success` \| `Error` \| or a free-text user action for USAGE |
| `outcome` | string | ✅ manual | ✅ manual | `Success` \| `Failure` \| `Cancelled` — always set explicitly, never omit |
| `ms-isTest` | boolean | ✅ manual | ✅ manual | `true` for dev, test, QA, or internal/synthetic sessions; `false` (or omitted) in production. Every dashboard query filters on `tostring(customDimensions["ms-isTest"]) != "true"` to exclude this traffic — if an app doesn't set it, its dev/test noise will land in production metrics uncontested. |

### CALL Specific

| Property | Type | Description |
|---|---|---|
| `callType` | string | `flow` \| `endpoint` \| `connector` \| `bootstrap` — **`bootstrap` added in v1.4**, for an app's own required startup sequence rather than a call to an external flow, API, or connector |
| `callName` | string | Human-readable target name. Use `AppBootstrap` for the app-open measurement (v1.4) |
| `callMethod` | string | `GET` \| `POST` \| `PUT` \| `DELETE` — endpoints and connectors only |
| `callEndpoint` | string | Full URL if available |
| `httpStatus` | number | HTTP response code if available |
| `durationMs` | number | Elapsed milliseconds — present on `CALL \| Success` and `CALL \| Error`, omitted on `CALL \| Start`. Always computed client-side (e.g. `performance.now()` diff) on the emitting client, never derived downstream by joining separate trace rows. |
| `requestPayload` | string | Sanitized JSON — present on `CALL \| Start`. See payload rules below |
| `responsePayload` | string | Sanitized JSON — present on `CALL \| Success`. See payload rules below |

### ERROR Specific

| Property | Type | Description |
|---|---|---|
| `errorMessage` | string | Human-readable error description |
| `errorCode` | string | App-defined error code e.g. `FLOW_ERR_001` |

---

## Payload Logging Rules

Payloads are useful for debugging but must never contain personal data.

**✅ Always safe to log:**
```json
{ "matchId": "abc-123", "templateId": "welcome", "recipientCount": 3, "hasAttachment": false }
```

**❌ Never log:**
```
Email addresses, names, free text content, file contents,
tokens, passwords, phone numbers, any PII
```

When in doubt, log only IDs, counts, types, and boolean flags. Never log the full response object — extract only what is needed for debugging.

---

## Complete Example: Button → Flow → Send Email

### Sequence of traces fired

| # | Timestamp | Message | category | action | outcome | durationMs |
|---|---|---|---|---|---|---|
| 1 | 17:04:01.100 | `USAGE \| Match \| SendEmail` | USAGE | SendEmail | Success | — |
| 2 | 17:04:01.102 | `CALL \| SendEmailFlow \| Start` | CALL | Start | Success | — |
| 3 | 17:04:02.950 | `CALL \| SendEmailFlow \| Success` | CALL | Success | Success | 1848 |

All three share the same `sessionId` and `userId`.

> **Failure scenario:** trace 3 becomes `CALL | SendEmailFlow | Error` with `outcome: "Failure"`, `durationMs: 1848`, `errorMessage`, and `errorCode`. No additional trace needed.

---

## Complete Example: App Open (AppBootstrap)

### Sequence of traces fired

| # | Timestamp | Message | category | action | outcome | durationMs |
|---|---|---|---|---|---|---|
| 1 | 09:12:00.000 | `AUTH \| App \| Start` | AUTH | Start | Success | — |
| 2 | 09:12:00.010 | `CALL \| AppBootstrap \| Start` | CALL | Start | Success | — |
| 3 | 09:12:01.240 | `CALL \| AppBootstrap \| Success` | CALL | Success | Success | 1230 |

`durationMs` on trace 3 is computed client-side as the elapsed time between the app beginning its required startup work and that work (plus first render) completing — it does not depend on trace 2 having been received or matched; it is measured locally and attached directly to trace 3.

> **Failure scenario:** trace 3 becomes `CALL | AppBootstrap | Error` with `outcome: "Failure"`, `durationMs`, `errorMessage`, and `errorCode`, if a required startup query or the initial render throws.
>
> **Abandoned open:** if the user closes the app before bootstrap finishes, trace 3 never arrives at all. This is a real, intended signal — a `CALL | AppBootstrap | Start` with no matching `Success`/`Error` in the aggregate counts (see KQL below) is an incomplete open and should count against the success rate, unlike the old NAV-based approach where the absence of an unrelated later event incorrectly counted a *completed* open as a failure.

---

## Implementation — Canvas App (Power Fx)

### App.OnStart — initialize base record

```
Set(gblTraceBase, {
    appName:         "MyApp",
    appVersion:      "1.2.0",
    sessionId:       Text(GUID()),
    userId:          User().Email,
    userDisplayName: User().FullName,
    userRole:        gblUserRole,
    deviceType:      Switch(
                         Host.DeviceType,
                         HostDeviceType.Web,    "Web",
                         HostDeviceType.Mobile, "iOS",
                         "Android"
                     )
});

// New in v1.3: flag dev/test builds so dashboards can exclude them.
// Set gblIsTest via a build-time constant, environment variable screen, or
// Host.Environment check — whatever your release process already exposes.
Set(gblTraceBase, gblTraceBase & { 'ms-isTest': gblIsTest });

Trace(
    "AUTH | App | Start",
    TraceSeverity.Information,
    gblTraceBase & {
        category: "AUTH",
        feature:  "App",
        action:   "Start",
        outcome:  "Success"
    }
);

// New in v1.4: mark the beginning of the app-open measurement window.
UpdateContext({ lcBootstrapStart: Now() });

Trace(
    "CALL | AppBootstrap | Start",
    TraceSeverity.Information,
    gblTraceBase & {
        category: "CALL",
        feature:  "AppBootstrap",
        action:   "Start",
        callType: "bootstrap",
        callName: "AppBootstrap",
        outcome:  "Success"
    }
);
```

### After required startup data/canvas render completes — AppBootstrap Success/Error

```
// Run wherever the app currently measures its own canvas-ready timing.
// This should fire once the screens/queries every user always needs on
// open have finished — not tied to any specific user interaction.

If(
    IsError(gblRequiredStartupResult),

    Trace(
        "CALL | AppBootstrap | Error",
        TraceSeverity.Error,
        gblTraceBase & {
            category:     "CALL",
            feature:      "AppBootstrap",
            action:       "Error",
            callType:     "bootstrap",
            callName:     "AppBootstrap",
            outcome:      "Failure",
            durationMs:   DateDiff(lcBootstrapStart, Now(), TimeUnit.Milliseconds),
            errorMessage: FirstError.Message,
            errorCode:    "BOOTSTRAP_ERR_001"
        }
    ),

    Trace(
        "CALL | AppBootstrap | Success",
        TraceSeverity.Information,
        gblTraceBase & {
            category:   "CALL",
            feature:    "AppBootstrap",
            action:     "Success",
            callType:   "bootstrap",
            callName:   "AppBootstrap",
            outcome:    "Success",
            durationMs: DateDiff(lcBootstrapStart, Now(), TimeUnit.Milliseconds)
        }
    )
);
```

### Screen OnVisible — navigation trace

```
Trace(
    "NAV | Screen | Navigate | MatchList",
    TraceSeverity.Information,
    gblTraceBase & {
        category:   "NAV",
        feature:    "Screen",
        action:     "Navigate",
        screenName: "MatchList",
        outcome:    "Success"
    }
);
```

### Button OnSelect — full CALL pattern

```
// 1. Record user intent
Trace(
    "USAGE | Match | SendEmail",
    TraceSeverity.Information,
    gblTraceBase & {
        category:   "USAGE",
        feature:    "Match",
        action:     "SendEmail",
        screenName: "MatchDetail",
        outcome:    "Success"
    }
);

// 2. Mark call start — capture payload before Run()
Trace(
    "CALL | SendEmailFlow | Start",
    TraceSeverity.Information,
    gblTraceBase & {
        category:       "CALL",
        feature:        "SendEmailFlow",
        action:         "Start",
        screenName:     "MatchDetail",
        callType:       "flow",
        callName:       "SendEmailFlow",
        outcome:        "Success",
        requestPayload: "{ templateId: 'match-notification', recipientCount: 1 }"
    }
);

// Capture start time
UpdateContext({ lcStartTime: Now() });

// 3. Run the flow
Set(gblFlowResult,
    SendEmailFlow.Run(
        varMatchRecord.Email,
        varMatchRecord.Name
    )
);

// 4. Handle result
If(
    IsError(gblFlowResult),

    // Error path
    Trace(
        "CALL | SendEmailFlow | Error",
        TraceSeverity.Error,
        gblTraceBase & {
            category:     "CALL",
            feature:      "SendEmailFlow",
            action:       "Error",
            screenName:   "MatchDetail",
            callType:     "flow",
            callName:     "SendEmailFlow",
            outcome:      "Failure",
            durationMs:   DateDiff(lcStartTime, Now(), TimeUnit.Milliseconds),
            errorMessage: FirstError.Message,
            errorCode:    "FLOW_ERR_001"
        }
    ),

    // Success path
    Trace(
        "CALL | SendEmailFlow | Success",
        TraceSeverity.Information,
        gblTraceBase & {
            category:        "CALL",
            feature:         "SendEmailFlow",
            action:          "Success",
            screenName:      "MatchDetail",
            callType:        "flow",
            callName:        "SendEmailFlow",
            outcome:         "Success",
            durationMs:      DateDiff(lcStartTime, Now(), TimeUnit.Milliseconds),
            responsePayload: "{ success: true }"
        }
    )
);
```

> **Note on multiple flows per screen:** if a screen calls more than one flow, use distinct local variable names for each start time: `lcStartTime_SendEmail`, `lcStartTime_CreateMatch`, etc.

---

## Implementation — Next.js / React (TypeScript)

### Type definition

```typescript
// lib/tracing/types.ts

export type TraceCategory = "AUTH" | "NAV" | "USAGE" | "CALL" | "ERROR";
export type CallType = "flow" | "endpoint" | "connector" | "bootstrap"; // "bootstrap" added in v1.4
export type Outcome = "Success" | "Failure" | "Cancelled";

export interface TraceProperties {
  // Always present
  category:         TraceCategory;
  feature:          string;
  action:           string;
  outcome:          Outcome;
  screenName?:      string;

  // CALL specific
  callType?:        CallType;
  callName?:        string;
  callMethod?:      "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  callEndpoint?:    string;
  httpStatus?:      number;
  durationMs?:      number;      // present on CALL | Success and CALL | Error, omit on CALL | Start
  requestPayload?:  string;      // present on CALL | Start
  responsePayload?: string;      // present on CALL | Success

  // ERROR specific (also on CALL | Error)
  errorMessage?:    string;
  errorCode?:       string;
}
```

### Trace helper

```typescript
// lib/tracing/traceClient.ts

import { getAppInsights } from "./appInsightsConfig";
import { SeverityLevel } from "@microsoft/applicationinsights-web";

// Only app-level metadata that is NOT captured automatically by the SDK.
// Do NOT add sessionId or userId here — the SDK provides session_Id and
// user_AuthenticatedId natively (set via setAuthenticatedUserContext on login).
const baseProperties = {
  appName:    process.env.NEXT_PUBLIC_APP_NAME ?? "MyApp",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
  // New in v1.3: flag non-production traffic so dashboards can exclude it.
  "ms-isTest": process.env.NEXT_PUBLIC_ENV !== "production",
};

export function sendTrace(properties: TraceProperties): void {
  const appInsights = getAppInsights();

  if (!appInsights) {
    console.error("[ABORTED] Initialize appInsights instance to use trace tracking.", properties);
    return;
  }

  const message = `${properties.category} | ${properties.feature} | ${properties.action}`;

  // All categories — including ERROR — are sent as traces so that every
  // category lands in the traces table and is queryable by the
  // standard KQL queries. Do NOT use trackException here.
  appInsights.trackTrace({
    message,
    severityLevel: properties.outcome === "Failure" ? SeverityLevel.Error : SeverityLevel.Information,
    properties: {
      ...baseProperties,
      ...properties,
    },
  });
}
```

> **User email:** call `appInsights.setAuthenticatedUserContext(session.user.email)` once after the user authenticates. This populates the native `user_AuthenticatedId` column on every subsequent telemetry item automatically — no custom property needed. Call `appInsights.clearAuthenticatedUserContext()` on logout.

### CALL wrapper helper

```typescript
// lib/tracing/callWithTrace.ts

import { sendTrace, TraceProperties } from "./traceClient";

interface CallOptions {
  callName:        string;
  callType:        "flow" | "endpoint" | "connector" | "bootstrap";
  callMethod?:     "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  callEndpoint?:   string;
  feature:         string;
  screenName?:     string;
  requestPayload?: Record<string, unknown>;
}

export async function callWithTrace<T>(
  fn: () => Promise<T>,
  options: CallOptions
): Promise<T> {
  const base: Omit<TraceProperties, "action" | "outcome"> = {
    category:     "CALL",
    feature:      options.feature,
    callType:     options.callType,
    callName:     options.callName,
    callMethod:   options.callMethod,
    callEndpoint: options.callEndpoint,
    screenName:   options.screenName,
  };

  // CALL | Start — before the call, carries request payload
  sendTrace({
    ...base,
    action:         "Start",
    outcome:        "Success",
    requestPayload: options.requestPayload
      ? JSON.stringify(options.requestPayload)
      : undefined,
  });

  const start = performance.now();

  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);

    // CALL | Success — carries duration and response
    sendTrace({ ...base, action: "Success", outcome: "Success", durationMs });

    return result;
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // CALL | Error — carries duration and error details
    sendTrace({ ...base, action: "Error", outcome: "Failure", durationMs, errorMessage });

    throw err;
  }
}
```

### Usage

```typescript
// Any component or service

const documents = await callWithTrace(
  () => fetch("/api/documents").then(r => r.json()),
  {
    callName:       "GetDocuments",
    callType:       "endpoint",
    callMethod:     "GET",
    callEndpoint:   "/api/documents",
    feature:        "/api/documents",
    screenName:     "DocumentList",
    requestPayload: { matchId: "abc-123" },
  }
);
```

### Usage — AppBootstrap (new in v1.4)

Wrap whatever function performs the app's required startup work — the queries/rendering every entry point always needs, regardless of which screen deep-linking landed on — in the same `callWithTrace` helper:

```typescript
// app/providers/BootstrapProvider.tsx (or wherever startup data is fetched)

await callWithTrace(
  () => loadRequiredStartupData(), // whatever must succeed before the app is usable
  {
    callName:   "AppBootstrap",
    callType:   "bootstrap",
    feature:    "AppBootstrap",
    screenName: window.location.pathname, // capture the deep-linked entry route
  }
);
```

Because `callWithTrace` already computes `durationMs` client-side via `performance.now()` and emits `Start` before / `Success` or `Error` after, this reuses the existing helper as-is — no new tracing infrastructure is required, only a new `callName`/`callType` at the correct point in the boot sequence. Note that in Next.js, where most routes are already fast and reliable, the resulting numbers are expected to be less interesting than in Canvas; the point of adding it here is so both clients report the same metric on the same shared dashboard tile, not because Next.js load time is currently in question.

---

## KQL Reference Queries

All queries below use the `traces` table (not `customTraces` — corrected in v1.3).

### All outbound call performance, ranked by average duration

```kql
traces
| where tostring(customDimensions["ms-isTest"]) != "true"
| where customDimensions["category"] == "CALL"
| where customDimensions["action"] in ("Success", "Error")
| extend callName   = tostring(customDimensions["callName"])
| extend callType   = tostring(customDimensions["callType"])
| extend durationMs = toint(customDimensions["durationMs"])
| extend outcome    = tostring(customDimensions["outcome"])
| summarize
    avgMs  = avg(durationMs),
    p95Ms  = percentile(durationMs, 95),
    total  = count(),
    failed = countif(outcome == "Failure")
  by callName, callType
| order by avgMs desc
```

### Failure rate by call name

```kql
traces
| where tostring(customDimensions["ms-isTest"]) != "true"
| where customDimensions["category"] == "CALL"
| where customDimensions["action"] in ("Success", "Error")
| extend callName = tostring(customDimensions["callName"])
| extend outcome  = tostring(customDimensions["outcome"])
| summarize
    total   = count(),
    failed  = countif(outcome == "Failure"),
    failPct = round(100.0 * countif(outcome == "Failure") / count(), 1)
  by callName
| order by failPct desc
```

### App bootstrap (open) success rate — new in v1.4

Replaces the deprecated NAV-based proxy. No join, no session matching — just a count of `Start` vs. `Success` for the `AppBootstrap` call, so a Start with no matching Success/Error (crash, abandoned load) correctly counts against the rate, and a successful bootstrap is never penalized for what the user does afterward.

```kql
traces
| where timestamp {TimeRange}
| where tostring(customDimensions["ms-isTest"]) != "true"
| where tostring(customDimensions["category"]) == "CALL"
  and tostring(customDimensions["callName"]) == "AppBootstrap"
| summarize
    Starts    = countif(tostring(customDimensions["action"]) == "Start"),
    Succeeded = countif(tostring(customDimensions["action"]) == "Success")
| extend v = iff(Starts == 0, 0.0, round(100.0 * Succeeded / Starts, 1))
| project tostring(v)
```

### App bootstrap load time, P50 / P95 — new in v1.4

Reads `durationMs` directly off the `Success` trace — no join required, since duration is computed and attached client-side at the point of emission.

```kql
traces
| where timestamp {TimeRange}
| where tostring(customDimensions["ms-isTest"]) != "true"
| where tostring(customDimensions["category"]) == "CALL"
  and tostring(customDimensions["callName"]) == "AppBootstrap"
  and tostring(customDimensions["action"]) == "Success"
| extend durationMs = toint(customDimensions["durationMs"])
| summarize P50 = percentile(durationMs, 50), P95 = percentile(durationMs, 95)
```

### All failures across every category

```kql
traces
| where tostring(customDimensions["ms-isTest"]) != "true"
| where customDimensions["outcome"] == "Failure"
| extend category     = tostring(customDimensions["category"])
| extend feature      = tostring(customDimensions["feature"])
| extend action       = tostring(customDimensions["action"])
| extend errorMessage = tostring(customDimensions["errorMessage"])
// v1.3 fix: previously fell back only to user_Id (JS-SDK-only anonymous
// fingerprint), so Canvas app errors showed no user at all. Now falls back
// to the manual customDimensions["userId"] too.
| extend userEmail    = coalesce(user_AuthenticatedId, user_Id, tostring(customDimensions["userId"]))
| project timestamp, category, feature, action, errorMessage, userEmail
| order by timestamp desc
```

### Daily active users

```kql
// Canvas Apps: userId is in customDimensions (manual)
// Next.js SDK: use the native user_AuthenticatedId column
traces
| where tostring(customDimensions["ms-isTest"]) != "true"
| where customDimensions["category"] == "AUTH"
| where customDimensions["action"] == "Start"
| extend userEmail = coalesce(user_AuthenticatedId, tostring(customDimensions["userId"]))
| summarize DAU = dcount(userEmail) by bin(timestamp, 1d)
| order by timestamp desc
```

### Session activity heatmap (sessions per day)

```kql
// Canvas Apps: sessionId is in customDimensions (manual)
// Next.js SDK: use the native session_Id column
traces
| where tostring(customDimensions["ms-isTest"]) != "true"
| where customDimensions["category"] == "AUTH"
| where customDimensions["action"] == "Start"
| extend sid = coalesce(session_Id, tostring(customDimensions["sessionId"]))
| extend day = startofday(timestamp)
| summarize sessions = dcount(sid) by day
| order by day asc
```

---

## Checklist for a New App

### SDK Configuration (Next.js only)
- [ ] Application Insights resource created and connection string added to app config
- [ ] `disableFetchTracking: true` and `disableAjaxTracking: true` — automatic dependency tracking disabled to prevent per-request buffer flushes
- [ ] `enableRequestHeaderTracking: false` and `enableResponseHeaderTracking: false` — header capture disabled (payload inflation + PII risk)
- [ ] `enableCorsCorrelation: false` unless a server-side App Insights SDK is wired up
- [ ] `setAuthenticatedUserContext(email)` called after login; `clearAuthenticatedUserContext()` called on logout
- [ ] `sessionId` and `userId` are **not** in `customDimensions` — native `session_Id` and `user_AuthenticatedId` columns are used instead

### Trace Coverage (all clients)
- [ ] `gblTraceBase` (Canvas) or `baseProperties` + `sendTrace` helper (Next.js) implemented
- [ ] `AUTH | App | Start` trace fires on every authenticated app launch / session start
- [ ] `NAV` trace fires on every screen / route change
- [ ] Every outbound call wrapped with `CALL | Start`, `CALL | Success`, and `CALL | Error` traces
- [ ] `durationMs` present on every `CALL | Success` and `CALL | Error` trace, computed client-side (never derived by joining separate trace rows)
- [ ] Every meaningful user action has a `USAGE` trace before any outbound call
- [ ] `outcome` is always set explicitly — never omitted or left as a default
- [ ] `ms-isTest` is set explicitly (`true` in dev/test/QA builds, `false` in production)
- [ ] Payload logging reviewed — no PII, only IDs, counts, and booleans
- [ ] Canvas only: `sessionId` is a fresh GUID per launch, never persisted
- [ ] Any KQL query touching `userId` or `sessionId` uses `coalesce()` between the native AI column and the `customDimensions` fallback — a query using only one or the other will silently miss one client type (see "Native Column Availability" above)
- [ ] Phase 1 dashboard workbooks cloned and configured against the new AI resource, querying the `traces` table (not `customTraces`)
- [ ] **New in v1.4:** `CALL | AppBootstrap | Start` fires when required startup work begins (Next.js: before required initial fetches/render; Canvas: `App.OnStart`, right after `gblTraceBase` setup)
- [ ] **New in v1.4:** `CALL | AppBootstrap | Success` or `Error` fires once required startup work completes, carrying client-computed `durationMs`, with the same `callName` used consistently across Canvas and Next.js so dashboard queries group both without special-casing
- [ ] **New in v1.4:** app-open success/load-time dashboards read from `AppBootstrap`, not from a `NAV`-based proxy (see "Note on App Open / Load Success" above)

---

*For questions or proposed amendments to this standard, open a discussion in the team wiki before changing implementations.*
