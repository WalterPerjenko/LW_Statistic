const notebookLink = document.querySelector('a[data-notebook]');
if (notebookLink && ['http:', 'https:'].includes(window.location.protocol)) {
  notebookLink.addEventListener('click', async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const download = document.createElement('a');
    let objectUrl;
    try {
      const response = await fetch(notebookLink.dataset.notebook);
      if (!response.ok || response.headers.get('Content-Type')?.includes('text/html')) {
        throw new Error('Notebook could not be loaded');
      }
      const bytes = await response.arrayBuffer();
      objectUrl = URL.createObjectURL(new Blob([bytes], {type: 'application/octet-stream'}));
      download.href = objectUrl;
      download.download = notebookLink.dataset.notebook;
    } catch {
      download.href = notebookLink.href;
      download.download = notebookLink.download;
    }

    document.body.append(download);
    download.click();
    download.remove();
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  });
}

const buttons = document.querySelectorAll('.tabs button');
buttons.forEach(button => {
  button.addEventListener('click', () => {
    buttons.forEach(item => {
      const active = item === button;
      item.setAttribute('aria-pressed', String(active));
      document.getElementById('panel' + item.dataset.id).hidden = !active;
    });
  });
});

const pairExplorer = document.querySelector('.pair-explorer');
if (pairExplorer) {
  const controls = pairExplorer.querySelector('.pair-controls');
  const pairLinks = Array.from(controls.querySelectorAll('a'));
  const panels = pairExplorer.querySelectorAll('.pair-panel');
  const defaultPair = '#pair-logs-mollogp';

  function selectPair() {
    const requested = window.location.hash;
    const activePair = pairLinks.some(link => link.hash === requested) ? requested : defaultPair;
    pairLinks.forEach(link => {
      if (link.hash === activePair) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    panels.forEach(panel => {
      panel.hidden = activePair !== '#pair-' + panel.dataset.correlationPair;
    });
  }

  window.addEventListener('hashchange', selectPair);
  selectPair();
  controls.hidden = false;
}

document.querySelectorAll('.generator-explorer').forEach(explorer => {
  const controls = explorer.querySelector('.chart-switch');
  const modes = controls.querySelectorAll('button');
  const series = explorer.querySelectorAll('[data-series]');
  const figureLink = explorer.querySelector('.figure-zoom');
  const image = figureLink.querySelector('img');
  const description = image.alt;

  modes.forEach(button => button.addEventListener('click', () => {
    const mode = button.dataset.generatorMode;
    const source = 'assets/generators-' + mode + '.png';
    figureLink.href = source;
    image.src = source;
    image.alt = description + '. ' + button.textContent;
    modes.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    series.forEach(item => {
      const name = item.dataset.series;
      item.hidden = mode !== 'both' && name !== 'holdout' && name !== mode;
    });
  }));
  controls.hidden = false;
});

const toc = document.querySelector('.report-toc');
if (toc) {
  const mobile = window.matchMedia('(max-width: 850px)');
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => ({
    link,
    heading: document.getElementById(link.hash.slice(1)),
  })).filter(item => item.heading);
  let activeLink;
  let scheduled = false;

  function updateCurrentSection() {
    scheduled = false;
    let current = targets[0];
    for (const item of targets) {
      if (item.heading.getBoundingClientRect().top > 120) break;
      current = item;
    }
    if (!current || current.link === activeLink) return;
    activeLink?.removeAttribute('aria-current');
    activeLink = current.link;
    activeLink.setAttribute('aria-current', 'location');
    if (!mobile.matches && toc.open) {
      const sidebar = toc.querySelector('.report-toc-links');
      const bounds = sidebar.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      if (linkBounds.top < bounds.top || linkBounds.bottom > bounds.bottom) {
        sidebar.scrollTop += linkBounds.top - bounds.top - 24;
      }
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateCurrentSection);
  }

  function syncToc() {
    toc.open = !mobile.matches;
    scheduleUpdate();
  }

  links.forEach(link => link.addEventListener('click', () => {
    if (mobile.matches) toc.open = false;
  }));
  document.querySelectorAll('a[href="#lab01-toc"]').forEach(link => {
    link.addEventListener('click', () => {
      toc.open = true;
      toc.querySelector('summary').focus({preventScroll: true});
      toc.scrollIntoView({block: 'nearest'});
    });
  });
  const tocTarget = toc.querySelector('summary');
  document.querySelectorAll('a[href="#оглавление"]').forEach(link => {
    link.addEventListener('click', () => {
      toc.open = true;
      tocTarget.focus({preventScroll: true});
    });
  });
  mobile.addEventListener('change', syncToc);
  window.addEventListener('scroll', scheduleUpdate, {passive: true});
  window.addEventListener('resize', scheduleUpdate);
  document.querySelectorAll('.report img').forEach(img => img.addEventListener('load', scheduleUpdate));
  syncToc();
}

const figures = document.querySelectorAll('.figure-zoom');
if (figures.length && typeof HTMLDialogElement !== 'undefined') {
  const dialog = document.createElement('dialog');
  dialog.className = 'figure-dialog';
  dialog.setAttribute('aria-labelledby', 'figure-dialog-title');
  dialog.innerHTML = '<div class="figure-dialog-bar"><strong id="figure-dialog-title"></strong>' +
    '<div class="figure-dialog-actions"><a class="figure-original" target="_blank" rel="noopener">Оригинал</a>' +
    '<form method="dialog"><button autofocus>Закрыть</button></form></div></div><img alt="">';
  const caption = dialog.querySelector('strong');
  const image = dialog.querySelector('img');
  const original = dialog.querySelector('.figure-original');
  let opener;
  document.body.append(dialog);

  figures.forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      caption.textContent = link.closest('figure').querySelector('figcaption span').textContent;
      image.alt = link.querySelector('img').alt;
      image.src = link.href;
      original.href = link.href;
      dialog.showModal();
    });
  });

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    opener?.focus({preventScroll: true});
  });
}
