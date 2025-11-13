#!/usr/bin/env node
import fs from "fs";
import path from "path";
const envPath = path.join(process.cwd(), "frontend", ".env.local");
if (!fs.existsSync(envPath)) { process.exit(0); }
let s = fs.readFileSync(envPath, "utf8");
s = s.replace(/VITE_GOOGLE_CLIENT_ID=.*/g, "VITE_GOOGLE_CLIENT_ID=");
fs.writeFileSync(envPath, s);
console.log("CLEARED CLIENT ID");
