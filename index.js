const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

console.log("=== Debug Cai ===");
console.log("Calea folderului (__dirname):", __dirname);
console.log("Calea fisierului (__filename):", __filename);
console.log("Directorul de lucru (process.cwd()):", process.cwd());
console.log("================");

app.listen(PORT, () => {
    console.log(`Serverul a pornit pe http://localhost:${PORT}`);
});