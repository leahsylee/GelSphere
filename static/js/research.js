'use strict';

function setupGelSLAM() {
  const story = document.querySelector('.gelslam-story');
  const video = document.querySelector('#slam-video');
  const title = document.querySelector('#slam-step-title');
  const description = document.querySelector('#slam-step-description');
  const count = document.querySelector('#slam-count');
  const advance = document.querySelector('#slam-advance');
  const previous = document.querySelector('#slam-previous');
  const next = document.querySelector('#slam-next');
  const navigation = story.querySelector('.slam-navigation');
  const dots = [...navigation.querySelectorAll('.step-dots button')];
  const action = document.querySelector('#slam-action');
  const icon = document.querySelector('#slam-icon');
  const fallback = video.querySelector('source').src;
  const stages = [
    ['scan', 'Scan the surface', 'As GelSphere rolls, each tactile image captures a small area of contact. The red circles show overlapping touches along the scan path.'],
    ['match', 'Match surface features', 'Curvature maps reveal features shared by neighboring touches. SIFT finds corresponding points to estimate how one patch moves relative to the next.'],
    ['align', 'Align the patches', 'NormalFlow refines the alignment using surface normals. The patches are brought into a common coordinate frame so their overlapping geometry matches.'],
    ['fuse', 'Build the surface', 'Aligned patches are fused as the sensor continues rolling. Many local reconstructions form one continuous 3D surface, covering an area larger than a single touch.']
  ];
  const freeze = document.createElement('canvas');
  freeze.className = 'slam-freeze';
  freeze.hidden = true;
  freeze.setAttribute('aria-hidden', 'true');
  video.after(freeze);
  let selected = 0;
  let playing = false;
  let completed = false;
  let started = false;
  let autoPaused = false;
  let visible = false;
  let failed = false;
  let operation = 0;
  let frameCallback;
  let fallbackFrame;

  function cancelFrame() {
    if (frameCallback != null) video.cancelVideoFrameCallback(frameCallback);
    if (fallbackFrame) video.removeEventListener('timeupdate', fallbackFrame);
    frameCallback = fallbackFrame = null;
  }
  function holdFrame() {
    cancelFrame();
    if (!freeze.hidden || video.readyState < 2) return;
    try {
      freeze.width = video.videoWidth;
      freeze.height = video.videoHeight;
      freeze.getContext('2d').drawImage(video, 0, 0);
      freeze.hidden = false;
    } catch { /* The next clip's poster is the fallback on restricted origins. */ }
  }
  function releaseOnFrame(token) {
    const release = () => {
      if (token !== operation) return;
      freeze.hidden = true;
      cancelFrame();
    };
    if (video.requestVideoFrameCallback) frameCallback = video.requestVideoFrameCallback(release);
    else {
      fallbackFrame = () => { if (!video.seeking && video.readyState >= 2) release(); };
      video.addEventListener('timeupdate', fallbackFrame);
    }
  }
  function update() {
    story.dataset.step = String(selected);
    title.textContent = stages[selected][1];
    description.textContent = stages[selected][2];
    count.textContent = `0${selected + 1} / 04`;
    previous.disabled = selected === 0;
    next.disabled = selected === 3;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === selected);
      if (i === selected) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    const verb = matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
    action.textContent = playing ? `${verb} to pause` : completed ? selected === 3 ? 'Replay' : `${verb} to continue` : `${verb} to ${started ? 'resume' : 'play'}`;
    icon.textContent = playing ? 'Ⅱ' : completed ? selected === 3 ? '↻' : '→' : '▷';
    advance.dataset.state = completed && selected === 3 ? 'complete' : playing ? 'playing' : 'waiting';
    advance.setAttribute('aria-label', playing ? 'Pause GelSLAM animation' : completed ? selected === 3 ? 'Replay GelSLAM animation' : `Continue to ${stages[selected + 1][1].toLowerCase()}` : 'Play GelSLAM animation');
  }
  function load(index) {
    ++operation;
    holdFrame();
    video.pause();
    selected = index;
    playing = completed = started = autoPaused = false;
    video.src = `./static/videos/gelslam-${stages[index][0]}.mp4`;
    video.poster = `./static/images/research/gelslam-${stages[index][0]}-start.jpg`;
    video.load();
    update();
  }
  function play() {
    if (failed) return;
    const token = ++operation;
    cancelFrame();
    playing = started = true;
    autoPaused = false;
    releaseOnFrame(token);
    update();
    video.play().catch(() => {
      if (token !== operation) return;
      playing = false;
      update();
    });
  }
  function pause(automatic = false) {
    if (!playing) return;
    ++operation;
    holdFrame();
    video.pause();
    playing = false;
    autoPaused = automatic;
    update();
  }
  function select(index) {
    if (failed) return;
    load(Math.max(0, Math.min(3, index)));
    play();
  }
  function updateVisibility() {
    if (failed) return;
    if (!visible || document.hidden) pause(true);
    else if (!reducedMotion.matches && (!started || autoPaused)) play();
  }
  video.addEventListener('ended', () => {
    if (!playing || !video.ended) return;
    ++operation;
    holdFrame();
    playing = false;
    completed = true;
    autoPaused = false;
    update();
  });
  video.addEventListener('error', () => {
    if (failed) return;
    failed = true;
    ++operation;
    cancelFrame();
    freeze.hidden = advance.hidden = navigation.hidden = true;
    video.controls = true;
    video.src = fallback;
    video.load();
  });
  advance.addEventListener('click', () => {
    if (playing) pause();
    else if (completed) select((selected + 1) % 4);
    else play();
  });
  previous.addEventListener('click', () => select(selected - 1));
  next.addEventListener('click', () => select(selected + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => select(i)));
  story.addEventListener('keydown', event => {
    if (failed || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    select(event.key === 'Home' ? 0 : event.key === 'End' ? 3 : selected + (event.key === 'ArrowRight' ? 1 : -1));
    if (event.target.disabled) dots[selected].focus({ preventScroll: true });
  });
  video.controls = false;
  story.classList.add('is-interactive');
  navigation.hidden = advance.hidden = false;
  stages.forEach(([name]) => { const poster = new Image(); poster.src = `./static/images/research/gelslam-${name}-start.jpg`; });
  load(0);
  // The initial still remains useful when automatic motion is disabled.
  video.poster = './static/images/research/gelslam-scan-end.jpg';
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.3;
      updateVisibility();
    }, { threshold: [0, 0.3] }).observe(video);
  } else { visible = true; updateVisibility(); }
  document.addEventListener('visibilitychange', updateVisibility);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) pause();
    else updateVisibility();
  });
}

