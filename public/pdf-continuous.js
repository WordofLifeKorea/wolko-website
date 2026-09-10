/* Continuous PDF layout with a bounded canvas working set. */
window.WolkoPdfContinuous = class {
  constructor(surface, pdf, pdfjs, onPage, onReady, onCreate) {
    Object.assign(this, { surface, pdf, pdfjs, onPage, onReady, onCreate });
    this.entries = [];
    this.generation = 0;
    this.onScroll = () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => {
        this.updateCurrentPage();
        this.pump();
      });
    };
    surface.addEventListener('scroll', this.onScroll, { passive: true });
    this.stack = document.createElement('div');
    this.stack.className = 'pdf-page-stack';
    surface.replaceChildren(this.stack);
  }
  async init() {
    for (let number = 1; number <= this.pdf.numPages; number++) {
      const page = await this.pdf.getPage(number);
      if (this.dead) return;
      const shell = document.createElement('div');
      shell.className = 'viewer-surface-inner pdf-scroll-page';
      shell.dataset.pdfPage = number;
      shell.setAttribute('aria-label', 'PDF page ' + number);
      const canvas = document.createElement('canvas');
      const layer = document.createElement('div');
      layer.className = 'textLayer';
      const loading = document.createElement('span');
      loading.className = 'pdf-page-loading';
      loading.textContent = String(number);
      shell.append(canvas, layer, loading);
      this.stack.append(shell);
      this.entries.push({ page, shell, canvas, layer, loading, number });
      this.onCreate(shell, layer);
    }
  }
  async setScale(scale, pageNumber) {
    if (this.dead) return;
    if (scale !== this.scale) {
      const anchor = this.entries[pageNumber - 1];
      const oldTop = anchor?.shell.getBoundingClientRect().top;
      const rootTop = this.surface.getBoundingClientRect().top;
      const fraction = anchor && this.scale
        ? Math.max(0, (rootTop - oldTop) / anchor.viewport.height) : 0;
      this.generation++;
      this.task?.cancel();
      this.textTask?.cancel();
      this.scale = scale;
      for (const entry of this.entries) {
        entry.viewport = entry.page.getViewport({ scale });
        entry.shell.style.width = entry.viewport.width + 'px';
        entry.shell.style.height = entry.viewport.height + 'px';
        entry.canvas.style.width = entry.viewport.width + 'px';
        entry.canvas.style.height = entry.viewport.height + 'px';
        this.release(entry);
        entry.failed = false;
      }
      if (anchor) this.scrollToPage(pageNumber, fraction);
    }
    await this.pump();
  }
  scrollToPage(number, fraction = 0) {
    const entry = this.entries[number - 1];
    if (!entry?.viewport) return;
    const top = entry.shell.getBoundingClientRect().top - this.surface.getBoundingClientRect().top;
    this.surface.scrollTop += top - 16 + entry.viewport.height * fraction;
    this.onPage(number);
    this.pump();
  }
  updateCurrentPage() {
    if (this.dead || !this.scale) return;
    const root = this.surface.getBoundingClientRect();
    const probe = root.top + Math.min(100, this.surface.clientHeight * .2);
    let closest = this.entries[0], distance = Infinity;
    for (const entry of this.entries) {
      const rect = entry.shell.getBoundingClientRect();
      const next = probe < rect.top ? rect.top - probe : probe > rect.bottom ? probe - rect.bottom : 0;
      if (next < distance) { closest = entry; distance = next; }
    }
    if (closest) this.onPage(closest.number);
  }
  release(entry) {
    entry.canvas.width = entry.canvas.height = 0;
    entry.layer.replaceChildren();
    entry.shell.querySelectorAll('.highlight-box').forEach(el => el.remove());
    entry.loading.hidden = false;
    entry.rendered = false;
  }
  async pump() {
    if (this.dead || !this.scale) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try {
      do {
        this.again = false;
        const root = this.surface.getBoundingClientRect();
        const height = this.surface.clientHeight;
        const nearby = this.entries.filter(entry => {
          const rect = entry.shell.getBoundingClientRect();
          const near = rect.bottom >= root.top - height && rect.top <= root.bottom + height;
          if (!near && entry.rendered && !entry.shell.contains(document.activeElement)) this.release(entry);
          return near;
        }).sort((a, b) => Math.abs(a.shell.getBoundingClientRect().top - root.top) - Math.abs(b.shell.getBoundingClientRect().top - root.top));
        const generation = this.generation;
        for (const entry of nearby) {
          if (this.dead || generation !== this.generation) { this.again = true; break; }
          if (entry.rendered || entry.failed) continue;
          try {
            const { viewport, canvas, layer } = entry;
            // Bound pixel memory even at high zoom / Retina resolutions.
            const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (viewport.width * viewport.height)));
            canvas.width = Math.max(1, Math.round(viewport.width * dpr));
            canvas.height = Math.max(1, Math.round(viewport.height * dpr));
            this.task = entry.page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [dpr, 0, 0, dpr, 0, 0] });
            await this.task.promise;
            if (this.dead || generation !== this.generation) break;
            layer.style.setProperty('--total-scale-factor', String(viewport.scale));
            layer.style.setProperty('--scale-round-x', '1px');
            layer.style.setProperty('--scale-round-y', '1px');
            this.textTask = new this.pdfjs.TextLayer({ textContentSource: entry.page.streamTextContent(), container: layer, viewport });
            await this.textTask.render();
            if (this.dead || generation !== this.generation) break;
            entry.rendered = true;
            entry.loading.hidden = true;
            this.onReady(entry.shell, entry.number);
          } catch (error) {
            if (this.dead || generation !== this.generation) break;
            entry.failed = true;
            entry.loading.textContent = 'Page ' + entry.number + ': ' + error.message;
            console.error('PDF page render failed', error);
          } finally { this.task = null; this.textTask = null; }
        }
      } while (this.again && !this.dead);
    } finally { this.busy = false; }
  }
  destroy() {
    this.dead = true;
    this.generation++;
    this.task?.cancel();
    this.textTask?.cancel();
    cancelAnimationFrame(this.frame);
    this.surface.removeEventListener('scroll', this.onScroll);
    this.entries.forEach(entry => this.release(entry));
    this.pdf.destroy();
  }
};
