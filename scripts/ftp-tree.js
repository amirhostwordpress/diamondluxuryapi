const ftp = require("basic-ftp");

async function ls(c, p, depth = 0) {
  const pad = "  ".repeat(depth);
  try {
    const items = await c.list(p);
    for (const f of items) {
      const label = (f.type === 2 ? "[DIR]" : "[FIL]") + " " + p + "/" + f.name;
      const size  = f.type !== 2 ? ` (${(f.size/1024).toFixed(0)} KB)` : "";
      console.log(pad + label + size);
      if (f.type === 2 && depth < 4) await ls(c, p + "/" + f.name, depth + 1);
    }
  } catch (e) {
    console.log(pad + "(error listing " + p + ": " + e.message + ")");
  }
}

async function run() {
  const c = new ftp.Client();
  c.ftp.verbose = false;
  await c.access({ host: "ftp.amirhost.in", port: 21, user: "u184056080.diamonduser", password: "Onion@123321", secure: false });
  console.log("FTP full tree:\n");
  await ls(c, "/");
  c.close();
}
run().catch(e => { console.error("Error:", e.message); process.exit(1); });
