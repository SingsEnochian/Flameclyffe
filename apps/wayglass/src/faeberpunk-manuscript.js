// FAEberpunk manuscript desk. Rich authoring is a local, separately owned
// document; it never changes a sent model turn or submits text without consent.
const KEY='wayglass:manuscript-local/v1';
const ALLOWED=new Set(['p','div','br','b','strong','i','em','u','ul','ol','li','h2','h3','blockquote']);
const DROP=new Set(['script','style','svg','iframe','object','embed','img','video','audio','form','input','link','meta']);
const LIMIT=180000;

export function sanitizedManuscriptFragment(html,doc=document){
  if(typeof html!=='string'||html.length>LIMIT)throw new TypeError('Invalid manuscript draft');
  const template=doc.createElement('template');template.innerHTML=html;
  function copy(node){
    if(node.nodeType===3)return doc.createTextNode(node.textContent||'');
    if(node.nodeType!==1)return doc.createDocumentFragment();
    const tag=node.tagName.toLowerCase();
    if(DROP.has(tag))return doc.createDocumentFragment();
    const out=ALLOWED.has(tag)?doc.createElement(tag):doc.createDocumentFragment();
    for(const child of node.childNodes)out.append(copy(child));
    return out;
  }
  const fragment=doc.createDocumentFragment();
  for(const node of template.content.childNodes)fragment.append(copy(node));
  return fragment;
}
function storageRead(store){
  try{
    const saved=JSON.parse(store?.getItem(KEY)||'null');
    return saved?.schema===KEY&&typeof saved.html==='string'&&saved.html.length<=LIMIT?saved.html:null;
  }catch{return null;}
}
export function mountFaepunkManuscript(root,{
  doc=globalThis.document,store=globalThis.localStorage,onStage=()=>{},feather=()=>false,
}={}){
  if(!root||!doc)throw new TypeError('Manuscript mount requires a document');
  let stopped=false;
  root.innerHTML=[
    '<details class="fae-manuscript" open>',
      '<summary><span class="fae-manuscript-mark" aria-hidden="true">✎</span> Manuscript · rich-text worktable ',
        '<span class="fae-manuscript-local">LOCAL / UNSENT</span></summary>',
      '<div class="fae-manuscript-inner">',
        '<div class="fae-manuscript-ribbon" role="toolbar" aria-label="Rich text formatting">',
          '<button type="button" class="glass-chip" data-manuscript-cmd="bold" aria-label="Bold selected text"><strong>B</strong></button>',
          '<button type="button" class="glass-chip" data-manuscript-cmd="italic" aria-label="Italic selected text"><em>I</em></button>',
          '<button type="button" class="glass-chip" data-manuscript-cmd="underline" aria-label="Underline selected text"><u>U</u></button>',
          '<button type="button" class="glass-chip" data-manuscript-cmd="insertUnorderedList" aria-label="Start bullet list">• List</button>',
          '<button type="button" class="glass-chip" data-manuscript-cmd="formatBlock" data-manuscript-value="h2" aria-label="Format as heading">H2</button>',
          '<button type="button" class="glass-chip" data-manuscript-cmd="formatBlock" data-manuscript-value="p" aria-label="Format as paragraph">¶</button>',
          '<button type="button" class="glass-chip" data-manuscript-stage>Place plain-text copy in chat composer</button>',
        '</div>',
        '<div class="fae-manuscript-page" data-manuscript-editor contenteditable="true" role="textbox" aria-multiline="true" aria-label="Rich-text manuscript" spellcheck="true" lang="en-GB" data-placeholder="Begin a manuscript in the living desk…"></div>',
        '<p class="fae-manuscript-status" data-manuscript-status role="status" aria-live="polite">A private, editable manuscript in this browser. Nothing is sent without your choice.</p>',
      '</div>',
    '</details>',
  ].join('');
  const editor=root.querySelector('[data-manuscript-editor]');
  const status=root.querySelector('[data-manuscript-status]');
  const saved=storageRead(store);
  if(saved){try{editor.replaceChildren(sanitizedManuscriptFragment(saved,doc));}
    catch{status.textContent='The saved manuscript was invalid; no unsafe content was restored.';}}
  const cleanups=[];
  const listen=(node,event,fn)=>{
    node.addEventListener(event,fn);cleanups.push(()=>node.removeEventListener(event,fn));
  };
  function save(){
    if(stopped)return;
    const holder=doc.createElement('div');
    holder.append(sanitizedManuscriptFragment(editor.innerHTML,doc));
    const html=holder.innerHTML;
    if(html.length>LIMIT){status.textContent='Manuscript exceeds local draft limit. Previous save retained.';return;}
    try{
      store?.setItem(KEY,JSON.stringify({schema:KEY,html}));
      status.textContent='Saved locally, rich text intact. Not sent to any provider.';
    }catch{status.textContent='Local save unavailable; draft stays on this screen.';}
  }
  listen(editor,'input',save);
  // Pasted provider HTML is discarded. Only the user-visible plain text enters.
  listen(editor,'paste',event=>{
    const plain=event.clipboardData?.getData('text/plain');
    if(typeof plain!=='string')return;
    event.preventDefault();
    const selection=doc.getSelection();
    if(!selection?.rangeCount)return;
    const range=selection.getRangeAt(0);range.deleteContents();
    const lines=plain.slice(0,LIMIT).split('\n');
    const fragment=doc.createDocumentFragment();
    for(const [i,line] of lines.entries()){
      if(i)fragment.append(doc.createElement('br'));
      fragment.append(doc.createTextNode(line));
    }
    const last=fragment.lastChild;
    range.insertNode(fragment);
    if(last){range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range);}
    save();
  });
  for(const button of root.querySelectorAll('[data-manuscript-cmd]')){
    listen(button,'click',()=>{
      if(stopped||feather())return;
      editor.focus();
      const cmd=button.dataset.manuscriptCmd;
      // Browser-native editing preserves its undo stack. Saved markup is
      // sanitised to an explicit, attribute-free textual allowlist.
      if(typeof doc.execCommand!=='function'||!doc.execCommand(cmd,false,button.dataset.manuscriptValue||null)){
        status.textContent='Rich formatting is unavailable in this browser. Your writing remains intact.';
      }else save();
    });
  }
  listen(root.querySelector('[data-manuscript-stage]'),'click',()=>{
    if(stopped||feather()){status.textContent='Feather held; draft not staged.';return;}
    const text=String(editor.innerText||editor.textContent||'').trim();
    if(!text){status.textContent='Write something before staging a copy.';return;}
    if(text.length>11000){status.textContent='Manuscript too long for chat composer; select a shorter passage.';return;}
    onStage(text);
    status.textContent='Plain-text copy placed in the composer for review. Rich manuscript remains saved here.';
  });
  return ()=>{save();stopped=true;cleanups.splice(0).forEach(fn=>fn());};
}
export const MANUSCRIPT_STORAGE_KEY=KEY;
