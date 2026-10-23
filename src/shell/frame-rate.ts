/** Configure the page's requestAnimationFrame cadence indicator. This function is serialized into the main play page. */
export function configureFrameRateOverlay(enabled: boolean): void {
  const page = window as Window & {
    __ffFrameRateOverlay?: {
      node: HTMLDivElement;
      frame: number | null;
      samples: number[];
      lastRender: number;
      onVisibilityChange: () => void;
    };
  };
  const existing = page.__ffFrameRateOverlay;

  if (!enabled) {
    if (!existing) return;
    if (existing.frame !== null) window.cancelAnimationFrame(existing.frame);
    document.removeEventListener('visibilitychange', existing.onVisibilityChange);
    existing.node.remove();
    delete page.__ffFrameRateOverlay;
    return;
  }

  if (existing) return;

  const node = document.createElement('div');
  node.setAttribute('aria-hidden', 'true');
  node.style.cssText = [
    'position:fixed',
    'right:10px',
    'bottom:10px',
    'z-index:2147483647',
    'padding:5px 8px',
    'border:1px solid rgba(255,255,255,.8)',
    'border-radius:4px',
    'background:rgba(0,0,0,.88)',
    'color:#fff',
    'font:12px/1.35 system-ui,sans-serif',
    'text-shadow:0 1px 2px #000',
    'pointer-events:none',
    'white-space:nowrap',
  ].join(';');
  node.textContent = 'Page frame cadence · warming up…';
  document.body.appendChild(node);

  const state = {
    node,
    frame: null as number | null,
    samples: [] as number[],
    lastRender: Number.NEGATIVE_INFINITY,
    onVisibilityChange: () => {},
  };

  const schedule = () => {
    if (state.frame === null && !document.hidden) {
      state.frame = window.requestAnimationFrame(tick);
    }
  };

  const tick = (timestamp: number) => {
    state.frame = null;
    if (document.hidden) return;

    state.samples.push(timestamp);
    const cutoff = timestamp - 1000;
    while (state.samples.length > 1 && state.samples[1] < cutoff) state.samples.shift();
    if (state.samples.length > 600) state.samples.splice(0, state.samples.length - 600);

    if (timestamp - state.lastRender >= 250) {
      state.lastRender = timestamp;
      if (timestamp - state.samples[0] < 1000 || state.samples.length < 2) {
        node.textContent = 'Page frame cadence · warming up…';
      } else {
        const intervals: number[] = [];
        for (let index = 1; index < state.samples.length; index++) {
          const delta = state.samples[index] - state.samples[index - 1];
          if (delta > 0) intervals.push(delta);
        }
        const elapsed = state.samples[state.samples.length - 1] - state.samples[0];
        if (elapsed <= 0 || intervals.length === 0) {
          node.textContent = 'Page frame cadence · warming up…';
        } else {
          const mean = intervals.reduce((sum, delta) => sum + delta, 0) / intervals.length;
          intervals.sort((left, right) => left - right);
          const p95 = intervals[Math.ceil(intervals.length * 0.95) - 1];
          const fps = (intervals.length * 1000) / elapsed;
          node.textContent = `Page frame cadence · ${Math.round(fps)} FPS · mean ${mean.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms`;
        }
      }
    }
    schedule();
  };

  state.onVisibilityChange = () => {
    if (document.hidden) {
      if (state.frame !== null) window.cancelAnimationFrame(state.frame);
      state.frame = null;
      state.samples.length = 0;
      state.lastRender = Number.NEGATIVE_INFINITY;
      node.textContent = 'Page frame cadence · warming up…';
    } else {
      schedule();
    }
  };

  page.__ffFrameRateOverlay = state;
  document.addEventListener('visibilitychange', state.onVisibilityChange);
  schedule();
}
