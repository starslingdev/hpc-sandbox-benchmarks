# Daytona exec transport: no streaming + 408 cap

Evidence for two transport facts about running commands in Daytona sandboxes via
`computesdk`. All citations are from this repository
(`starslingdev/sandbox-benchmarks`); line numbers are from the files as
checked in / installed at the time of writing. In particular the
`packages/harness/src/lib/execute.ts` citations describe its **pre-detach+poll
(spike-time) shape** — that file has since been refactored (see the Status update
under **Implication**), so its line numbers will not align with the current file
and the surrounding `SandboxHandle`/`runCommand` descriptions are historical.
Locate each cited symbol by name rather than by line.

---

## FACT 1 — `computesdk` does NOT stream for Daytona

### 1a. The interface advertises streaming as provider-conditional

`node_modules/computesdk/dist/index.d.ts`, `RunCommandOptions` (lines 55-67):

```ts
interface RunCommandOptions {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    background?: boolean;
    /**
     * Callback for streamed stdout chunks when supported by the provider.
     */
    onStdout?: (data: string) => void;
    /**
     * Callback for streamed stderr chunks when supported by the provider.
     */
    onStderr?: (data: string) => void;
}
```

The `onStdout` / `onStderr` callbacks exist on the type, but the doc comments
explicitly qualify them: "streamed ... chunks **when supported by the
provider**" (lines 61, 65). They are an optional capability, not a guarantee.

### 1b. The Daytona provider IGNORES the streaming callbacks

`node_modules/@computesdk/daytona/dist/index.js`, the `runCommand`
implementation (lines 128-148):

```js
runCommand: async (sandbox, command, options) => {
  const startTime = Date.now();
  try {
    let fullCommand = command;
    if (options?.env && Object.keys(options.env).length > 0) {
      const envPrefix = Object.entries(options.env).map(([k, v]) => `${k}="${(0, import_provider.escapeShellArg)(v)}"`).join(" ");
      fullCommand = `${envPrefix} ${fullCommand}`;
    }
    if (options?.cwd) fullCommand = `cd "${(0, import_provider.escapeShellArg)(options.cwd)}" && ${fullCommand}`;
    if (options?.background) fullCommand = `nohup ${fullCommand} > /dev/null 2>&1 &`;
    const response = await sandbox.process.executeCommand(fullCommand);
    return {
      stdout: response.result || "",
      stderr: "",
      exitCode: response.exitCode || 0,
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Daytona command execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
},
```

Observations, each load-bearing:

- **`options.onStdout` / `options.onStderr` are never referenced.** The impl
  reads only `options.env`, `options.cwd`, and `options.background`. The
  streaming callbacks are silently dropped — Daytona is a "not supported by the
  provider" case for FACT 1a.
- **The call is synchronous request/response, not a stream.** Line 138:
  `const response = await sandbox.process.executeCommand(fullCommand);` — a
  single `await` of one round-trip. Output is only available after the command
  returns, via `response.result` (line 140). There is no chunked delivery.
- **`stderr` is hardcoded to the empty string.** Line 141: `stderr: ""`. Even
  the final (non-streamed) stderr is discarded; callers can never see Daytona
  stderr through this path.
- **`background: true` IS supported, via `nohup`.** Line 137:
  `if (options?.background) fullCommand = `nohup ${fullCommand} > /dev/null 2>&1 &`;`
  This rewrites the command to detach it (output to `/dev/null`, backgrounded
  with `&`). So a detached fire-and-forget exec is reachable at the provider
  level — but only by passing `background` through `RunCommandOptions`.
  **Caveat for detached+poll:** `background` wraps the *already-cwd-prefixed*
  command, so combining it with `options.cwd` yields
  `nohup cd "…" && command > /dev/null 2>&1 &` — broken, because `nohup` cannot
  exec the `cd` builtin: the trailing `&` backgrounds the whole `cd … && command`
  list as a unit, so `nohup cd` failing first short-circuits the `&&` and
  `command` never runs (this is the failure mode on Linux, where there is no
  `/usr/bin/cd` — as in Daytona's Linux sandboxes; on macOS/BSD, where
  `/usr/bin/cd` exists and exits 0, `nohup cd` instead succeeds and `command`
  runs in the *wrong* directory). A detached+poll transport that needs a
  working directory must wrap the chain itself, e.g.
  `nohup bash -c 'cd "…" && command' > /dev/null 2>&1 &`.

---

## FACT 2 — Daytona `executeCommand` caps long commands at HTTP 408 (server-side)

### 2a. The observed error

From spike run `bn2f5pmp4` — a single `pts/c-ray` exec driven via the raw
`@daytonaio/sdk` `executeCommand` with a **1200s (20 min) CLIENT timeout**. The
exec was killed by the server long before the client timeout could fire.

Captured in
`/private/tmp/claude-501/-Users-dbworku-repos-sandbox-benchmarks/5d106856-64e7-4bff-bcbc-98e56aa73ee5/tasks/bn2f5pmp4.output`
(lines 1095-1149). The 408 stanza verbatim (lines 1099-1114, 1146):

