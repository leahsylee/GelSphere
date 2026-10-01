'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setupNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('#nav-links');
  const setOpen = open => {
    toggle.setAttribute('aria-expanded', String(open));
    links.dataset.menuOpen = String(open);
  };
  toggle.hidden = false;
  setOpen(false);
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}

function setupAutoplay(video) {
  let visible = !('IntersectionObserver' in window);
  let userPaused = false;
  let automaticPauses = 0;
  function pauseAutomatically() {
    if (video.paused) return;
    ++automaticPauses;
    video.pause();
  }
  function update() {
    if (!visible || document.hidden || reducedMotion.matches) pauseAutomatically();
    else if (!userPaused && !video.ended && video.paused) video.play().catch(() => {});
  }
  video.addEventListener('pause', () => {
    if (automaticPauses) --automaticPauses;
    else if (!video.ended) userPaused = true;
  });
  video.addEventListener('play', () => {
    userPaused = false;
    if (!visible || document.hidden) pauseAutomatically();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.3;
      update();
    }, { threshold: [0, 0.3] }).observe(video);
  }
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);
}

// Both animations are operated directly on the visual. Native controls remain
// available without JS or if a media error prevents the enhancement from working.
function setupClickAnimation({ videoId, controlId, actionId, iconId, statusId, steps, rate }) {
  const video = document.getElementById(videoId);
  const control = document.getElementById(controlId);
  const action = document.getElementById(actionId);
  const icon = document.getElementById(iconId);
  const status = document.getElementById(statusId);
  const guided = steps.length > 1;
  const title = guided ? document.querySelector('#step-title') : null;
  const description = guided ? document.querySelector('#step-description') : null;
  const navigation = guided ? document.querySelector('.step-navigation') : null;
  const previous = guided ? document.querySelector('#previous-step') : null;
  const next = guided ? document.querySelector('#next-step') : null;
  const dots = guided ? [...document.querySelectorAll('.step-dots button')] : [];
  const completion = guided ? document.querySelector('#sensor-complete') : null;
  const verb = window.matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
  const freeze = guided ? document.createElement('canvas') : null;
  let frameCallback = null;
  let fallbackRelease = null;
  let decodedFrame = false;
  if (freeze) {
    freeze.className = 'sensor-freeze';
    freeze.hidden = true;
    freeze.setAttribute('aria-hidden', 'true');
    video.after(freeze);
    // Warm adjacent posters without decoding extra video players.
    steps.forEach(step => { const poster = new Image(); poster.src = step.poster; });
  }
  let selected = 0;
  let playing = false;
  let completed = false;
  let hasPlayed = false;
  let suspended = false;
  let visible = false;
  let failed = false;
  let operation = 0;
  function updateControl() {
    const last = selected === steps.length - 1;
    control.dataset.state = playing ? 'playing' : completed && last ? 'complete' : 'waiting';
    if (completion) completion.hidden = !(completed && last);
    if (playing) {
      action.textContent = `${verb} to pause`;
      icon.textContent = 'Ⅱ';
      control.setAttribute('aria-label', `Pause ${steps[selected].name} animation`);
    } else if (completed) {
      action.textContent = last ? (guided ? 'Restart animation' : `${verb} to replay`) : `${verb} to continue`;
      icon.textContent = last ? '↻' : '→';
      control.setAttribute('aria-label', last ? `${guided ? 'Restart sensor' : 'Replay sensing principle'} animation` : `Continue to ${steps[selected + 1].name}`);
    } else {
      action.textContent = `${verb} to ${hasPlayed ? 'resume' : 'play'}`;
      icon.textContent = '▷';
      control.setAttribute('aria-label', `${hasPlayed ? 'Resume' : 'Play'} ${steps[selected].name} animation`);
    }
  }
  function showStep() {
    if (!guided) return;
    video.dataset.stage = String(selected);
    title.textContent = steps[selected].title;
    description.textContent = steps[selected].description;
    dots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === selected);
      if (index === selected) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    previous.disabled = selected === 0;
    next.disabled = selected === steps.length - 1;
  }
  function finish() {
    // Ignore a queued end event if another clip has already started loading.
    if (!playing || !video.ended) return;
    ++operation;
    playing = false;
    completed = true;
    suspended = false;
    // Each clip holds its own final decoded frame. No seek at a stop point.
    status.textContent = guided && selected === steps.length - 1
      ? 'Assembly complete. Restart the animation or scroll to explore the exploded view.'
      : `${steps[selected].name}. Paused.`;
    updateControl();
  }
  function cancelFrameRelease() {
    if (frameCallback !== null) video.cancelVideoFrameCallback(frameCallback);
    frameCallback = null;
    if (fallbackRelease) video.removeEventListener('timeupdate', fallbackRelease);
    fallbackRelease = null;
  }
  function holdFrame() {
    cancelFrameRelease();
    if (!freeze || !freeze.hidden || !decodedFrame || video.readyState < 2) return;
    freeze.width = video.videoWidth;
    freeze.height = video.videoHeight;
    freeze.getContext('2d').drawImage(video, 0, 0);
    freeze.hidden = false;
  }
  function releaseOnFrame(currentOperation) {
    const release = () => {
      frameCallback = null;
      if (currentOperation !== operation) return;
      decodedFrame = true;
      if (freeze) freeze.hidden = true;
    };
    if ('requestVideoFrameCallback' in video) frameCallback = video.requestVideoFrameCallback(release);
    else {
      fallbackRelease = () => {
        if (video.readyState < 2 || video.seeking) return;
        video.removeEventListener('timeupdate', fallbackRelease);
        fallbackRelease = null;
        release();
      };
      video.addEventListener('timeupdate', fallbackRelease);
    }
  }
  function loadStep(index, preserveFrame = true) {
    if (!steps[index].src) return;
    if (preserveFrame) holdFrame();
    else { cancelFrameRelease(); if (freeze) freeze.hidden = true; }
    decodedFrame = false;
    video.poster = steps[index].poster;
    video.src = steps[index].src;
    video.load();
  }
  function play(index, resume = false) {
    const currentOperation = ++operation;
    playing = false;
    video.pause();
    const changed = selected !== index;
    selected = index;
    completed = false;
    suspended = false;
    showStep();
    if (changed) loadStep(index);
    else if (!resume) { holdFrame(); video.currentTime = 0; }
    video.playbackRate = rate;
    playing = true;
    hasPlayed = true;
    status.textContent = '';
    updateControl();
    cancelFrameRelease();
    releaseOnFrame(currentOperation);
    video.play().catch(() => {
      if (currentOperation !== operation) return;
      playing = false;
      status.textContent = 'Playback paused. Activate the video to try again.';
      updateControl();
    });
  }
  function pause(forVisibility = false) {
    if (!playing) return;
    if (video.ended) {
      finish();
      return;
    }
    ++operation;
    playing = false;
    suspended = forVisibility;
    video.pause();
    status.textContent = 'Paused.';
    updateControl();
  }
  function updateVisibility() {
    if (!visible || document.hidden) pause(true);
    else if (!failed && !reducedMotion.matches && (!hasPlayed || suspended) && !completed) {
      play(selected, suspended);
    }
  }

  control.addEventListener('click', () => {
    if (playing) pause();
    else if (completed) play((selected + 1) % steps.length);
    else play(selected, hasPlayed);
  });
  if (guided) {
    previous.addEventListener('click', () => play(selected - 1));
    next.addEventListener('click', () => play(selected + 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => play(index)));
    navigation.hidden = false;
  }
  video.addEventListener('ended', finish);
  video.addEventListener('error', () => {
    pause();
    cancelFrameRelease();
    if (freeze) freeze.hidden = true;
    failed = true;
    control.hidden = true;
    if (navigation) navigation.hidden = true;
    video.controls = true;
    status.textContent = 'Video unavailable.';
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.35;
      updateVisibility();
    }, { threshold: [0, 0.35] }).observe(control.parentElement);
  }
  document.addEventListener('visibilitychange', updateVisibility);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) pause();
  });
  video.loop = false;
  video.controls = false;
  control.hidden = false;
  loadStep(0);
  showStep();
  updateControl();
  return {
    holdAssembled() {
      if (!guided || (selected === steps.length - 1 && completed)) return;
      ++operation;
      playing = false;
      suspended = false;
      selected = steps.length - 1;
      completed = true;
      hasPlayed = true;
      video.pause();
      loadStep(selected, false);
      // A poster holds the exact final pose without seeking across the clip.
      video.poster = './static/images/sensor-assembled-end.jpg';
      status.textContent = '';
      showStep();
      updateControl();
    }
  };
}

