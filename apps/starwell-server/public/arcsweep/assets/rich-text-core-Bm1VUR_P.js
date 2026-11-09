var e=`<!--arcsweep-richtext-v1-->`,t=new Set([`A`,`B`,`BLOCKQUOTE`,`BR`,`DIV`,`EM`,`H1`,`H2`,`H3`,`I`,`LI`,`OL`,`P`,`S`,`SPAN`,`STRONG`,`U`,`UL`]),n=Object.freeze([{label:`B`,title:`Bold (Ctrl/Cmd+B)`,command:`bold`,state:`bold`},{label:`I`,title:`Italic (Ctrl/Cmd+I)`,command:`italic`,state:`italic`},{label:`U`,title:`Underline (Ctrl/Cmd+U)`,command:`underline`,state:`underline`},{label:`Link`,title:`Link (Ctrl/Cmd+K)`,command:`link`},{separator:!0},{label:`H2`,title:`Heading`,command:`formatBlock`,value:`H2`},{label:`¶`,title:`Paragraph`,command:`formatBlock`,value:`P`},{label:`❝`,title:`Block quote`,command:`formatBlock`,value:`BLOCKQUOTE`},{separator:!0},{label:`• List`,title:`Bulleted list`,command:`insertUnorderedList`,state:`insertUnorderedList`},{label:`1. List`,title:`Numbered list`,command:`insertOrderedList`,state:`insertOrderedList`},{separator:!0},{label:`↶`,title:`Undo`,command:`undo`},{label:`↷`,title:`Redo`,command:`redo`}]);function r(t=``){return String(t).startsWith(e)}function i(t=``){return`${e}${String(t)}`}function a(e=``){let t=String(e);return r(t)?{format:`html`,html:t.slice(27)}:{format:`plain`,text:t}}function o(e=``){let t=String(e).trim();if(!t)return``;if(t.startsWith(`#`)||t.startsWith(`/`)||t.startsWith(`./`)||t.startsWith(`../`))return t;try{let e=new URL(t,window.location.href);return[`http:`,`https:`,`mailto:`,`tel:`].includes(e.protocol)?t:``}catch{return``}}function s(e=``){let n=document.createElement(`template`);n.innerHTML=String(e);let r=document.createTreeWalker(n.content,NodeFilter.SHOW_ELEMENT),i=[];for(;r.nextNode();)i.push(r.currentNode);for(let e of i)if(!t.has(e.tagName))e.replaceWith(...e.childNodes);else{for(let t of[...e.attributes])(e.tagName!==`A`||t.name.toLowerCase()!==`href`)&&e.removeAttribute(t.name);if(e.tagName===`A`){let t=o(e.getAttribute(`href`));t?e.setAttribute(`href`,t):e.removeAttribute(`href`)}}return n.innerHTML}function c(){return`#script-form textarea[name="content"],#record-form[data-room-id="records"] textarea[name="content"]`}function l(){return n.map(e=>{if(e.separator)return`<span class="richtext-separator" aria-hidden="true"></span>`;let t=e.value?` data-value="${e.value}"`:``,n=e.state?` data-state-command="${e.state}"`:``;return`<button type="button" class="richtext-tool" data-richtext-command="${e.command}"${t}${n} title="${e.title}" aria-label="${e.title}">${e.label}</button>`}).join(``)}function u(e){let t=e.closest(`label`);return t?[...t.childNodes].find(e=>e.nodeType===Node.TEXT_NODE&&e.textContent.trim())?.textContent.trim()||e.name||`Rich text editor`:e.name||`Rich text editor`}function d(e,t){let n=a(t.value);n.format===`html`?e.innerHTML=s(n.html):e.textContent=n.text}function f(e,t){t.value=i(s(e.innerHTML))}function p(e){let t=e.querySelector(`.arcsweep-richtext-editor`);t&&document.activeElement===t&&e.querySelectorAll(`[data-state-command]`).forEach(e=>{let t=!1;try{t=document.queryCommandState(e.dataset.stateCommand)}catch{}e.classList.toggle(`active`,!!t),e.setAttribute(`aria-pressed`,t?`true`:`false`)})}function m(e){let t=window.prompt(`Link address`);if(t===null)return;let n=o(t);n&&(e.focus(),document.execCommand(`createLink`,!1,n))}function h(e,t){let n=e.querySelector(`.arcsweep-richtext-editor`),r=e.previousElementSibling?.matches(`textarea`)?e.previousElementSibling:null;if(!n||!r)return;let i=t.dataset.richtextCommand;n.focus(),i===`link`?m(n):document.execCommand(i,!1,t.dataset.value||null),f(n,r),p(e)}function g(e,t){let n=t.clipboardData;if(!n)return;t.preventDefault();let r=n.getData(`text/html`),i=n.getData(`text/plain`);r?document.execCommand(`insertHTML`,!1,s(r)):document.execCommand(`insertText`,!1,i)}function _(e,t){if(!(t.ctrlKey||t.metaKey)||t.altKey)return!1;let n=t.key.toLowerCase(),r={b:`bold`,i:`italic`,u:`underline`};return r[n]?(t.preventDefault(),document.execCommand(r[n],!1,null),!0):n===`k`?(t.preventDefault(),m(e),!0):t.shiftKey&&n===`7`?(t.preventDefault(),document.execCommand(`insertOrderedList`,!1,null),!0):t.shiftKey&&n===`8`?(t.preventDefault(),document.execCommand(`insertUnorderedList`,!1,null),!0):!1}function v(e){if(e.dataset.richTextUpgraded===`true`)return;e.dataset.richTextUpgraded=`true`,e.dataset.richTextRequired=e.required?`true`:`false`,e.required=!1,e.classList.add(`richtext-source-field`);let t=document.createElement(`div`);t.className=`arcsweep-richtext-shell`,t.innerHTML=`
    <div class="arcsweep-richtext-toolbar" role="toolbar" aria-label="Text formatting">${l()}</div>
    <div class="arcsweep-richtext-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${u(e).replaceAll(`&`,`&amp;`).replaceAll(`"`,`&quot;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`)}" spellcheck="true"></div>
  `,e.insertAdjacentElement(`afterend`,t);let n=t.querySelector(`.arcsweep-richtext-editor`);d(n,e),f(n,e),t.querySelectorAll(`[data-richtext-command]`).forEach(e=>{e.addEventListener(`mousedown`,e=>e.preventDefault()),e.addEventListener(`click`,()=>h(t,e))}),n.addEventListener(`input`,()=>{n.classList.remove(`invalid`),f(n,e),p(t)}),n.addEventListener(`keydown`,r=>{_(n,r)&&(f(n,e),p(t))}),n.addEventListener(`paste`,t=>{g(n,t),f(n,e)}),n.addEventListener(`focus`,()=>p(t))}function y(e=document){e.querySelectorAll(c()).forEach(v)}function b(){if(document.querySelector(`#arcsweep-richtext-styles`))return;let e=document.createElement(`style`);e.id=`arcsweep-richtext-styles`,e.textContent=`
    .richtext-source-field {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0,0,0,0) !important;
      white-space: nowrap !important;
      border: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    .arcsweep-richtext-shell {
      display: grid;
      gap: .55rem;
      margin-top: .45rem;
      width: 100%;
    }
    .arcsweep-richtext-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .32rem;
      padding: .42rem;
      border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
      border-radius: .7rem;
      background: color-mix(in srgb, var(--panel-solid) 86%, transparent);
    }
    .richtext-tool {
      min-width: 2.25rem;
      min-height: 2.1rem;
      padding: .32rem .55rem;
      border-radius: .48rem;
      font: inherit;
      line-height: 1;
    }
    .richtext-tool[data-richtext-command="bold"] { font-weight: 800; }
    .richtext-tool[data-richtext-command="italic"] { font-style: italic; }
    .richtext-tool[data-richtext-command="underline"] { text-decoration: underline; }
    .richtext-tool.active {
      outline: 2px solid var(--gold);
      outline-offset: 1px;
    }
    .richtext-separator {
      width: 1px;
      align-self: stretch;
      min-height: 1.7rem;
      margin: 0 .12rem;
      background: color-mix(in srgb, var(--text) 22%, transparent);
    }
    .arcsweep-richtext-editor {
      box-sizing: border-box;
      width: 100%;
      min-height: 15rem;
      padding: .9rem 1rem;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      border: 1px solid color-mix(in srgb, var(--text) 22%, transparent);
      border-radius: .75rem;
      background: color-mix(in srgb, var(--bg) 72%, var(--panel-solid));
      color: var(--text);
      font: inherit;
      line-height: 1.65;
      outline: none;
    }
    #script-form .arcsweep-richtext-editor { min-height: 32rem; }
    .arcsweep-richtext-editor:focus {
      border-color: var(--gold);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 24%, transparent);
    }
    .arcsweep-richtext-editor.invalid {
      border-color: #d96c6c;
      box-shadow: 0 0 0 2px rgba(217,108,108,.2);
    }
    .arcsweep-richtext-editor h1,
    .arcsweep-richtext-editor h2,
    .arcsweep-richtext-editor h3 { margin: 1em 0 .45em; line-height: 1.2; }
    .arcsweep-richtext-editor p { margin: .7em 0; }
    .arcsweep-richtext-editor blockquote {
      margin: 1em 0;
      padding-left: 1rem;
      border-left: 3px solid var(--gold);
      opacity: .94;
    }
    .arcsweep-richtext-editor a { color: var(--green); text-decoration: underline; }
  `,document.head.append(e)}function x(){b(),y();let e=document.querySelector(`#app`);e&&new MutationObserver(()=>y(e)).observe(e,{childList:!0,subtree:!0}),document.addEventListener(`submit`,e=>{let t=e.target;if(!(t instanceof HTMLFormElement))return;let n=[...t.querySelectorAll(`.arcsweep-richtext-editor`)];for(let t of n){let n=t.closest(`.arcsweep-richtext-shell`),r=n?.previousElementSibling?.matches(`textarea`)?n.previousElementSibling:null;if(r&&(f(t,r),r.dataset.richTextRequired===`true`&&!t.textContent.trim())){e.preventDefault(),e.stopImmediatePropagation(),t.classList.add(`invalid`),t.focus();return}}},!0),document.addEventListener(`selectionchange`,()=>{let e=(document.activeElement?.closest?.(`.arcsweep-richtext-editor`))?.closest(`.arcsweep-richtext-shell`);e&&p(e)})}typeof document<`u`&&x();export{a as decodeRichTextPayload,i as encodeRichTextPayload,x as installRichTextCore,r as isRichTextPayload};