function setupExperiments() {
  const tabs = [...document.querySelectorAll('.experiment-tab')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const hex = document.querySelector('#hex-panel');
  const feather = document.querySelector('#feather-panel');
  const replay = document.querySelector('#hex-replay');
  const landmarks = document.querySelector('#feather-landmarks');
  let selected = 0;
  let landmarkTimer;
  let hexFrame;
  let landmarksChosen = false;
  const seen = new Set();

  function showLandmarks(show) {
    feather.classList.toggle('show-landmarks', show);
    landmarks.setAttribute('aria-pressed', String(show));
    landmarks.textContent = `${show ? 'Hide' : 'Show'} landmarks`;
  }
  function playHex() {
    cancelAnimationFrame(hexFrame);
    hex.classList.remove('is-playing');
    if (reducedMotion.matches) return;
    // Wait for one painted reset before starting the slide's staggered reveals.
    hexFrame = requestAnimationFrame(() => {
      hexFrame = requestAnimationFrame(() => {
        if (!hex.hidden) hex.classList.add('is-playing');
      });
    });
  }
  function enter(panel) {
    if (panel.hidden || seen.has(panel)) return;
    seen.add(panel);
    if (panel === hex) playHex();
    if (panel === feather && !landmarksChosen && !reducedMotion.matches) {
      landmarkTimer = setTimeout(() => {
        if (!feather.hidden && !landmarksChosen) showLandmarks(true);
      }, 1100);
    }
  }
  function select(index, focus = false) {
    selected = index;
    clearTimeout(landmarkTimer);
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('is-selected', active);
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    seen.delete(panels[index]);
    if (index === 1 && !landmarksChosen) showLandmarks(false);
    // IntersectionObserver starts animation only once the selected panel is in view.
    if (!('IntersectionObserver' in window)) enter(panels[index]);
  }
  document.querySelector('.experiment-tabs').setAttribute('role', 'tablist');
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].tabIndex = 0;
    tab.addEventListener('click', () => { if (selected !== i) select(i); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (selected + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      select(index, true);
    });
  });
  replay.hidden = landmarks.hidden = false;
  replay.addEventListener('click', playHex);
  landmarks.addEventListener('click', () => {
    clearTimeout(landmarkTimer);
    landmarksChosen = true;
    showLandmarks(!feather.classList.contains('show-landmarks'));
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    clearTimeout(landmarkTimer);
    cancelAnimationFrame(hexFrame);
    hex.classList.remove('is-playing');
  });
  select(0);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) enter(entry.target);
      });
    }, { threshold: [0, 0.25] });
    panels.forEach(panel => observer.observe(panel));
  }
}

setupGelSLAM();
setupExperiments();
