# Krokbragd Weaving Simulator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A browser-based studio for designing Krokbragd weaving drafts, exploring colorways, and exporting loom-ready patterns with a few clicks.

## Live Demo

A live demo is available at [leifrogers.github.io/loom/](https://leifrogers.github.io/krokbragd/).

![Screenshot of the Krokbragd Weaving Simulator interface](./Krokbragd%20Weaving%20Simulator.png)

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Built With](#built-with)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
  - [Designing the Draft](#designing-the-draft)
  - [Managing Colors](#managing-colors)
  - [Importing and Exporting](#importing-and-exporting)
- [Configuration](#configuration)
- [Accessibility Notes](#accessibility-notes)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)
- [License](#license)

## Overview
This project pairs p5.js rendering with a modern UI to help weavers visualize the classic Krokbragd structure before it reaches the loom. It ships with curated palettes, undo/redo support, and export pipelines for PNG, PDF, and structured JSON pattern files.

## Features
- Interactive weaving grid with zoom, pan, dark mode, and optional grid overlay.
- Row-based color pickers plus one-click row shifting for experimenting with weft orders.
- Working color library with recent color history, palette imports, and palette exports.
- Pattern management tools: new project sizing, undo/redo stack, JSON save/load, PNG snapshot, and fully annotated PDF export via jsPDF.
- Palette presets supplied from `palettes.json`, ready to extend with your own color stories.
- Keyboard-friendly toggles, focus-visible controls, and built-in high-contrast and reduced-motion support.

## Built With
* [p5.js](https://p5js.org/) - The core rendering library.
* [jsPDF](https://github.com/parallax/jsPDF) - For exporting patterns to PDF.
* [Feather Icons](https://feathericons.com/) - For the UI icons.

## Getting Started
> [!NOTE]
> The simulator is a static site and can be served by any local HTTP server. Browsers block some local file APIs when loaded via `file://`.

1. Clone the repository and switch into it.
2. Serve the site with your preferred static server.
3. Open the reported URL in a modern browser (Chrome, Edge, Safari, or Firefox).

```bash
npm install --global http-server
http-server -c-1 .
```

> [!TIP]
> If you prefer Python, run `python3 -m http.server 8080` from the project root instead.

## Usage Guide

### Designing the Draft
- Click any cell to flood the column with the active weft color that belongs in that threading position.
- Adjust pattern dimensions (5–100) from the toolbar to start new drafts or resize in-progress work.
- Use the zoom controls to focus on intricate areas, then hold <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> while dragging (or use the middle mouse button) to pan the canvas. Reset the view any time.

### Managing Colors
- Select the current working color with the picker at the top of the controls.
- Add frequently used swatches to **Working Colors** for quick recall, or remove them when you want to tidy the list.
- Recent colors appear automatically for convenient reuse.
- Load curated palettes from the dropdown, send shades into the working set, or extend them directly in `palettes.json`.
- Rotate a row’s color assignments with the shift button to explore rhythmic variations.

### Importing and Exporting
- **Save Pattern** downloads a JSON file that captures colors, grid size, and view state.
- **Import Pattern** restores any JSON produced by this tool (version 1.x or 2.x), including palettes and zoom settings.
- **Save PNG** takes a raster snapshot of the current draft.
- **Export PDF** creates an A4 report with the grid, row-by-row color table, and color legend using jsPDF.
- Undo and redo support up to 50 steps—perfect for quick comparisons without losing work.

## Configuration
Palette definitions live in [`palettes.json`](./palettes.json). Each palette is an object with a `name` and an array of RGB triplets. Add, remove, or reorder palettes to surface your preferred yarn lines. The UI automatically reflects changes on reload.

## Accessibility Notes
The interface was built with accessibility in mind: semantic landmarks, focus-visible styles, reduced-motion handling, and keyboard-operable toggles ship by default. However, manual testing is still required to ensure the experience meets your specific accessibility standards. Please run an auditing tool such as [Accessibility Insights](https://accessibilityinsights.io/) as part of your review.

## Contributing
Contributions are welcome! Please feel free to submit a pull request.

For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## Troubleshooting
> [!WARNING]
> Loading the site directly from the filesystem (`file://`) can block pattern import/export dialogs in some browsers.

- If export buttons appear unresponsive, confirm the browser allows pop-ups and downloads from your local server.
- When importing older patterns, the tool attempts automatic upgrades. If loading fails, inspect the console for format warnings.
- Large grids can impact rendering performance on low-power devices; reduce the width/height or disable the grid overlay to improve responsiveness.

## Resources
- [Krokbragd Weaving Overview (Norwegian Textile Letter)](https://norwegiantextileletter.com/2020/05/04/what-is-krokbragd/)
- [p5.js Reference](https://p5js.org/reference/)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.