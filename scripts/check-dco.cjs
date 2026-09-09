const { execFileSync } = require("node:child_process");

const baseRef = process.env.GITHUB_BASE_REF;
if (!baseRef) {
  console.log("DCO check applies to pull requests.");
  process.exit(0);
}

const remoteBase = `origin/${baseRef}`;
const mergeBase = execFileSync("git", ["merge-base", remoteBase, "HEAD"], { encoding: "utf8" }).trim();
const records = execFileSync("git", ["log", "--format=%H%x1f%an%x1f%ae%x1f%B%x1e", `${mergeBase}..HEAD`], {
  encoding: "utf8",
});
const commits = records.split("\x1e").map((record) => record.trim()).filter(Boolean);
const failures = [];

for (const record of commits) {
  const [sha, author, email, ...bodyParts] = record.split("\x1f");
  const body = bodyParts.join("\x1f");
  const signoffs = [...body.matchAll(/^Signed-off-by:\s*(.+?)\s*<([^>]+)>\s*$/gim)];
  const matchesAuthor = signoffs.some((match) => match[1].trim() === author.trim() && match[2].trim().toLowerCase() === email.trim().toLowerCase());
  if (!matchesAuthor) failures.push(`${sha.slice(0, 12)} ${author} <${email}>`);
}

if (failures.length) {
  console.error("These commits are missing a matching DCO Signed-off-by line:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('Amend each commit with "git commit --amend -s" and update the branch.');
  process.exit(1);
}

console.log(`DCO sign-off verified for ${commits.length} commit(s).`);

