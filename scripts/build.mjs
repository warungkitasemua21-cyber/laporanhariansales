import fs from 'node:fs/promises';
await fs.rm('dist',{recursive:true,force:true});
await fs.mkdir('dist',{recursive:true});
await fs.cp('public','dist',{recursive:true});
await fs.copyFile('src/app.js','dist/app.js');
console.log('Build selesai. Aset publik di dist; akun dan template hanya di server.');
