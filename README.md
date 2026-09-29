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

### GitHub Pages Deployment

To deploy as a GitHub Pages site:

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select the branch (e.g., `main`) and root folder
4. Save - the site will be available at `https://<username>.github.io/GelSphere/`

### Project Structure

```
├── index.html          # Main website and research narrative
├── static/
│   ├── css/            # Site stylesheet and legacy template assets
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

The page follows the sensor story: award nomination and paper → reconstruction overview → optical principle → mechanism → exploded view and cross-section → single-frame demonstrations → GelSLAM and continuous reconstruction → experiments → project video.

The design uses borderless media sized to desktop viewport height, scroll reveals, and a gently scaling overview video. All experiment figures are visible in the page flow. Reduced-motion preferences disable automatic playback and scroll effects; content and native video controls remain usable without JavaScript.

The sensing-principle animation plays once when it enters view, holds its final frame, and replays when its video surface is clicked. Scrolling away and returning does not restart a completed animation.

The mechanism uses four independently encoded clips with concise text overlays: optical core, magnetic suspension, ball bearings, and assembled sensor. Each clip ends naturally and holds its final frame, avoiding browser seeking between stages. Click or tap anywhere on the video to continue, pause/resume, or replay after the last segment. Arrows move back and forward; clickable dots jump directly to a stage and replay it. All controls support Enter/Space when focused. Playback pauses when the scene is out of view or the page is hidden. The full assembly video remains as the no-JavaScript fallback.

The overview, continuous reconstruction, and project videos autoplay muted while visible and pause offscreen. Native controls allow sound and manual playback; a manual pause is preserved when scrolling away and back. Completed non-looping videos wait for a manual replay.

## Preparing web media

Original research assets are preserved. Generated web assets live in `static/videos` and `static/images`. With `ffmpeg` on your PATH, rebuild them from the project root:

```bash
python3 scripts/prepare-media.py
```

The script uses these source assets:

- `Animations/Trimmed Optics.mp4` and the GelSphere cross-section animation.
- The 24 fps cross-section animation is also trimmed into four `sensor-*.mp4` clips at source frames 24, 72, and 144 (1.00, 3.00, and 6.00 seconds). Magnetic suspension holds before the gel pad closes; ball bearings holds before the outer housing appears. Each boundary frame is shared by adjacent clips for a continuous transition; the assembled clip retains the original final frame. Matching start-frame posters prevent a jump back to the optical core while the next clip loads.
- `static/videos/live_reconstruction.mp4`: a 19-second excerpt from 9–28 seconds, cropped to the specular sensor and its raw image / reconstruction, becomes `overview-demo.mp4`.
- The root `Screen Recording*.mov`: retain 0.5–30.5 seconds and crop to a 2248 × 1008 region at (168, 92), removing outer margins and the recording UI at the end. The six panels remain together in `single-frame-demo.mp4`, exported at 1920 pixels wide / 30 fps with audio removed.
- `Exploded_View.png`, `new_CrossSection.png`, and the updated research figures in `Figures/`.

It also generates poster frames and optimizes the animation videos for progressive playback. Publish the web files and generated `static/` assets; the original large screen recording is not needed by the website. No build system or JavaScript packages are required.
