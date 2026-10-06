// Create an admin, or set/reset an existing admin's password.
//
// Run from the texttrack-repo folder (it reads DATABASE_URL from your .env):
//   npx tsx scripts/set-admin-password.ts
// Add --reset-mfa to also clear the authenticator so the admin re-enrolls on next login.
//
// Passwords are typed hidden and stored only as a salted scrypt hash.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    let value = "";
    if (hidden && stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          if (hidden && stdin.isTTY) stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") process.exit(1); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = ((await ask("Admin email [admin@chipperfield.ag]: ")).trim() || "admin@chipperfield.ag").toLowerCase();
  const existing = await db.admin.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  const name = existing
    ? existing.name
    : (await ask("Display name: ")).trim() || "Admin";

  const pw = await ask("New password (12+ characters): ", true);
  if (pw.length < 12) throw new Error("Password must be at least 12 characters.");
  const again = await ask("Type it again: ", true);
  if (pw !== again) throw new Error("Passwords didn't match.");

  const passwordHash = await hashPassword(pw);
  const resetMfa = process.argv.includes("--reset-mfa");

  if (existing) {
    await db.admin.update({
      where: { id: existing.id },
      data: { passwordHash, ...(resetMfa ? { mfaSecret: null } : {}) },
    });
    console.log(`Updated password for ${existing.email}${resetMfa ? " (authenticator reset)" : ""}.`);
  } else {
    const created = await db.admin.create({
      data: { email, name, passwordHash, role: "SUPER_ADMIN" },
    });
    console.log(`Created SUPER_ADMIN ${created.email}.`);
  }
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
