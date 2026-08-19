const APP_SELECTOR = '#app';
function mountCanonLibraryLink(){
  const nav=document.querySelector(`${APP_SELECTOR} .sidebar nav`);
  if(!nav || nav.querySelector('[data-canon-library-link]')) return;
  const link=document.createElement('a');
  link.href='./canon/';
  link.className='nav-button';
  link.dataset.canonLibraryLink='true';
  link.innerHTML='<span aria-hidden="true">⌬</span><span>Canon Library</span>';
  link.setAttribute('aria-label','Open bundled Canon Library');
  nav.append(link);
}
const observer=new MutationObserver(mountCanonLibraryLink);
const app=document.querySelector(APP_SELECTOR);
if(app){observer.observe(app,{childList:true,subtree:true});mountCanonLibraryLink();}
