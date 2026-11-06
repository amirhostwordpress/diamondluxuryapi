const ftp = require("basic-ftp");

async function listRecursive(client, dir, depth = 0) {
  const items = await client.list(dir);
  for (const f of items) {
    const indent = "  ".repeat(depth);
    const icon = f.type === 2 ? "[DIR]" : "[FILE]";
    console.log(`  ${indent}${icon} ${f.name}`);
    // recurse one level into directories
    if (f.type === 2 && depth < 2 && !f.name.startsWith(".")) {
      try {
        await listRecursive(client, `${dir}/${f.name}`, depth + 1);
      } catch { /* skip permission errors */ }
    }
  }
}

async function test() {
  const client = new ftp.Client();
  client.ftp.verbose = false; // quiet mode

  try {
    await client.access({
      host:     "ftp.amirhost.in",
      port:     21,
      user:     "u184056080.diamonduser",
      password: "Onion@123321",
      secure:   false,
    });

    console.log("✅ FTP connected!\n");
    console.log("Full directory tree (3 levels):");
    await listRecursive(client, "/", 0);

  } finally {
    client.close();
  }
}

test().catch(e => {
  console.error("❌ FTP failed:", e.message);
  process.exit(1);
});
