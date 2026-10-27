/**
 * Living Observer · Private library reference lens.
 *
 * Book metadata from connected accounts is NOT shipped with the public
 * Flameclyffe site. A Steward chooses a local JSON manifest to inspect.
 * No automatic Drive OAuth, no upload, storage, book-content export or LLM call.
 */
export const LIBRARY_SCHEMA='observer.local-research-library/v1';
const MAX_BOOKS=1200,MAX_BYTES=2_000_000;
const SUBJECTS=Object.freeze(['historical-ritual','numerology','geometry',
  'cosmology','qabalah','witchcraft','other']);
function verify(ok,text){if(!ok)throw new Error('Observer Library: '+text);}
function bounded(s,n=160){return typeof s==='string'&&s.length>0&&s.length<=n;}
function driveURL(input){
 if(!input)return null;
 verify(typeof input==='string'&&input.length<450,'invalid Drive source URL');
 const url=new URL(input);
 verify(url.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(url.hostname),
   'only original Google Drive file links are accepted');
 return url.href;
}
export function parseLibraryManifest(text){
 verify(typeof text==='string'&&text.length<=MAX_BYTES,'bounded JSON input required');
 const j=JSON.parse(text);
 verify(j?.schema===LIBRARY_SCHEMA&&Array.isArray(j.books)&&j.books.length<=MAX_BOOKS,
   'unsupported schema or book count');
 const books=j.books.map((book,i)=>{
   verify(book&&bounded(book.title,240),'invalid book title');
   const subject=book.subject??'other';
   verify(SUBJECTS.includes(subject),'unsupported research subject');
   verify(book.source_type==='drive-metadata' || book.source_type==='steward-curated',
     'book must declare its source');
   const id=book.source_id || ('local-book-'+i);
   verify(bounded(id,220),'source ID invalid');
   const note=book.note??'';
   verify(typeof note==='string'&&note.length<=600,'bounded note required');
   return Object.freeze({
     id,title:book.title,subject,
     author:typeof book.author==='string'?book.author.slice(0,160):'Not verified',
     source_type:book.source_type,
     source_url:driveURL(book.source_url),
     note,read_status:book.read_status==='reviewed-excerpt'?'reviewed-excerpt':'metadata-only',
     authority:'bibliographic reference / historical-symbolic lens, not astronomical measurement',
   });
 });
 verify(new Set(books.map(b=>b.id)).size===books.length,'source IDs must be distinct');
 return Object.freeze({schema:LIBRARY_SCHEMA,book_count:books.length,
   books:Object.freeze(books),private_context:true,
   export_policy:'none; local import only, no automatic upload',
   direct_content_access:false});
}
function init(){
 const input=document.getElementById('atlasLibraryFile');
 if(!input)return;
 const status=document.getElementById('atlasLibraryStatus');
 const list=document.getElementById('atlasLibraryResults');
 const filter=document.getElementById('atlasLibrarySubject');
 const search=document.getElementById('atlasLibrarySearch');
 let manifest=null;
 const draw=()=>{
   list.replaceChildren();
   if(!manifest)return;
   const term=search.value.trim().toLowerCase().slice(0,120);
   const records=manifest.books.filter(b=>(filter.value==='all'||b.subject===filter.value)&&
      (!term||(b.title+' '+b.author+' '+b.note).toLowerCase().includes(term)));
   status.textContent=manifest.book_count+' metadata records held locally · '+records.length+
     ' matching this lens. No book text or private Drive content was fetched.';
   for(const b of records.slice(0,80)){
     const item=document.createElement('article');
     item.className='atlas-library-entry';
     const h=document.createElement('strong');h.textContent=b.title;
     const meta=document.createElement('p');
     meta.textContent=b.subject+' · '+b.author+' · '+b.read_status+
        ' · '+b.source_type;
     item.append(h,meta);
     if(b.note){const n=document.createElement('p');n.textContent=b.note;item.append(n);}
     if(b.source_url){
       const a=document.createElement('a');a.href=b.source_url;
       a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open original in Google Drive';
       item.append(a);
     }
     list.append(item);
   }
   if(records.length>80){const extra=document.createElement('p');extra.textContent=
      'Showing first 80 matching records; refine your search.';list.append(extra);}
 };
 const load=async()=>{
   const file=input.files?.[0];
   if(!file)return;
   try{
     verify(file.size<=MAX_BYTES,'file is too large');
     const text=await file.text();
     manifest=parseLibraryManifest(text);
     draw();
   }catch(error){
     manifest=null;list.replaceChildren();
     status.textContent='Library import held: '+error.message;
   } finally{input.value='';}
 };
 input.addEventListener('change',()=>void load());
 filter.addEventListener('change',draw);
 search.addEventListener('input',draw);
 document.getElementById('atlasLibraryClear').addEventListener('click',()=>{
   manifest=null;list.replaceChildren();search.value='';
   status.textContent='Private research index cleared from this page. Nothing was stored.';
 });
}
if(typeof window!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
