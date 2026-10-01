'use strict';

// The rendered movie has an independent keyframe for every frame. Loading it
// into a Blob also keeps reverse scrubbing reliable on simple local servers.
function setupExplodedScroll(player) {
  const section = document.querySelector('#mechanism');
  const pin = section.querySelector('.mechanism-pin');
  const layer = section.querySelector('.explosion-layer');
  const video = document.querySelector('#exploded-video');
  const assembledVideo = document.querySelector('#sensor-animation');
  const labels = document.querySelector('#exploded-labels');
  const title = document.querySelector('#exploded-title');
  const rollingTitle = document.querySelector('#mechanism-title');
  const caption = section.querySelector('.sensor-caption');
  const control = document.querySelector('#sensor-control');
  const source = video.querySelector('source').src;
  const fps = 24;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let ready = false;
  let loading = false;
  let enabled = false;
  let progress = 0;
  let target = 0;
  let desiredFrame = 0;
  let finalFrame = 0;
  let animationFrame = 0;
  let lastTick = 0;

  function updateLabels() {
    const decoded = finalFrame ? video.currentTime * fps / finalFrame : 0;
    const opacity = smooth((Math.min(progress, decoded) - 0.82) / 0.18);
    section.style.setProperty('--exploded-label-opacity', String(opacity));
    labels.setAttribute('aria-hidden', String(opacity < 0.5));
  }

  function seekLatestFrame() {
    if (!ready || video.seeking || !enabled) return;
    const time = desiredFrame / fps;
    if (Math.abs(video.currentTime - time) < 0.5 / fps) return;
    video.currentTime = time;
  }

  function paint() {
    const reveal = smooth(progress / 0.1);
    section.style.setProperty('--explosion-opacity', String(reveal));
    section.style.setProperty('--mechanism-opacity', String(1 - smooth(progress / 0.2)));
    section.style.setProperty('--exploded-title-opacity', String(smooth((progress - 0.06) / 0.2)));
    section.style.setProperty('--exploded-center', `${66 - 16 * smooth(progress / 0.65)}%`);
    section.style.setProperty('--exploded-scale', String(1 + 0.2 * smooth(progress / 0.8)));
    section.dataset.explosionProgress = progress.toFixed(3);
    caption.inert = progress > 0.02;
    control.disabled = progress > 0.02;
    rollingTitle.setAttribute('aria-hidden', String(progress > 0.15));
    title.setAttribute('aria-hidden', String(progress <= 0.15));
    video.setAttribute('aria-hidden', String(progress <= 0.02));
    assembledVideo.setAttribute('aria-hidden', String(progress > 0.02));
    section.setAttribute('aria-labelledby', progress > 0.15 ? 'exploded-title' : 'mechanism-title');
    if (progress > 0.005) player.holdAssembled();
    desiredFrame = Math.round(progress * finalFrame);
    seekLatestFrame();
    updateLabels();
  }

  function tick(now) {
    animationFrame = 0;
    if (!enabled) return;
    const dt = lastTick ? Math.min(64, now - lastTick) : 16;
    lastTick = now;
    progress += (target - progress) * (1 - Math.exp(-dt / 85));
    if (Math.abs(target - progress) < 0.0005) progress = target;
    paint();
    if (progress !== target) animationFrame = requestAnimationFrame(tick);
    else lastTick = 0;
  }

  function update() {
    if (!enabled) return;
    const padding = parseFloat(getComputedStyle(section).paddingTop);
    const stickyTop = parseFloat(getComputedStyle(pin).top);
    const travel = stickyTop - section.getBoundingClientRect().top - padding;
    const distance = section.offsetHeight - padding - pin.offsetHeight;
    const dwell = Math.min(innerHeight * 0.18, distance * 0.15);
    target = clamp((travel - dwell) / Math.max(1, distance - 2 * dwell));
    if (progress !== target && !animationFrame) animationFrame = requestAnimationFrame(tick);
  }

  function enable() {
    if (!ready || reducedMotion.matches || enabled) return;
    enabled = true;
    layer.hidden = false;
    title.hidden = false;
    section.classList.add('has-explosion');
    document.body.classList.add('has-exploded-animation');
    paint();
    update();
  }

  function disable() {
    enabled = false;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastTick = 0;
    progress = target = 0;
    layer.hidden = true;
    title.hidden = true;
    section.classList.remove('has-explosion');
    document.body.classList.remove('has-exploded-animation');
    section.removeAttribute('style');
    caption.inert = false;
    control.disabled = false;
    rollingTitle.removeAttribute('aria-hidden');
    assembledVideo.removeAttribute('aria-hidden');
    section.setAttribute('aria-labelledby', 'mechanism-title');
  }

  async function load() {
    if (loading || ready || reducedMotion.matches) return;
    loading = true;
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error('Animation unavailable');
      video.src = URL.createObjectURL(await response.blob());
    } catch {
      // A file:// preview can still use normal media loading without fetch.
      video.src = source;
    }
    video.preload = 'auto';
    video.load();
  }

  video.addEventListener('loadeddata', () => {
    if (!Number.isFinite(video.duration)) return;
    finalFrame = Math.max(1, Math.round(video.duration * fps) - 1);
    ready = true;
    enable();
  });
  video.addEventListener('seeked', () => {
    updateLabels();
    seekLatestFrame();
  });
  video.addEventListener('error', disable);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) disable();
    else if (ready) enable();
    else load();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      load();
      observer.disconnect();
    }, { rootMargin: '1200px 0px' });
    observer.observe(section);
  } else load();
}

setupExplodedScroll(mechanismPlayer);