```
========== [run pts/c-ray (MONITOR)] ==========

deleting sandbox...
deleted.
464 |                 case 404:
465 |                     throw new DaytonaError_1.DaytonaNotFoundError(errorMessage, statusCode, headers);
466 |                 case 429:
467 |                     throw new DaytonaError_1.DaytonaRateLimitError(errorMessage, statusCode, headers);
468 |                 default:
469 |                     throw new DaytonaError_1.DaytonaError(errorMessage, statusCode, headers);
                                                   ^
DaytonaError: request timeout: command execution timeout
 statusCode: 408,
    headers: {
  date: "Sun, 21 Jun 2026 05:14:12 GMT",
  "content-type": "application/json",
  "content-length": "185",
  connection: "keep-alive",
  "strict-transport-security": "max-age=31536000;includeSubDomains;preload",
  "x-request-id": "cec5deb6-9a8f-4f19-87ba-eabcb0986180",
  ...
},

      at /Users/dbworku/repos/sandbox-benchmarks/node_modules/@daytonaio/sdk/src/Daytona.js:469:46
```

Key signals:

- **`statusCode: 408`** with message `request timeout: command execution
  timeout`. HTTP 408 (Request Timeout) is returned **by the Daytona server**,
  carrying real server response headers (`date`, `x-request-id`,
  `strict-transport-security`, `content-length: 185`). This is a server-issued
  HTTP response, not a locally-synthesized client abort.
- It is thrown from the SDK's response-status switch
  (`@daytonaio/sdk/src/Daytona.js:469`, the `default:` branch after the explicit
  404/429 cases) — i.e. the SDK received an HTTP status from the server and
  mapped it to `DaytonaError`.

### 2b. Why this is a SERVER-side synchronous-exec cap, not the client timeout

Two independent facts establish this:

1. **The client timeout was 1200s and never fired.** The error is a 408 carrying
   server headers, raised by the SDK's HTTP-status switch — not the
   client-side `withTimeout` rejection. The server cut the synchronous
   `executeCommand` round-trip well under the 1200s ceiling.
2. **The command kept running in the sandbox AFTER the 408.** During the spike,
   `c-ray` was still visible in `top` inside the sandbox after the 408 was
   returned to the client. The process was not killed; only the synchronous
   HTTP round-trip was terminated. A client-side timeout would have abandoned
   the request but could not, by itself, prove the work continued server-side —
   the continued `c-ray` process is direct evidence that the 408 is the server
   ending the *response*, not the workload.

Together: Daytona's `process.executeCommand` holds the HTTP connection open for
the duration of the command and the **server** caps that synchronous hold,
returning 408 while the command continues executing in the sandbox.

---

## Corroborating code in the harness

`packages/harness/src/lib/execute.ts` drives every suite step through the
computesdk `runCommand` path described in FACT 1, guarded only by a **client-side**
timeout race:

- `StepRunner.run` (lines 108-151) wraps the exec in `withTimeout(...)`
  (lines 119-123):

  ```ts
  result = await withTimeout(
      this.sandbox.runCommand(`bash -c ${shellQuote(`${PREAMBLE}; ${script}`)}`),
      timeoutMs,
      `Step "${label}" timed out after ${Math.round(timeoutMs / 1000)}s`,
  );
  ```

  `withTimeout` (lines 40-52) is a pure `Promise.race` against a `setTimeout`
  rejection — it is purely client-side and cannot extend or replace the
  server's 408 cap; if Daytona returns 408 first, `runCommand` rejects before
  the race resolves.

- `SandboxHandle` (lines 27-30) declares only:

  ```ts
  export interface SandboxHandle {
      runCommand(command: string): Promise<CommandResult>;
      destroy(): Promise<unknown>;
  }
  ```

  `runCommand(command)` takes a single `command` string — **no `options`, and in
  particular NO `background` parameter.** Even though the Daytona provider
  supports `background: true` (FACT 1b, line 137), the harness's handle has no
  way to reach it. There was no detached-exec path at spike time (since added —
  see the Status update under **Implication** below).

The module header (lines 1-6) already anticipates this gap: it scopes itself to
"direct execs (Daytona)" and notes that "the detached+polled transport for
providers that cap a single exec round-trip ... lands when those providers do."
FACT 2 shows Daytona itself is such a provider.

---

## Implication

> **Status update (mirrors the design doc's §5):** this is a point-in-time spike
> record; the **detach + poll** transport it prescribes has since **landed** in the
> harness (`StepRunner.runDetached`, `packages/harness/src/lib/execute.ts`).
> `runCommand` now takes a `RunCommandOptions { background? }` and `SandboxHandle`
> exposes the `filesystem` slice the poll loop reads, so the "no detached-exec path
> today" / "must widen `SandboxHandle`" statements below describe the state **at spike
> time**, not the current code. The findings (HTTP 408 cap, no streaming) stand as the
> rationale for why that transport was built.

Long PTS suites cannot run through Daytona's synchronous `executeCommand` /
computesdk `runCommand` path: the server caps a single exec round-trip at HTTP
408 (`bn2f5pmp4` hit it well under a 1200s client timeout, while `c-ray` kept
running), and streaming does not help because `@computesdk/daytona` ignores
`onStdout`/`onStderr` entirely (and hardcodes `stderr: ""`), so there is no
chunked transport to keep the connection productive. The only durable path is
**detach + poll**: launch the benchmark in the background (the provider already
supports this via `nohup`, `runCommand`'s `background: true`) and poll for
completion / collect results out-of-band. That required widening
`SandboxHandle` (`packages/harness/src/lib/execute.ts:27-30`) to expose a
background/detached exec — its spike-time `runCommand(command)` signature had no
way to request it (since done; see the status note above).
