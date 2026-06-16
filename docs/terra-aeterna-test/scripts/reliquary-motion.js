(() => {
  const page = document.documentElement;
  const buttons = [...document.querySelectorAll('[data-section-target]')];
  const cards = [...document.querySelectorAll('[data-node]')];

  function chooseSection(name) {
    page.dataset.section = name;
    buttons.forEach((button) => {
      const active = button.dataset.sectionTarget === name;
      button.classList.toggle('is-active', active);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => chooseSection(button.dataset.sectionTarget));
  });

  cards.forEach((card) => {
    card.addEventListener('pointerenter', () => card.classList.add('is-focused'));
    card.addEventListener('pointerleave', () => card.classList.remove('is-focused'));
  });

  chooseSection(page.dataset.section || 'tales');
})();
