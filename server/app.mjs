import master from './master.json' with { type: 'json' };
import credentials from './credentials.json' with { type: 'json' };
import { digest, hashPassword, verifyPassword, randomToken, temporaryPassword } from './security.mjs';
import { exportWorkbook } from './export.mjs';

const users = master.users;
const active = u => u.status_aktif === 'Aktif';
const userById = id => users.find(u => u.id_pic === id && active(u));
export const jakartaDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Jakarta', year:'numeric',month:'2-digit',day:'2-digit' }).format(d);
export function visibleUsers(actor) {
  if (actor.jabatan === 'Manager') return users.filter(active);
  const ids = new Set([actor.id_pic]);
  for (let i=0;i<users.length;i++) for(const u of users) if(active(u) && ids.has(u.id_atasan)) ids.add(u.id_pic);
  return users.filter(u => active(u) && ids.has(u.id_pic));
}
export function validateMaster() {
  const ids = new Set();
  for (const u of users) {
    if(ids.has(u.id_pic.toLowerCase())) throw new Error('ID PIC ganda');
    ids.add(u.id_pic.toLowerCase());
    if(!['Manager','ASM','SPV','Sales'].includes(u.jabatan)) throw new Error('Jabatan tidak valid');
    if(u.jabatan !== 'Manager' && !userById(u.id_atasan)) throw new Error(`Atasan tidak tersedia: ${u.id_pic}`);
    let cursor=u; const path=new Set();
    while(cursor) { if(path.has(cursor.id_pic)) throw new Error('Hierarki melingkar'); path.add(cursor.id_pic); cursor=userById(cursor.id_atasan); }
  }
  return true;
}
validateMaster();
class AppError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(code,msg)=>{throw new AppError(code,msg);};
const cleanUser=u=>({...u,username:u.id_pic.toLowerCase()});
const validDate = value => {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400,'Tanggal tidak valid.');
  const d=new Date(`${value}T00:00:00Z`);
  if(!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==value) fail(400,'Tanggal tidak valid.');
  return value;
};
const text=(v,max=3000)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)fail(400,'Isi teks terlalu panjang atau tidak valid.');return v.trim();};
const keyFor=(id,date)=>`reports/${date}/${id}`;
export function reportStatus(report) {
  if(!report) return 'Belum Lapor';
  if(report.status === 'Draft') return 'Draft';
  return report.review || 'Belum Diperiksa';
}
export function validateReport(body, actor) {
  const date=validDate(body.date);
  if(date>jakartaDate())fail(400,'Laporan tidak dapat diisi untuk tanggal mendatang.');
  if(actor.jabatan==='Manager')fail(403,'Manager memantau dan memeriksa laporan.');
  if(body.picId && body.picId!==actor.id_pic)fail(403,'Hanya laporan sendiri yang dapat diubah.');
  if(!['Draft','Dikirim'].includes(body.status))fail(400,'Status laporan tidak valid.');
  const activities=master.activities.filter(a=>a.role===actor.jabatan);
  const checks={};
  for(const a of activities){
    const value=body.checks?.[a.column] || '';
    if(!['','Selesai','Proses','Belum','Tidak Berlaku'].includes(value))fail(400,`Status ${a.code} tidak valid.`);
    if(value==='Tidak Berlaku' && a.rule!=='Bersyarat')fail(400,`${a.code} wajib diisi, Tidak Berlaku hanya untuk kegiatan bersyarat.`);
    if(body.status==='Dikirim' && !value)fail(400,`Lengkapi kegiatan ${a.code}.`);
    checks[a.column]=value;
  }
  const note=text(body.note),action=text(body.action),actionPic=text(body.actionPic,60),due=body.due ? validDate(body.due):'',proof=text(body.proof,2000);
  if(actionPic && !userById(actionPic))fail(400,'PIC tindak lanjut tidak terdaftar.');
  if(body.status==='Dikirim') {
    if(Object.values(checks).includes('Tidak Berlaku') && !note)fail(400,'Isi kode dan alasan kegiatan yang Tidak Berlaku.');
    if(Object.values(checks).some(v=>v==='Proses'||v==='Belum') && (!note||!action||!actionPic||!due))fail(400,'Isi kendala, tindak lanjut, ID PIC, dan tenggat untuk kegiatan Proses/Belum.');
    try {const u=new URL(proof);if(!['https:','http:'].includes(u.protocol))throw Error();}catch{fail(400,'Isi tautan bukti kegiatan yang dimulai dengan https:// atau http://.');}
  }
  return {date,picId:actor.id_pic,checks,note,action,actionPic,due,proof,status:body.status};
}

