// PTS sets HOME to its installed profile directory with a trailing slash. Mastra's pinned
// filesystem tests join a path (which drops that slash), then replace homedir() with "~".
// Exercise that same boundary through the production runner, rather than mocking HOME's value.
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();
const child = join(home, ".mastra-tilde-test-fixture");
assert.equal(child.replace(home, "~"), "~/.mastra-tilde-test-fixture");
console.log("HOME path round-trip OK");
