// Explore FTP with the main Hostinger account format
const ftp = require("basic-ftp");

const configs = [
  // Main Hostinger account (underscore format)
  { user: "u184056080", label: "u184056080 (main account)" },
  // Sub-account with dot
  { user: "u184056080.diamonduser", label: "u184056080.diamonduser" },
];

async function explore(cfg) {
  const c = new ftp.Client();
  c.ftp.verbose = false;
  try {
    await c.access({
      host: "ftp.amirhost.in", port: 21,
      user: cfg.user, password: "Onion@123321", secure: false,
    });
    console.log(`\n✅ Connected as: ${cfg.label}`);

    const tryList = async (path) => {
      try { return await c.list(path); } catch { return null; }
    };

    const root = await tryList("/");
    if (root) {
      console.log("  / contents:");
      root.forEach(f => console.log("    " + (f.type === 2 ? "[DIR] " : "[FILE]") + f.name));

      for (const f of root) {
        if (f.type === 2) {
          const sub = await tryList(`/${f.name}`);
          if (sub && sub.length > 0) {
            console.log(`  /${f.name}:`);
            sub.forEach(s => console.log("      " + (s.type === 2 ? "[DIR] " : "[FILE]") + s.name));
          }
        }
      }
    }
  } catch(e) {
    console.log(`\n❌ ${cfg.label} — ${e.message}`);
  } finally {
    c.close();
  }
}

async function run() {
  for (const cfg of configs) {
    await explore(cfg);
  }
}

run().catch(e => console.error(e.message));
