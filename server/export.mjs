import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const serial=d=>(new Date(`${d}T00:00:00Z`).getTime()-Date.UTC(1899,11,30))/86400000;
const time=d=>d ? (new Date(d).getTime()-Date.UTC(1899,11,30))/86400000+7/24 : '';
function styles(xml,row) {
  const body=xml.match(new RegExp(`<row\\b[^>]*\\br="${row}"[^>]*>[\\s\\S]*?<\\/row>`))?.[0]||'';
  return Object.fromEntries([...body.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*\bs="(\d+)"/g)].map(m=>[m[1],m[2]]));
}
function rowXML(number,values,style={}) {
  return `<row r="${number}" ht="30" customHeight="1">${values.map((v,i)=>{const c=col(i),s=style[c]?` s="${style[c]}"`:'';if(v===null||v===undefined||v==='')return `<c r="${c}${number}"${s}/>`;return typeof v==='number'?`<c r="${c}${number}"${s}><v>${v}</v></c>`:`<c r="${c}${number}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;}).join('')}</row>`;
}
function replaceData(xml,rows,endColumn,endRow) {
  return xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/,`<sheetData>${rows}</sheetData>`).replace(/<dimension\b[^>]*\/>/,`<dimension ref="A1:${endColumn}${endRow}"/>`);
}
const originalRows=xml=>[...xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g)].map(m=>({n:Number(m[1]),xml:m[0]}));
export function counts(report,total) {
  const values=Object.values(report?.checks||{}),count=v=>values.filter(x=>x===v).length;
  const na=count('Tidak Berlaku'),done=count('Selesai'),applicable=total-na;
  return {applicable,done,process:count('Proses'),notDone:count('Belum'),na,blank:total-values.filter(Boolean).length,percent:applicable?done/applicable:'n.a.'};
}
export async function exportWorkbook({master,users,snapshots,from,to}) {
  const zip=await JSZip.loadAsync(await readFile(path.resolve('server/template.xlsx')));
  const templateDateStyles=styles(await zip.file('xl/worksheets/sheet2.xml').async('string'),8);
  for(const [role,sheetNo] of [['Sales',2],['SPV',3],['ASM',4]]) {
    const path=`xl/worksheets/sheet${sheetNo}.xml`,xml=await zip.file(path).async('string');
    const style=styles(xml,8),head=originalRows(xml).filter(r=>r.n<8).map(r=>r.xml).join('');
    const records=snapshots.flatMap(s=>s.rows.filter(r=>r.jabatan===role&&r.report).map(r=>r.report));
    const columns=master.columns[role];
    const data=records.map((r,i)=>{
      const u=r.identity||users.find(u=>u.id_pic===r.picId),c=counts(r,master.activities.filter(a=>a.role===role).length);
      const values={tanggal:serial(r.date),id_pic:r.picId,nama_pic:u.nama_pic,cabang:u.cabang,area:u.area,id_atasan:u.id_atasan,...r.checks,catatan_kendala_alasan:r.note,tindak_lanjut:r.action,id_pic_tindak_lanjut:r.actionPic,tenggat:r.due?serial(r.due):'',link_bukti:r.proof,status_laporan:r.status,waktu_kirim:time(r.submittedAt),hasil_review:r.review,id_pemeriksa:r.reviewer,waktu_review:time(r.reviewedAt),catatan_review:r.reviewNote,cek_berlaku:c.applicable,cek_selesai:c.done,cek_proses:c.process,cek_belum:c.notDone,cek_tidak_berlaku:c.na,cek_kosong:c.blank,persen_selesai:c.percent,validasi_data:r.status==='Draft'?'Draft belum dikirim':'OK'};
      return rowXML(i+8,columns.map(k=>values[k]??''),style);
    }).join('');
    zip.file(path,replaceData(xml,head+data,col(columns.length-1),Math.max(8,records.length+7)));
  }
  {
    const path='xl/worksheets/sheet5.xml',xml=await zip.file(path).async('string');
    const keys=['id_pic','nama_pic','jabatan','cabang','area','id_atasan','status_aktif'];
    zip.file(path,replaceData(xml,originalRows(xml).filter(r=>r.n<8).map(r=>r.xml).join('')+users.map((u,i)=>rowXML(i+8,keys.map(k=>u[k]),styles(xml,8))).join(''),'G',users.length+7));
  }
  {
    const path='xl/worksheets/sheet1.xml',xml=await zip.file(path).async('string'),last=snapshots.at(-1);
    const rows=originalRows(xml).filter(r=>r.n<20).map(r=>{
      if(r.n===4)return rowXML(4,['Tanggal pantau',serial(to),'',`Rekap tanggal ${to}. Detail seluruh periode ${from} sampai ${to} tersedia pada Status_Report.`],styles(xml,4));
      if(r.n>=8&&r.n<=10){const role=['Sales','SPV','ASM'][r.n-8],items=last.rows.filter(u=>u.jabatan===role);return rowXML(r.n,[role,items.length,items.filter(u=>u.report?.status==='Dikirim').length,items.filter(u=>!u.report).length,items.filter(u=>u.report?.status==='Draft').length,items.filter(u=>u.report?.review==='Belum Diperiksa').length,items.filter(u=>u.report?.review==='Perlu Perbaikan').length],styles(xml,r.n));}
      if(r.n===12)return rowXML(12,['Pemeriksaan',last.counts.missing?'Ada PIC belum mengirim laporan':'Seluruh PIC telah mengirim laporan'],styles(xml,12));
      if(r.n===14)return rowXML(14,['Persetujuan mengikuti ID atasan pada Master_PIC, termasuk Sales yang melapor langsung ke ASM atau Manager.'],styles(xml,14));
      return r.xml;
    }).join('')+last.rows.map((u,i)=>{const r=u.report,c=counts(r,master.activities.filter(a=>a.role===u.jabatan).length);return rowXML(i+20,[u.id_pic,u.nama_pic,u.jabatan,u.cabang,u.area,r?1:0,r?.status||'Belum Lapor',r?c.applicable:'',r?c.done:'',r?c.process:'',r?c.notDone:'',r?c.blank:'',r?c.percent:'n.a.',r?.review||'',r?.status==='Draft'?'Draft belum dikirim':!r?'Belum ada laporan':r.reviewNote||''],styles(xml,20));}).join('');
    zip.file(path,replaceData(xml,rows,'O',last.rows.length+19));
  }
  // Inline the original shared strings, then remove the source dictionary so
  // restricted exports do not retain names of PIC outside the viewer's team.
  const ss=zip.file('xl/sharedStrings.xml');
  if(ss){const list=[...(await ss.async('string')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>m[1]);
    for(const path of Object.keys(zip.files).filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p))){let xml=await zip.file(path).async('string');xml=xml.replace(/<c\b([^>]*\bt="s"[^>]*)>\s*<v>(\d+)<\/v>\s*<\/c>/g,(_,a,n)=>`<c${a.replace('t="s"','t="inlineStr"')}><is>${list[Number(n)]||'<t></t>'}</is></c>`);zip.file(path,xml);}zip.remove('xl/sharedStrings.xml');
    for(const p of ['xl/_rels/workbook.xml.rels','[Content_Types].xml']){let xml=await zip.file(p).async('string');xml=xml.replace(/<Relationship\b[^>]*Type="[^"]*\/sharedStrings"[^>]*\/>/g,'').replace(/<Override\b[^>]*PartName="\/xl\/sharedStrings.xml"[^>]*\/>/g,'');zip.file(p,xml);}
  }
  const records=snapshots.flatMap(s=>s.rows.map(u=>[serial(s.date),u.id_pic,u.nama_pic,u.jabatan,u.cabang,u.area,u.id_atasan,u.reportStatus,u.report?.status==='Dikirim'?'Sudah dikirim':'Belum dikirim',time(u.report?.submittedAt),u.report?.reviewer||'',time(u.report?.reviewedAt),u.report?.reviewNote||'']));
  const headers=['Tanggal','ID PIC','Nama PIC','Jabatan','Cabang','Area','ID atasan','Status','Keterangan pengiriman','Waktu kirim (WIB)','Pemeriksa','Waktu review (WIB)','Catatan review'];
  const dateStyles=templateDateStyles,headerStyles=styles(await zip.file('xl/worksheets/sheet1.xml').async('string'),19);
  zip.file('xl/worksheets/sheet8.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:M${records.length+1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="2" width="16" customWidth="1"/><col min="3" max="3" width="38" customWidth="1"/><col min="4" max="7" width="24" customWidth="1"/><col min="8" max="13" width="30" customWidth="1"/></cols><sheetData>${rowXML(1,headers,headerStyles)}${records.map((v,i)=>rowXML(i+2,v,{A:dateStyles.A,J:dateStyles.AA,L:dateStyles.AD})).join('')}</sheetData><autoFilter ref="A1:M${records.length+1}"/></worksheet>`);
  const relId='rIdSurabrajaStatus';
  zip.file('xl/workbook.xml',(await zip.file('xl/workbook.xml').async('string')).replace('</sheets>',`<sheet name="Status_Report" sheetId="8" r:id="${relId}"/></sheets>`));
  zip.file('xl/_rels/workbook.xml.rels',(await zip.file('xl/_rels/workbook.xml.rels').async('string')).replace('</Relationships>',`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet8.xml"/></Relationships>`));
  zip.file('[Content_Types].xml',(await zip.file('[Content_Types].xml').async('string')).replace('</Types>','<Override PartName="/xl/worksheets/sheet8.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'));
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
