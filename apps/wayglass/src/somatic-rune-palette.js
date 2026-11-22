import {SOMATIC_RUNES,SOMATIC_RUNE_REGISTRY_VERSION} from './somatic-rune-registry.js';
// A shipwide, owner-authored rune keyboard. It never executes a programme or sends a message.
export function installSomaticRunePalette({host=document.body}={}){
  const d=host.ownerDocument;
  const button=d.createElement('button');button.type='button';button.className='wg-rune-toggle';button.textContent='✧ Runes';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open Rowan’s Wyrdrune somatic rune keyboard');
  const panel=d.createElement('section');panel.className='wg-rune-panel';panel.hidden=true;panel.setAttribute('aria-label','Somatic Wyrdrune rune keyboard');
  const heading=d.createElement('header');const h=d.createElement('strong');h.textContent='Somatic Runes · '+SOMATIC_RUNE_REGISTRY_VERSION;const close=d.createElement('button');close.type='button';close.textContent='Close';heading.append(h,close);
  const status=d.createElement('p');status.setAttribute('role','status');status.textContent='Select a WTL editor before inserting; all 14 original contours are retained.';
  const grid=d.createElement('div');grid.className='wg-rune-grid';panel.append(heading,status,grid);
  let lastEditor=null;
  function editable(node){return node?.matches?.('textarea, input:not([type]), input[type="text"], input[type="search"], [contenteditable="true"]')?node:null;}
  function track(event){const target=editable(event.target);if(target&&target!==panel&& !panel.contains(target))lastEditor=target;}
  d.addEventListener('focusin',track,true);
  for(const rune of SOMATIC_RUNES){
    const b=d.createElement('button');b.type='button';b.className='wg-rune-key';b.title=rune.label;b.setAttribute('aria-label',rune.label+' rune');
    const svg=d.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',rune.viewBox);svg.setAttribute('aria-hidden','true');const path=d.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',rune.path);svg.append(path);
    const label=d.createElement('span');label.textContent=rune.label;b.append(svg,label);
    b.addEventListener('click',()=>{
      const token='@'+rune.id;
      const editor=lastEditor&&d.contains(lastEditor)?lastEditor:null;
      if(!editor){status.textContent='Rune '+token+' selected. Focus a WTL editor to insert it.';return;}
      if('setRangeText' in editor){const start=editor.selectionStart??editor.value.length,end=editor.selectionEnd??start;editor.setRangeText(token,start,end,'end');}
      else{editor.focus();const selection=d.getSelection();if(selection?.rangeCount){selection.deleteFromDocument();selection.getRangeAt(0).insertNode(d.createTextNode(token));}else editor.append(d.createTextNode(token));}
      editor.dispatchEvent(new Event('input',{bubbles:true}));editor.focus();status.textContent='Inserted '+token+' into your editor. No execution was triggered.';
    });grid.append(b);
  }
  const flip=open=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));};
  button.addEventListener('click',()=>flip(panel.hidden));close.addEventListener('click',()=>flip(false));
  d.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)flip(false);});
  host.append(button,panel);
  return()=>{d.removeEventListener('focusin',track,true);button.remove();panel.remove();};
}
