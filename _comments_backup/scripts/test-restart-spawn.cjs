/* eslint-disable */
// Sandbox proof for the restart_server detached-respawn mechanism. Spawns a
// detached child with the SAME spawn shape, then exits (simulating the old
// server dying). The child waits ~2s, writes a marker, and starts an HTTP
// server on a free test port — proving it survived parent death and kept cwd.
// Child stdio goes to a log file here (the real restart uses 'ignore') so any
// failure is visible. Self-cleans (child exits after 8s).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3897;
const TOKEN = 'CHILD-OK';
const node = process.execPath;
const childScript = path.join(__dirname, '_restart-sandbox-child.cjs');
const marker = path.join(__dirname, '_restart-sandbox-marker.txt');
const logFile = path.join(__dirname, '_restart-sandbox-child.log');

for (const f of [marker]) { try { fs.unlinkSync(f); } catch {} }

fs.writeFileSync(childScript,
  "const http=require('http');const fs=require('fs');\n" +
  "try{fs.writeFileSync(" + JSON.stringify(marker) + ",'" + TOKEN + " pid='+process.pid+' cwd='+process.cwd()+' at='+new Date().toISOString());}catch(e){console.error('marker fail',e);}\n" +
  "const s=http.createServer((q,r)=>r.end('" + TOKEN + " pid='+process.pid));\n" +
  "s.on('error',e=>{console.error('listen error',e);process.exit(3);});\n" +
  "s.listen(" + PORT + ",'127.0.0.1',()=>console.log('child listening pid',process.pid));\n" +
  "setTimeout(()=>process.exit(0),8000);\n");

const out = fs.openSync(logFile, 'w');
const isWin = process.platform === 'win32';
const child = isWin
  ? spawn('cmd.exe', ['/c', `ping -n 3 127.0.0.1 >nul & "${node}" "${childScript}"`],
      { cwd: process.cwd(), detached: true, stdio: ['ignore', out, out], windowsHide: true, windowsVerbatimArguments: true })
  : spawn('sh', ['-c', `sleep 2; exec "${node}" "${childScript}"`],
      { cwd: process.cwd(), detached: true, stdio: ['ignore', out, out] });
child.unref();
console.log('[driver] spawned detached respawner pid', child.pid, '-> child server will bind :' + PORT);

setTimeout(() => {
  console.log('[driver] EXITING now (parent death). Child must still come up.');
  process.exit(0);
}, 1000);
