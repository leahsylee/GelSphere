# GelSphere

**GelSphere: An Omnidirectional Rolling Vision-Based Tactile Sensor for Online 3D Reconstruction and Normal Force Estimation**

IROS 2026

## Website

This is the project website for GelSphere. The original layout was adapted from the [Nerfies project page](https://github.com/nerfies/nerfies.github.io); the current page presents an interactive, media-led walkthrough of the sensor.

### Local Development

To preview the website locally:

```bash
# Using Python
python3 -m http.server 8080

# Or using Node.js (if npx is available)
npx serve
```

Then open http://localhost:8080 in your browser.

The stylesheet and script links in `index.html` include the first eight characters of each file's SHA-256 hash. Refresh those version values after editing the CSS or JavaScript so returning visitors receive the matching assets after deployment.

### GitHub Pages Deployment

To deploy as a GitHub Pages site:

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select the branch (e.g., `main`) and root folder
4. Save - the site will be available at `https://<username>.github.io/GelSphere/`

### Project Structure

```
├── index.html          # Main website and research narrative
├── source/            # Original decks, Blender models, figures, and raw footage
├── scripts/           # Media preparation and rendering utilities
├── static/
│   ├── css/            # Core and research-section stylesheets, plus legacy template assets
│   ├── js/             # Video interactions, navigation, scroll effects
│   ├── images/         # Figure images
│   ├── videos/         # Demo videos
│   └── gelsphere_paper.pdf  # Conference paper
```

## Citation

```bibtex
@inproceedings{gelsphere2026,
  title     = {GelSphere: An Omnidirectional Rolling Vision-Based Tactile Sensor for Online 3D Reconstruction and Normal Force Estimation},
  booktitle = {2026 IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS)},
  year      = {2026},
}
```

## License

This website is licensed under a [Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/). Template from [Nerfies](https://github.com/nerfies/nerfies.github.io).

## Page narrative and interactions

The page follows the sensor story: award finalist and paper → reconstruction overview → optical principle → mechanism → exploded view and cross-section → single-frame demonstrations → GelSLAM and continuous reconstruction → experiments → project video.

The design uses borderless media sized to desktop viewport height, scroll reveals, and a gently scaling overview video. The experiment selector keeps all three headline comparisons visible while showing one detailed experiment at a time. Without JavaScript, all experiment panels appear in the page flow. Reduced-motion preferences disable automatic playback and scroll effects; content and native video controls remain usable without JavaScript.

The sensing-principle animation plays once when it enters view, holds its final frame, and replays when its video surface is clicked. Scrolling away and returning does not restart a completed animation.

The mechanism uses four independently encoded clips with concise text overlays: optical core, magnetic suspension, ball bearings, and assembled sensor. Each clip ends naturally and holds its final frame, avoiding browser seeking between stages. Click or tap anywhere on the video to continue, pause/resume, or replay after the last segment. Arrows move back and forward; clickable dots jump directly to a stage and replay it. All controls support Enter/Space when focused. Playback pauses when the scene is out of view or the page is hidden. The full assembly video remains as the no-JavaScript fallback.

The overview, single-frame reconstruction, continuous reconstruction, and project videos autoplay muted while visible and pause offscreen. Native controls allow sound and manual playback; a manual pause is preserved when scrolling away and back. Completed non-looping videos wait for a manual replay.

## Preparing web media

Original research assets are preserved. Generated web assets live in `static/videos` and `static/images`. With `ffmpeg` on your PATH, rebuild them from the project root:

```bash
python3 scripts/prepare-media.py
```

The script uses these source assets:

- `source/animations/Trimmed Optics.mp4` and the GelSphere cross-section animation.
- The 24 fps cross-section animation is also trimmed into four `sensor-*.mp4` clips at source frames 24, 71, and 144 (1.00, 2.958, and 6.00 seconds). Magnetic suspension completes its settling motion and holds just before the gel pad contracts; ball bearings holds before the outer housing appears. Each boundary frame is shared by adjacent clips for a continuous transition; the assembled clip retains the original final frame. A canvas retains the last decoded frame until the next clip presents its first frame, avoiding flashes during source changes or restarts. Refresh the media version hashes in `index.js` when regenerating these clips or posters.
- `static/videos/live_reconstruction.mp4`: a 19-second excerpt from 9–28 seconds, cropped to the specular sensor and its raw image / reconstruction, becomes `overview-demo.mp4`.
- `source/videos/single-frame-screen-recording.mov`: retain 0.5–30.5 seconds and crop to a 2248 × 1008 region at (168, 92), removing outer margins and the recording UI at the end. The six panels remain together in `single-frame-demo.mp4`, exported at 1920 pixels wide / 30 fps with audio removed.
- `source/figures/exploded-view.png`, `source/figures/cross-section.png`, and the other research figures in `source/figures/`.

It also generates poster frames and optimizes the animation videos for progressive playback. Publish the web files and generated `static/` assets; the original large screen recording is not needed by the website. No build system or JavaScript packages are required.

### Exploded-view transition

The mechanism scene stays in view while scrolling opens the assembled sensor. Scrolling upward reverses the same movie. The mechanism caption fades out, the exploded-view title fades in, and SVG component labels appear near the final pose using the site's font. The original exploded figure remains available when reduced motion is enabled or the animation cannot load.

The controls explicitly invite clicking, and the completed assembly shows a highlighted restart action and a scroll cue. On desktop, continued scrolling holds the final exploded frame, moves the labeled model left, and fades in the cross-section on the right with a smaller subtitle. Scrolling upward reverses the comparison before reassembling the sensor. Smaller screens keep the cross-section below the exploded view, and reduced-motion or unavailable-video fallbacks retain the static figures. The same cross-section element moves between layouts, avoiding duplicate content and labels.

Render the 97-frame, 24 fps sequence from the original Blender scene, then encode it:

```bash
blender -b source/blender/GelSphere-exploded.blend --disable-autoexec \
  --python scripts/render-exploded.py -- --output /tmp/gelsphere-render
python3 scripts/encode-exploded.py /tmp/gelsphere-render
```

The renderer preserves the source file. It interpolates component parents from their assembled origins to their saved exploded transforms, and moves the camera into the figure's final orientation. Defaults are 1000 × 1000 pixels with 16 denoised Cycles samples using Metal; use `--device CPU` on other platforms. `--frames 0,48,96` renders endpoint/midpoint previews.

The encoder starts with the rolling video's exact final frame and dissolves into the Blender render over four frames. Every output frame is a keyframe so forward and reverse seeks stay responsive. The website fetches the small movie once into a Blob, queues only the newest requested frame, and pauses at the fully labeled view.

### Presentation-based reconstruction and experiments

`static/js/research.js` plays the original PowerPoint GelSLAM animation in four click-to-advance clips: scanning, feature matching, alignment, and fusion. The slides are rendered by PowerPoint itself, preserving their circular masks, geometry, grouping, and Morph transitions. Only the slide title/footer margins and an idle hold are removed. A frozen frame covers each source change until the next decoded frame is ready. Native video controls provide a complete fallback without JavaScript.

To reproduce the native animation:

```bash
python3 scripts/prepare-slam-deck.py /tmp/GelSLAM.pptx
```

Open that three-slide copy in Microsoft PowerPoint and export MP4, H.264, Full HD (1080p), using recorded timings and 5 seconds per slide. Save the export as `source/videos/gelslam-powerpoint-export.mp4`, then run:

```bash
python3 scripts/encode-slam.py
```

The encoder normalizes to 30 fps, crops to the shared diagram bounds, and exports overlapping frame ranges 0–83, 83–149, 149–220, and 360–573. The first stage includes the last red scan patch and holds before the tactile images appear at frame 84. The skipped alignment hold has an unchanged pose. The source presentation stays unchanged. On desktop the animation sits to the left of the stage explanation and navigation; smaller screens stack them vertically.

Experiments share an accessible three-tab selector. All headline metrics stay visible: hex normal dot product, feather distance MAE, and force MAE, each comparing specular and matte coatings. The hex panel reproduces slide 28’s staggered reveals using small raw/normal samples and large accuracy maps. Each accuracy map has its own coating caption and light labels: red above, green and blue along the bottom edge. The feather panel fades the supplied correspondence rings over the unmarked reference/specular/matte normal maps, with a show/hide control. The force panel autoplays the supplied `source/videos/force-estimation.mp4`, cropped to remove slide margins and baked-in titles; website text provides those labels. The annotated force rig identifies the force–torque sensor, interchangeable indenter, and GelSphere. Indenter radii are 1, 2, 4, 8, 16, 32, and 64 cm, plus a flat surface. Reduced-motion preferences disable automatic reveals/playback, and all controls remain available.

Rebuild these media with Pillow and ffmpeg installed:

```bash
python3 scripts/prepare-research.py
```

The original PowerPoint and full-resolution inputs are not website dependencies. Publish the optimized assets in `static/images/research/`, `static/videos/gelslam-*.mp4`, and `static/videos/force-comparison.mp4` with the page. Feather distance metrics retain the slide/paper values (1.07 / 1.25 mm); the correspondence image is used for its landmark annotations. The exploded view grows to 120% of its previous size on desktop as it opens, preserving the starting-pose handoff and reverse scroll.

Source file locations and naming are documented in [source/README.md](source/README.md). Research-section CSS and playback code are isolated in `static/css/research.css` and `static/js/research.js`.
