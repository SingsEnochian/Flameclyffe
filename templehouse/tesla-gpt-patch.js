(function addGptApparatus(){
  const select=document.getElementById('model-select');
  const badge=document.getElementById('model-badge');
  const note=document.getElementById('model-note');
  if(!select||!badge||!note||select.querySelector('option[value="gpt-5.5"]'))return;

  const option=document.createElement('option');
  option.value='gpt-5.5';
  option.textContent='GPT-5.5';
  select.insertBefore(option,select.firstChild);

  function renderGpt(){
    if(select.value==='gpt-5.5'){
      badge.textContent='OpenAI';
      note.textContent='GPT-5.5 via the Templehouse server route. The API key remains behind the observatory wall.';
    }
  }

  select.addEventListener('change',()=>queueMicrotask(renderGpt));

  if(!localStorage.getItem('tesla-study-model-v1')){
    select.value='gpt-5.5';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }

  renderGpt();
})();
