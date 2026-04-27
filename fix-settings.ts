import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// 1. Wrap top level awaits in an IIFE
content = content.replace(/try\s*\{\s*await\s*pgDb\.run\('ALTER TABLE servers/g, "await (async () => {\n  try { await pgDb.run('ALTER TABLE servers");
content = content.replace(/try \{\s*await pgDb\.run\('ALTER TABLE device_options ADD COLUMN name TEXT'\);\s*\} catch\(e\) \{\}/g, "try { await pgDb.run('ALTER TABLE device_options ADD COLUMN name TEXT'); } catch(e) {}\n})();");

// 2. Change getSetting to async
content = content.replace(/function getSetting\(/g, "async function getSetting(");

// 3. Update getSetting calls to await getSetting
content = content.replace(/const globalSettings = getSetting/g, "const globalSettings = await getSetting");
content = content.replace(/res\.json\(getSetting/g, "res.json(await getSetting");
content = content.replace(/const methods = getSetting/g, "const methods = await getSetting");
content = content.replace(/const paymentSettings = getSetting/g, "const paymentSettings = await getSetting");
content = content.replace(/const keys = getSetting/g, "const keys = await getSetting");
content = content.replace(/const darkxApiKey = \(getSetting/g, "const darkxApiKey = (await getSetting");
content = content.replace(/const settings = getSetting/g, "const settings = await getSetting");

// 4. Wrap top-level sync calls if any (but inside server.ts they are probably inside express routes or inside Top-level async since ES modules allow Top-level await!)
// The error was "Top-level 'await' expressions are only allowed when the 'module' option is set to ESNext".
// Node.js with tsx *supports* it by default, BUT `pgDb.run` calls were failing because tsx might run it into CommonJS or something?
// Actually `esbuild` converts it when doing TSX. If I wrap them, it will fix it.

fs.writeFileSync('server.ts', content);
