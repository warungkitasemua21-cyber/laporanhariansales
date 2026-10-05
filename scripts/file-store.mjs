import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
// Local development only. Netlify production always uses Netlify Blobs.
export function fileStore(root='.local-data') {
  let queue=Promise.resolve();
  const filename=key=>path.join(root,createHash('sha256').update(key).digest('hex')+'.json');
  async function read(key){try{return JSON.parse(await fs.readFile(filename(key),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  return {
    async get(key){return (await read(key))?.data||null;},
    async getWithMetadata(key){return read(key);},
    async setJSON(key,data,options={}){
      const operation=async()=>{await fs.mkdir(root,{recursive:true});const old=await read(key);if(options.onlyIfNew&&old)return {modified:false};if(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=createHash('sha256').update(JSON.stringify(data)+Math.random()).digest('hex');await fs.writeFile(filename(key),JSON.stringify({data,etag}));return {modified:true,etag};};
      const result=queue.then(operation);queue=result.catch(()=>{});return result;
    },
    async delete(key){await fs.rm(filename(key),{force:true});}
  };
}
