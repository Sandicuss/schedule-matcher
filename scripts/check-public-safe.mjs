import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const candidateFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);

const checks = [
  {
    name: "Supabase service-role key",
    pattern: /sb_service_role_[A-Za-z0-9_-]+/g,
  },
  {
    name: "Supabase secret key",
    pattern: /sb_secret_[A-Za-z0-9_-]+/g,
  },
  {
    name: "Supabase publishable key",
    pattern: /sb_publishable_[A-Za-z0-9_-]{16,}/g,
  },
  {
    name: "Real Supabase project URL",
    pattern: /https:\/\/(?!your-project-ref\b)[a-z0-9]{20}\.supabase\.co/gi,
  },
  {
    name: "JWT-like token",
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  },
];

const findings = [];

function redact(value) {
  if (value.length <= 12) return "[redacted]";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

for (const file of candidateFiles) {
  const content = readFileSync(file, "utf8");
  if (content.includes("\u0000")) continue;

  for (const check of checks) {
    for (const match of content.matchAll(check.pattern)) {
      const line =
        content.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        file,
        line,
        name: check.name,
        value: redact(match[0]),
      });
    }
  }
}

if (findings.length) {
  console.error("Potential public-repo secrets found:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.name} (${finding.value})`,
    );
  }
  process.exit(1);
}

console.log(
  `Checked ${candidateFiles.length} public candidate files; no obvious Supabase secrets found.`,
);