function setupScrollEffects() {
  const reveals = [...document.querySelectorAll('.reveal')];
  const stage = document.querySelector('.scroll-stage');
  let observer;
  let scheduled = false;
  const wideScreen = window.matchMedia('(min-width: 761px)');

  function updateScale() {
    scheduled = false;
    if (reducedMotion.matches || !wideScreen.matches) {
      stage.style.removeProperty('--scene-scale');
      return;
    }
    const bounds = stage.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (60 - bounds.top) / Math.max(1, bounds.height - innerHeight + 60)));
    stage.style.setProperty('--scene-scale', String(0.94 + progress * 0.1));
  }
  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateScale);
    }
  }
  function revealAll() {
    observer?.disconnect();
    reveals.forEach(element => {
      element.classList.remove('reveal-pending');
      element.classList.add('is-visible');
    });
  }
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -45px 0px' });
    reveals.forEach(element => {
      if (element.getBoundingClientRect().top >= innerHeight) {
        element.classList.add('reveal-pending');
        observer.observe(element);
      }
    });
    // Keyboard navigation must never focus visually hidden content.
    document.addEventListener('focusin', event => {
      const reveal = event.target.closest('.reveal-pending');
      if (reveal) {
        reveal.classList.remove('reveal-pending');
        reveal.classList.add('is-visible');
        observer.unobserve(reveal);
      }
    });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) revealAll();
    schedule();
  });
  updateScale();
}

