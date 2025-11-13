#!/usr/bin/env node
import fs from "fs";
import path from "path";
import child_process from "child_process";

const root = process.cwd();
const port = process.env.PORT || "5173";
const envPath = path.join(root, "frontend", ".env.local");
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const client = (env.match(/VITE_GOOGLE_CLIENT_ID=(.*)/)?.[1] || "").trim();
const origins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://localhost:4173`];
const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";

console.log("=== CONVERGENT OAUTH ASSIST ===");
origins.forEach(o => console.log(o));
console.log(envPath);
console.log(client ? client : "NO_CLIENT");

try { child_process.execSync(`${opener} "https://console.cloud.google.com/apis/credentials/consent"`); } catch {}
try { child_process.execSync(`${opener} "https://console.cloud.google.com/apis/credentials"`); } catch {}

console.log("SET CONSENT=Testing; ADD YOUR EMAIL AS TEST USER; CREATE WEB CLIENT; ADD ORIGINS ABOVE; COPY CLIENT ID; EDIT .env.local; RESTART DEV; OPEN /debug/oauth");
