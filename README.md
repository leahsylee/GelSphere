# GelSphere

**GelSphere: An Omnidirectional Rolling Vision-Based Tactile Sensor for Online 3D Reconstruction and Normal Force Estimation**

IROS 2026

## Website

This is the project website for GelSphere. The layout is adapted from the [Nerfies project page](https://github.com/nerfies/nerfies.github.io).

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
├── index.html          # Main website
├── static/
│   ├── css/            # Stylesheets (Bulma + custom)
│   ├── js/             # JavaScript (carousel, navbar)
│   ├── images/         # Figure images
│   ├── videos/         # Demo videos
│   └── paper.pdf       # Conference paper
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