function setupCitation() {
  const button = document.querySelector('#copy-citation');
  const code = document.querySelector('#citation-text');
  const status = document.querySelector('#copy-status');
  if (!navigator.clipboard) return;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      status.textContent = 'Citation copied.';
      button.textContent = 'Copied';
    } catch {
      status.textContent = 'Select and copy the citation.';
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
}

setupNavigation();
document.querySelectorAll('[data-autoplay]').forEach(setupAutoplay);
setupClickAnimation({
  videoId: 'optics-video', controlId: 'optics-control', actionId: 'optics-action',
  iconId: 'optics-icon', statusId: 'optics-status', rate: 0.65,
  steps: [{ name: 'sensing principle' }]
});
const mechanismPlayer = setupClickAnimation({
  videoId: 'sensor-animation', controlId: 'sensor-control', actionId: 'sensor-action',
  iconId: 'sensor-icon', statusId: 'animation-status', rate: 0.75,
  steps: [
    { src: './static/videos/sensor-optical-core.mp4', poster: './static/images/sensor-optical-core.jpg', name: 'optical core', title: 'Optical core', description: 'A camera, RGB lighting, and battery inside the sensing sphere.' },
    { src: './static/videos/sensor-magnetic-suspension.mp4?v=8bf7e1f5', poster: './static/images/sensor-magnetic-suspension.jpg?v=47dd9833', name: 'magnetic suspension', title: 'Magnetic suspension', description: 'Coupling magnets stabilize the optical module while the gel shell rolls.' },
    { src: './static/videos/sensor-ball-bearings.mp4?v=fbe948fb', poster: './static/images/sensor-ball-bearings.jpg?v=eae4e905', name: 'ball bearings', title: 'Ball bearings', description: 'A layer of steel balls supports smooth rolling in any direction.' },
    { src: './static/videos/sensor-assembled.mp4', poster: './static/images/sensor-assembled.jpg', name: 'assembled sensor', title: 'Assembled sensor', description: 'Self-contained sensing with wireless tactile image streaming.' }
  ]
});
setupScrollEffects();
setupCitation();
