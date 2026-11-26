// The Comment Above the Code — entry program.
// Writes one funny, painfully honest comment (a developer's line left above
// fragile production code) to /output/entry.txt, after validating the gate:
// 1-200 characters, UTF-8, single line, not only whitespace.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const ENTRY =
  "// Do not touch this function — it has survived three rewrites, two CTOs and one resignation, and it is still the only thing holding prod together.";

const MIN_CHARS = 1;
const MAX_CHARS = 200;
const MAX_BYTES = 800;

function fail(message: string): never {
  throw new Error(`gate validation failed: ${message}`);
}

function validateGate(entry: string): void {
  const chars = [...entry];
  if (chars.length < MIN_CHARS || chars.length > MAX_CHARS) {
    fail(`length ${chars.length} chars is outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  if (entry.trim().length === 0) {
    fail("entry is only whitespace");
  }
  if (entry.includes("\n") || entry.includes("\r")) {
    fail("entry must be a single line");
  }
  if (entry.charCodeAt(0) === 0xfeff) {
    fail("entry starts with a BOM");
  }
  // Fail fast: the line must read like a comment actually left in a codebase,
  // so it has to open with the comment marker rather than bare prose.
  if (!entry.startsWith("//")) {
    fail("entry must start with // to read as a code comment");
  }
  if (entry !== entry.trimEnd()) {
    fail("entry has trailing whitespace");
  }
  for (const ch of entry) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && ch !== "\t") {
      fail(`control character U+${code.toString(16).padStart(4, "0")}`);
    }
  }
  const bytes = Buffer.byteLength(entry, "utf8");
  if (bytes > MAX_BYTES) {
    fail(`byte length ${bytes} exceeds cap ${MAX_BYTES}`);
  }
  if (Buffer.from(entry, "utf8").toString("utf8") !== entry) {
    fail("entry is not a valid UTF-8 round-trip");
  }
}

function emptyOutputDir(): void {
  mkdirSync("/output", { recursive: true });
  // Empty the CONTENTS of /output only; never remove the directory itself
  // (it is a mount point shared by the grader).
  for (const name of readdirSync("/output")) {
    rmSync(`/output/${name}`, { recursive: true, force: true });
  }
}

function main(): void {
  validateGate(ENTRY);
  emptyOutputDir();
  writeFileSync("/output/entry.txt", ENTRY, "utf8");
  const written = readFileSync("/output/entry.txt", "utf8");
  if (written !== ENTRY) {
    fail("read-back mismatch after writing entry.txt");
  }
  const sha = createHash("sha256").update(written, "utf8").digest("hex");
  console.log(`wrote /output/entry.txt (${[...ENTRY].length} chars, sha256 ${sha})`);
}

main();