export function createApp({storeFactory, secureCookies=true, clock=()=>Date.now()}) {
  const reply=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
  const cookie=token=>`sb_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?43200:0}${secureCookies?'; Secure':''}`;
  async function loadAccount(store,id){const stored=await store.getWithMetadata(`accounts/${id}`,{type:'json'});return {data:stored?.data||credentials[id],etag:stored?.etag};}
  async function write(store,key,value,etag) {
    const writeId=randomToken(); value={...value,writeId};
    const result=await store.setJSON(key,value,etag?{onlyIfMatch:etag}:{onlyIfNew:true});
    if(!result?.modified)fail(409,'Data sudah berubah. Muat ulang sebelum menyimpan kembali.');
    const saved=await store.getWithMetadata(key,{type:'json'});
    if(saved?.data?.writeId!==writeId)fail(409,'Penyimpanan belum dapat dikonfirmasi. Muat ulang untuk memeriksa data terbaru.');
    return saved;
  }
  async function auth(req,store){
    const match=req.headers.get('cookie')?.match(/(?:^|;\s*)sb_session=([A-Za-z0-9_-]+)/);
    if(!match)fail(401,'Silakan login.');
    const session=await store.get(`sessions/${digest(match[1])}`,{type:'json'});
    if(!session||session.expires<=clock())fail(401,'Sesi telah berakhir. Silakan login kembali.');
    const user=userById(session.id); if(!user)fail(401,'Akun tidak aktif.');
    const account=await loadAccount(store,user.id_pic);
    if(!account.data||session.version!==digest(account.data.hash))fail(401,'Silakan login kembali setelah password diubah.');
    return {user,account,token:match[1]};
  }
  async function payload(req){const s=await req.text();if(s.length>50000)fail(413,'Data terlalu besar.');try{return JSON.parse(s||'{}');}catch{fail(400,'Data tidak valid.');}}
  async function snapshot(store,actor,date){
    const visible=visibleUsers(actor);
    const rows=await Promise.all(visible.filter(u=>u.jabatan!=='Manager').map(async u=>{
      const record=await store.get(keyFor(u.id_pic,date),{type:'json'});
      return {...cleanUser(u),report:record||null,reportStatus:reportStatus(record),canReview:u.id_atasan===actor.id_pic && record?.status==='Dikirim' && record?.review==='Belum Diperiksa'};
    }));
    return {date,rows,users:visible.map(cleanUser),activities:master.activities,counts:{expected:rows.length,sent:rows.filter(r=>r.report?.status==='Dikirim').length,missing:rows.filter(r=>!r.report||r.report.status==='Draft').length,pending:rows.filter(r=>r.report?.status==='Dikirim'&&r.report.review==='Belum Diperiksa').length,approved:rows.filter(r=>r.report?.review==='Disetujui').length,revision:rows.filter(r=>r.report?.review==='Perlu Perbaikan').length}};
  }
  return async function handle(req,context={}) {
    try {
      const url=new URL(req.url); const route=url.pathname.replace(/^\/.netlify\/functions\/api/,'/api');
      if(!['GET','POST'].includes(req.method))fail(405,'Metode tidak didukung.');
      if(req.method==='POST' && req.headers.get('origin') && req.headers.get('origin')!==url.origin)fail(403,'Permintaan berasal dari situs lain.');
      if(req.method==='POST' && !req.headers.get('content-type')?.startsWith('application/json'))fail(415,'Gunakan JSON.');
      const store=storeFactory();
      if(route==='/api/login' && req.method==='POST') {
        const body=await payload(req),username=text(body.username,60).toLowerCase(),password=text(body.password,200);
        const bucket=Math.floor(clock()/900000);
        const attemptKey=`attempts/${bucket}/${digest(`${context.ip||'unknown'}:${username}`)}`;
        for(let i=0;i<5;i++){
          const prior=await store.getWithMetadata(attemptKey,{type:'json'});
          if((prior?.data?.count||0)>=12)fail(429,'Terlalu banyak percobaan login. Coba kembali 15 menit lagi.');
          const result=await store.setJSON(attemptKey,{count:(prior?.data?.count||0)+1,expires:clock()+1800000},prior?{onlyIfMatch:prior.etag}:{onlyIfNew:true});
          if(result.modified)break;if(i===4)fail(429,'Silakan coba login kembali.');
        }
        const user=users.find(u=>active(u)&&u.id_pic.toLowerCase()===username);
        const account=user?await loadAccount(store,user.id_pic):null;
        if(!account?.data || !verifyPassword(password,account.data.hash))fail(401,'Username atau password salah.');
        const token=randomToken();
        await write(store,`sessions/${digest(token)}`,{id:user.id_pic,version:digest(account.data.hash),expires:clock()+43200000});
        return reply({user:cleanUser(user),mustChange:account.data.mustChange},200,{'Set-Cookie':cookie(token)});
      }
      const {user,account,token}=await auth(req,store);
      if(route==='/api/logout'&&req.method==='POST'){await store.delete(`sessions/${digest(token)}`);return reply({ok:true},200,{'Set-Cookie':cookie('')});}
      if(route==='/api/me'&&req.method==='GET')return reply({user:cleanUser(user),mustChange:account.data.mustChange,today:jakartaDate()});
      if(route==='/api/password'&&req.method==='POST') {
        const b=await payload(req),old=text(b.oldPassword,200),next=text(b.newPassword,200);
        if(!verifyPassword(old,account.data.hash))fail(400,'Password lama salah.');
        if(next.length<10||!/[a-zA-Z]/.test(next)||!/[0-9]/.test(next)||next===old)fail(400,'Gunakan password baru minimal 10 karakter, mengandung huruf dan angka.');
        const changed={hash:hashPassword(next),mustChange:false};
        await write(store,`accounts/${user.id_pic}`,changed,account.etag);
        const newToken=randomToken();
        await write(store,`sessions/${digest(newToken)}`,{id:user.id_pic,version:digest(changed.hash),expires:clock()+43200000});
        await store.delete(`sessions/${digest(token)}`);
        return reply({ok:true},200,{'Set-Cookie':cookie(newToken)});
      }
      if(account.data.mustChange)fail(403,'Ganti password awal sebelum menggunakan dashboard.');
      if(route==='/api/reset-password'&&req.method==='POST'){
        if(user.jabatan!=='Manager')fail(403,'Hanya Manager yang dapat mereset password.');
        const b=await payload(req),target=userById(b.picId);
        if(!target||target.id_pic===user.id_pic)fail(400,'Pilih akun PIC lainnya.');
        const prior=await loadAccount(store,target.id_pic),password=temporaryPassword();
        await write(store,`accounts/${target.id_pic}`,{hash:hashPassword(password),mustChange:true},prior.etag);
        return reply({username:target.id_pic.toLowerCase(),password});
      }
      if(route==='/api/dashboard'&&req.method==='GET')return reply(await snapshot(store,user,validDate(url.searchParams.get('date')||jakartaDate())));
      if(route==='/api/report'&&req.method==='GET'){
        const id=url.searchParams.get('pic')||user.id_pic,date=validDate(url.searchParams.get('date')||jakartaDate());
        if(!visibleUsers(user).some(u=>u.id_pic===id))fail(403,'Laporan di luar tim Anda.');
        return reply({report:await store.get(keyFor(id,date),{type:'json'})});
      }
      if(route==='/api/report'&&req.method==='POST') {
        const b=await payload(req),report=validateReport(b,user),key=keyFor(user.id_pic,report.date);
        const prior=await store.getWithMetadata(key,{type:'json'});
        if((prior?.data?.revision||0)!==b.revision)fail(409,'Laporan telah berubah. Muat ulang terlebih dahulu.');
        if(prior?.data?.status==='Dikirim'&&prior.data.review!=='Perlu Perbaikan')fail(409,'Laporan yang telah dikirim dikunci hingga atasan meminta perbaikan.');
        const now=new Date(clock()).toISOString();
        const next={...report,identity:cleanUser(user),revision:(prior?.data?.revision||0)+1,review:report.status==='Dikirim'?'Belum Diperiksa':'',reviewer:'',reviewedAt:'',reviewNote:'',submittedAt:report.status==='Dikirim'?now:'',updatedAt:now,history:[...(prior?.data?.history||[]),{at:now,by:user.id_pic,action:report.status==='Dikirim'?'Kirim laporan':'Simpan draft',revision:(prior?.data?.revision||0)+1}].slice(-200)};
        const saved=await write(store,key,next,prior?.etag);
        return reply({report:saved.data});
      }
      if(route==='/api/review'&&req.method==='POST') {
        const b=await payload(req),date=validDate(b.date),target=userById(b.picId);
        if(!target||target.id_atasan!==user.id_pic||target.id_pic===user.id_pic)fail(403,'Persetujuan hanya oleh atasan langsung sesuai Master PIC.');
        if(!['Disetujui','Perlu Perbaikan'].includes(b.decision))fail(400,'Hasil review tidak valid.');
        const note=text(b.note);if(b.decision==='Perlu Perbaikan'&&!note)fail(400,'Isi catatan perbaikan.');
        const key=keyFor(target.id_pic,date),prior=await store.getWithMetadata(key,{type:'json'});
        if(!prior||prior.data.status!=='Dikirim'||prior.data.review!=='Belum Diperiksa')fail(409,'Laporan tidak sedang menunggu review.');
        if(prior.data.revision!==b.revision)fail(409,'Isi laporan sudah berubah. Muat ulang sebelum review.');
        const now=new Date(clock()).toISOString();
        const next={...prior.data,review:b.decision,reviewer:user.id_pic,reviewedAt:now,reviewNote:note,revision:prior.data.revision+1,updatedAt:now,history:[...prior.data.history,{at:now,by:user.id_pic,action:b.decision,note,revision:prior.data.revision+1}].slice(-200)};
        return reply({report:(await write(store,key,next,prior.etag)).data});
      }
      if(route==='/api/export'&&req.method==='GET') {
        const from=validDate(url.searchParams.get('from')||jakartaDate()),to=validDate(url.searchParams.get('to')||from);
        const days=(new Date(to)-new Date(from))/86400000+1;
        if(days<1||days>31)fail(400,'Unduhan dibatasi 1 sampai 31 hari per file.');
        const snapshots=[];
        for(let i=0;i<days;i++){const date=new Date(new Date(from).getTime()+i*86400000).toISOString().slice(0,10);snapshots.push(await snapshot(store,user,date));}
        const bytes=await exportWorkbook({master,users:visibleUsers(user),snapshots,from,to});
        return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="Report_Harian_Surabraja_${from}_${to}.xlsx"`,'Cache-Control':'no-store'}});
      }
      fail(404,'Halaman tidak ditemukan.');
    } catch(e) {
      if(!e.status)console.error('Dashboard request failed:',e.name,e.message);
      return reply({error:e.status?e.message:'Layanan penyimpanan belum tersedia. Pastikan situs dibangun melalui GitHub di Netlify, lalu coba kembali.'},e.status||503);
    }
  };
}
