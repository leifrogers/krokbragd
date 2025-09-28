let warpColor;
let weftColors = []; // Array for the three weft colors
let cellSize; // Size of each cell in the weaving
let gridWidth, gridHeight; // Dimensions of the weaving grid
let pattern = []; // Stores the weaving pattern
let currentRow = 0; // Currently selected row for editing
let weftPattern = []; // Stores which weft (0,1,2) is used for each row/col

// Add this new array to track the color pickers
let rowColorPickers = [];
let paletteColors = []; // Array for the color palette
let rowShiftButtons = []; // Array to track shift buttons for each row
let workingColor;  // The currently selected working color
let colorChangeTimeout = null;
let workingColors = []; // Array to store working colors
let uiComponents = {}; // Store all UI components
let isDarkMode = false; // Dark mode toggle
let zoomLevel = 1.0; // Zoom level for the pattern
let isGridVisible = true; // Grid visibility toggle

// Add missing offset variables for pattern positioning
let offsetX = 0; // Pattern offset X for panning
let offsetY = 0; // Pattern offset Y for panning

// Add these variables for drag functionality
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Add these global variables for pattern management
let undoStack = [];
let redoStack = [];
let maxUndoSteps = 50;

let allPalettes = []; // Store all loaded palettes
let currentPaletteIndex = 0; // Index of the currently selected palette
let currentPalette = null; // Currently selected palette object
let storageManager;

// Pattern statistics for enhanced data structure
let patternStats = {
  totalShuttle: 0,
  colorChanges: 0,
  complexity: 0,
  estimatedWarp: 0,
  estimatedWeft: 0
};

// Replace inefficient color history with Set-based approach
class ColorManager {
  constructor() {
    this.colorCache = new Map();
    this.colorHistory = [];
  }

  getHex(color) {
    const key = `${color.levels[0]}-${color.levels[1]}-${color.levels[2]}`;
    if (!this.colorCache.has(key)) {
      this.colorCache.set(key, '#' + hex(color.levels[0], 2) + hex(color.levels[1], 2) + hex(color.levels[2], 2));
    }
    return this.colorCache.get(key);
  }

  rgbToHex(r, g, b) {
    // Convert RGB values to hex string
    const toHex = (value) => {
      const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  addToHistory(color) {
    const hexColor = typeof color === 'string' && color.startsWith('#') ?
      color : this.getHex(color);

    // Remove if already exists
    const index = this.colorHistory.indexOf(hexColor);
    if (index !== -1) {
      this.colorHistory.splice(index, 1);
    }

    this.colorHistory.unshift(hexColor);
    if (this.colorHistory.length > 10) {
      this.colorHistory.pop();
    }
  }
}

let ColorMan = new ColorManager();

function setup() {
  // Create canvas and place it in the container
  let canvas = createCanvas(780, 580);
  canvas.parent('canvas-container');

  // Initialize colors
  warpColor = color(240, 240, 240); // Light gray for warp
  weftColors = [
    color(200, 100, 100), // Reddish for weft 1
    color(100, 200, 100), // Greenish for weft 2
    color(100, 100, 200)  // Bluish for weft 3
  ];

  // Initialize palette with more professional weaving colors
  paletteColors = [
    color(200, 100, 100),  // Red
    color(100, 200, 100),  // Green
    color(100, 100, 200),  // Blue
    color(220, 180, 120),  // Tan
    color(180, 130, 80),   // Brown
    color(80, 60, 40),     // Dark Brown
    color(240, 240, 200),  // Cream
    color(80, 100, 120),   // Slate Blue
    color(120, 80, 100)    // Mauve
  ];

  // Initialize working color
  workingColor = color(200, 100, 100);

  // Setup grid
  cellSize = 20;
  gridWidth = 30;
  gridHeight = 20;

  // Initialize weft pattern
  for (let i = 0; i < gridHeight; i++) {
    weftPattern.push([[], [], []]);
    for (let j = 0; j < gridWidth; j++) {
      weftPattern[i][0].push(0);
      weftPattern[i][1].push(1);
      weftPattern[i][2].push(2);
    }
  }

  // Initialize the UI with the HTML elements
  initializeUIWithHTML();

  // Load palettes from the JSON file
  loadPalettesFromJSON();

  // Set up the drag tooltip
  let dragTip = setupDragTooltip();

  // Modify zoom functions to show tooltip when zoomed in
  let originalZoomIn = zoomIn;
  zoomIn = function () {
    originalZoomIn();
    if (zoomLevel > 1.0) {
      dragTip.style('opacity', '1');
      setTimeout(() => {
        dragTip.style('opacity', '0');
      }, 5000); // Hide after 5 seconds
    }
  };

}

// Add this after the setup function
function setupDragTooltip() {
  // Add a tooltip to inform users about drag capability
  let dragTip = createDiv('Tip: Ctrl/Cmd + click and drag OR middle-click and drag to move the pattern when zoomed in');
  dragTip.id('drag-tip');
  return dragTip;
}

// Initialize UI components object and set up references to HTML elements
function initializeUIWithHTML() {
  // Attach event listeners to existing HTML elements
  select('#new-project').mousePressed(newProject);
  select('#save-pattern').mousePressed(savePattern);
  select('#save-png').mousePressed(exportPattern);
  select('#export-pdf').mousePressed(exportPatternPDF);
  select('#import-pattern').mousePressed(importPattern);
  select('#undo').mousePressed(undoAction);
  select('#redo').mousePressed(redoAction);
  select('#zoom-in').mousePressed(zoomIn);
  select('#zoom-out').mousePressed(zoomOut);
  select('#reset-view').mousePressed(resetView);
  select('#help-button').mousePressed(showHelpModal);

  // Initialize help modal functionality
  setupHelpModal();

  // Pattern size inputs
  select('#pattern-width').input(() => {
    let newWidth = parseInt(select('#pattern-width').value());
    if (newWidth > 0 && newWidth <= 100) {
      resizePattern(newWidth, gridHeight);
    }
  });

  select('#pattern-height').input(() => {
    let newHeight = parseInt(select('#pattern-height').value());
    if (newHeight > 0 && newHeight <= 100) {
      resizePattern(gridWidth, newHeight);
    }
  });

  // Toggle handlers
  select('#grid-toggle').mousePressed(() => {
    let toggle = select('#grid-toggle');
    toggle.toggleClass('active');
    toggleGrid(toggle.hasClass('active'));
  });

  select('#dark-mode-toggle').mousePressed(() => {
    let toggle = select('#dark-mode-toggle');
    toggle.toggleClass('active');
    toggleDarkMode(toggle.hasClass('active'));
  });

  createWorkingColorControlInHTML();
  createRowColorPickers();
  setupWorkingColorsSection();
}

// Create working color control in HTML
function createWorkingColorControlInHTML() {
  let workingColorContainer = select('#working-color-container');
  workingColorContainer.html(''); // Clear existing content

  let controlWrapper = createDiv();
  controlWrapper.class('working-color-control');

  let workingColorPicker = createColorPicker(workingColor);

  // Add hex display
  let hexDisplay = createSpan(ColorMan.getHex(workingColor));

  workingColorPicker.input(() => {
    // Clear any existing timeout
    if (colorChangeTimeout) {
      clearTimeout(colorChangeTimeout);
    }
    workingColor = workingColorPicker.color();
    // Set a new timeout to add to history after a delay
    colorChangeTimeout = setTimeout(() => {
      // Add to color history only after delay
      hexDisplay.html(ColorMan.getHex(workingColor));
      ColorMan.addToHistory(workingColor);
      colorChangeTimeout = null;

      updateRecentColorSwatches();
    }, 500); // 500ms delay
  });

  controlWrapper.child(workingColorPicker);

  workingColorContainer.child(controlWrapper);

  uiComponents.workingColorControl = {
    container: controlWrapper,
    picker: workingColorPicker,
    hexDisplay: hexDisplay
  };
}

function draw() {
  background(isDarkMode ? color(30) : color(255));

  // Calculate canvas center position
  let canvasCenterX = width / 2;
  let canvasCenterY = height / 2;

  // Calculate grid dimensions
  let gridPixelWidth = gridWidth * cellSize * zoomLevel;
  let gridPixelHeight = gridHeight * cellSize * zoomLevel;

  // Draw weaving with applied zoom and centered
  push();
  // Position at center of canvas minus half grid size plus any drag offset
  translate(
    canvasCenterX - (gridPixelWidth / 2) + dragOffsetX,
    canvasCenterY - (gridPixelHeight / 2) + dragOffsetY
  );
  scale(zoomLevel);
  drawWeaving();
  pop();
}

function drawWeaving() {
  // Draw the weaving grid
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      let x = col * cellSize;
      let y = row * cellSize;

      // Get weft colors for this pattern row's three wefts
      let weft1Color = weftPattern[row][0][col];
      let weft2Color = weftPattern[row][1][col];
      let weft3Color = weftPattern[row][2][col];

      // Convert indices to colors if needed (for backward compatibility)
      weft1Color = typeof weft1Color === 'number' ? weftColors[weft1Color] : weft1Color;
      weft2Color = typeof weft2Color === 'number' ? weftColors[weft2Color] : weft2Color;
      weft3Color = typeof weft3Color === 'number' ? weftColors[weft3Color] : weft3Color;

      // Make sure we have valid p5.Color objects
      if (!weft1Color || !weft1Color.levels) weft1Color = color(200, 100, 100);
      if (!weft2Color || !weft2Color.levels) weft2Color = color(100, 200, 100);
      if (!weft3Color || !weft3Color.levels) weft3Color = color(100, 100, 200);

      // Fix the threading pattern calculation to use modulo 4
      let threadingPos = col % 4;
      let visibleColor;

      if (threadingPos === 0 || threadingPos === 4) {
        visibleColor = weft1Color;  // Weft 1 shows at positions 0 and 4
      } else if (threadingPos === 2) {
        visibleColor = weft2Color;  // Weft 2 shows at position 2
      } else {
        visibleColor = weft3Color;  // Weft 3 shows at positions 1 and 3
      }

      // Draw cell
      fill(visibleColor);

      if (!isGridVisible) {
        noStroke();
      }
      else {
        stroke(200);
        strokeWeight(0.5);
      }
      rect(x, y, cellSize, cellSize);
    }
  }
}

// Function to apply dark mode if enabled
function applyDarkModeIfEnabled() {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Toggle dark mode
function toggleDarkMode(isEnabled) {
  isDarkMode = isEnabled;
  applyDarkModeIfEnabled();
}

// Toggle grid visibility
function toggleGrid(isEnabled) {
  isGridVisible = isEnabled;
}

// Zoom functions
function zoomIn() {
  if (zoomLevel < 3.0) {
    zoomLevel += 0.1;
  }
}

function zoomOut() {
  if (zoomLevel > 0.5) {
    zoomLevel -= 0.1;
  }
}


// Update mousePressed to handle grid positioning and enable dragging when zoomed in
function mousePressed() {
  // First check if the click is on a DOM element to avoid handling it twice
  if (mouseIsPressed && document.activeElement !== document.body) {
    return; // Let HTML elements handle their own clicks
  }

  // Calculate canvas center position
  let canvasCenterX = width / 2;
  let canvasCenterY = height / 2;

  // Calculate grid dimensions and position
  let gridPixelWidth = gridWidth * cellSize * zoomLevel;
  let gridPixelHeight = gridHeight * cellSize * zoomLevel;
  let gridLeft = canvasCenterX - (gridPixelWidth / 2) + dragOffsetX;
  let gridTop = canvasCenterY - (gridPixelHeight / 2) + dragOffsetY;

  // Check if the click is inside the grid
  let isWithinGrid =
    mouseX >= gridLeft &&
    mouseX <= gridLeft + gridPixelWidth &&
    mouseY >= gridTop &&
    mouseY <= gridTop + gridPixelHeight;

  // Enable dragging with Ctrl/Cmd + left click OR middle mouse button (when zoomed in)
  if (zoomLevel > 1.0 && ((mouseButton === LEFT && (keyIsDown(CONTROL) || keyIsDown(91) || keyIsDown(93))) || mouseButton === CENTER)) {
    isDragging = true;
    dragStartX = mouseX;
    dragStartY = mouseY;
    return false; // Prevent default behavior
  }

  // Only process grid clicks if within the grid bounds
  if (isWithinGrid) {
    // Calculate grid cell coordinates
    let gridX = floor((mouseX - gridLeft) / (cellSize * zoomLevel));
    let gridY = floor((mouseY - gridTop) / (cellSize * zoomLevel));

    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      // Update current row display
      currentRow = gridY;

      // Get the threading position to determine which weft is visible
      let threadingPos = gridX % 4;
      let visibleWeftIndex;

      // Determine which weft is visible at this position
      if (threadingPos === 0 || threadingPos === 4) {
        visibleWeftIndex = 0;  // Weft 1 shows at positions 0 and 4
      } else if (threadingPos === 2) {
        visibleWeftIndex = 1;  // Weft 2 shows at position 2
      } else {
        visibleWeftIndex = 2;  // Weft 3 shows at positions 1 and 3
      }

      for (let x = 0; x < gridWidth; x++) {
        weftPattern[gridY][visibleWeftIndex][x] = workingColor;
      }

      // Update the color picker for this weft
      if (rowColorPickers[gridY] && rowColorPickers[gridY][visibleWeftIndex]) {
        let newColor = weftPattern[gridY][visibleWeftIndex][0];
        if (typeof newColor === 'number') {
          newColor = weftColors[newColor];
        }
        rowColorPickers[gridY][visibleWeftIndex].value(ColorMan.getHex(newColor));
      }

      // Save state for undo
      saveStateForUndo();
    }
  }
}

// Add mouseDragged function to handle dragging
function mouseDragged() {
  if (isDragging && zoomLevel > 1.0) {
    dragOffsetX += (mouseX - pmouseX);
    dragOffsetY += (mouseY - pmouseY);
    return false; // Prevent default behavior
  }
}

// Add mouseReleased function to stop dragging
function mouseReleased() {
  isDragging = false;
}

// Reset view function to return to original position and scale
function resetView() {
  zoomLevel = 1.0;
  dragOffsetX = 0;
  dragOffsetY = 0;
}

// Window resize handling
function windowResized() {
  // Recreate color pickers with new positions
  createRowColorPickers();
}

// Modify createRowColorPickers to add color pickers to the HTML container
function createRowColorPickers() {
  // Get the container for the row color pickers
  let rowPickersContainer = select('#row-color-pickers');
  if (!rowPickersContainer) return;

  // Clear existing content
  rowPickersContainer.html('');

  // Clear existing pickers if any
  for (let row of rowColorPickers) {
    if (row) {
      for (let picker of row) {
        if (picker) picker.remove();
      }
    }
  }
  rowColorPickers = [];

  // Clear existing shift buttons
  rowShiftButtons = [];

  // Create new pickers for each row
  for (let row = 0; row < gridHeight; row++) {
    let rowPickers = [];

    // Create a container for this row
    let rowContainer = createDiv();
    rowContainer.class('row-color-picker');
    rowContainer.parent(rowPickersContainer);

    // Add row number label
    let rowLabel = createDiv(`Row ${row + 1}:`);
    rowLabel.class('row-number');
    rowLabel.parent(rowContainer);

    // Create a container for the three weft pickers
    let weftPickersContainer = createDiv();
    weftPickersContainer.class('weft-pickers');
    weftPickersContainer.parent(rowContainer);

    // Get current weft colors for this row
    let weft1Color, weft2Color, weft3Color;

    // Initialize with default colors if this is the first setup
    if (weftPattern[row][0][0] === undefined) {
      weft1Color = weftColors[0];
      weft2Color = weftColors[1];
      weft3Color = weftColors[2];
    } else {
      // Get the stored colors or indices
      let index1 = weftPattern[row][0][0];
      let index2 = weftPattern[row][1][0];
      let index3 = weftPattern[row][2][0];

      // Convert indices to colors if needed
      weft1Color = typeof index1 === 'number' ? weftColors[index1] : index1;
      weft2Color = typeof index2 === 'number' ? weftColors[index2] : index2;
      weft3Color = typeof index3 === 'number' ? weftColors[index3] : index3;
    }

    // Create three color pickers for each row
    let rowWeftColors = [weft1Color, weft2Color, weft3Color];
    for (let i = 0; i < 3; i++) {
      // Create a container for each weft picker with its label
      let weftPickerContainer = createDiv();
      weftPickerContainer.class('weft-picker');
      weftPickerContainer.parent(weftPickersContainer);

      // Add label for this weft
      //let weftLabel = createDiv(weftLabels[i]);
      //weftLabel.class('weft-label');
      //weftLabel.style('font-size', '12px');
      //weftLabel.parent(weftPickerContainer);

      // Create color picker
      let picker = createColorPicker(rowWeftColors[i]);
      picker.parent(weftPickerContainer);
      picker.style('width', '30px');

      // Store the row and weft number for this picker
      picker.attribute('data-row', row);
      picker.attribute('data-weft', i);

      // Add event handler to update the weft pattern with the exact color
      picker.input(() => {
        // Get the row and weft this picker belongs to
        let pickerRow = parseInt(picker.attribute('data-row'));
        let pickerWeft = parseInt(picker.attribute('data-weft'));

        // Use the exact color chosen
        let chosenColor = picker.color();

        // Update this row's pattern for the specific weft
        for (let x = 0; x < gridWidth; x++) {
          weftPattern[pickerRow][pickerWeft][x] = chosenColor;
        }

        // Update working color immediately when color changes
        setWorkingColor(chosenColor);
      });

      rowPickers.push(picker);
    }

    // Add a shift button for this row
    let shiftBtn = createButton('<svg class=\"feather\"> <use href=\"libraries/feather-sprite.svg#refresh-ccw\" /></svg>');
    shiftBtn.class('row-button');
    shiftBtn.attribute('data-row', row);
    shiftBtn.mousePressed(shiftRowColors);
    shiftBtn.parent(rowContainer);
    rowShiftButtons.push(shiftBtn);

    rowColorPickers.push(rowPickers);
  }
}

// Add this new function to handle shifting colors
function shiftRowColors() {
  let row = parseInt(this.attribute('data-row'));

  // Get the current colors
  let weft1Color = weftPattern[row][0][0];
  let weft2Color = weftPattern[row][1][0];
  let weft3Color = weftPattern[row][2][0];

  // Convert indices to colors if needed
  weft1Color = typeof weft1Color === 'number' ? weftColors[weft1Color] : weft1Color;
  weft2Color = typeof weft2Color === 'number' ? weftColors[weft2Color] : weft2Color;
  weft3Color = typeof weft3Color === 'number' ? weftColors[weft3Color] : weft3Color;

  // Shift the colors in a cycle (1→2, 2→3, 3→1)

  // Apply shifted colors to the row
  for (let x = 0; x < gridWidth; x++) {
    weftPattern[row][0][x] = weft3Color;  // 3 moves to 1
    weftPattern[row][1][x] = weft1Color;  // 1 moves to 2
    weftPattern[row][2][x] = weft2Color;  // 2 moves to 3
  }

  // Update the color pickers
  if (rowColorPickers[row]) {
    if (rowColorPickers[row][0]) rowColorPickers[row][0].value(ColorMan.getHex(weft3Color));
    if (rowColorPickers[row][1]) rowColorPickers[row][1].value(ColorMan.getHex(weft1Color));
    if (rowColorPickers[row][2]) rowColorPickers[row][2].value(ColorMan.getHex(weft2Color));
  }
  // Save state for undo
  saveStateForUndo();
}

// Set up the working colors section
function setupWorkingColorsSection() {
  // Get references to containers
  let workingColorsContainer = select('#working-colors-container');
  let addColorButton = select('#add-working-color');
  let exportButton = select('#export-working-colors');

  if (!workingColorsContainer || !addColorButton || !exportButton) return;

  // Clear existing content
  workingColorsContainer.html('');

  // Add event listener to the add button
  addColorButton.mousePressed(() => {
    // Add the current working color to working colors
    addToWorkingColors(workingColor);
    updateWorkingColorsDisplay();
  });

  // Add event listener to the export button
  exportButton.mousePressed(() => {
    // Export the working colors as a palette
    exportWorkingColorsAsPalette();
  });

  // Initial update of the working colors display
  updateWorkingColorsDisplay();
}

// Add a color to the working colors array
function addToWorkingColors(newColor) {
  // Convert the color to hex for consistent comparison
  let hexColor = ColorMan.getHex(newColor);

  // Check if color is already in working colors
  for (let i = 0; i < workingColors.length; i++) {
    if (ColorMan.getHex(workingColors[i]) === hexColor) {
      // Color already exists, no need to add again
      return;
    }
  }

  // Add new color to working colors array
  workingColors.push(newColor);
}

// Update the working colors display
function updateWorkingColorsDisplay() {
  let workingColorsContainer = select('#working-colors-container');
  if (!workingColorsContainer) return;

  // Clear existing content
  workingColorsContainer.html('');

  // If there are no working colors, show a message
  if (workingColors.length === 0) {
    let emptyMessage = createP('Use the "Add Color" button to add the current working color.');
    emptyMessage.class('working-colors-empty-message');
    emptyMessage.parent(workingColorsContainer);
    return;
  }

  // Create a container for the working colors grid
  let colorsGrid = createDiv();
  colorsGrid.class('working-colors-grid');
  colorsGrid.parent(workingColorsContainer);

  // Add each working color as a swatch with controls
  for (let i = 0; i < workingColors.length; i++) {
    let c = workingColors[i];

    // Create a container for this color with its controls
    let colorContainer = createDiv();
    colorContainer.class('working-color-item');
    colorContainer.parent(colorsGrid);

    // Create the color swatch
    let swatch = createDiv();
    swatch.class('color-swatch');
    swatch.style('background-color', ColorMan.getHex(c));
    swatch.parent(colorContainer);
    swatch.mousePressed(() => {
      setWorkingColor(c);
    });

    // Container for buttons
    let buttonContainer = createDiv();
    buttonContainer.class('color-actions');
    buttonContainer.parent(colorContainer);

    // Remove button - removes this color from working colors
    let removeBtn = createButton('✕');
    removeBtn.class('color-action-button');
    removeBtn.attribute('title', 'Remove this color');
    removeBtn.parent(buttonContainer);
    removeBtn.mousePressed(() => {
      // Remove this color from the working colors array
      workingColors.splice(i, 1);

      // Update the display
      updateWorkingColorsDisplay();
    });
  }
}

// Pattern management functions
function newPattern() {
  // Save current state for undo
  saveStateForUndo();

  // Prompt for new pattern dimensions
  let newWidth = prompt('Enter pattern width (5-100):', gridWidth);
  let newHeight = prompt('Enter pattern height (5-100):', gridHeight);

  // Validate input
  newWidth = parseInt(newWidth);
  newHeight = parseInt(newHeight);

  if (isNaN(newWidth) || newWidth < 5 || newWidth > 100) newWidth = gridWidth;
  if (isNaN(newHeight) || newHeight < 5 || newHeight > 100) newHeight = gridHeight;

  // Reset pattern with new dimensions
  resizePattern(newWidth, newHeight);

  // Reset UI elements
  createRowColorPickers();

  // Reset undo/redo stacks
  undoStack = [];
  redoStack = [];
}

function savePattern() {
  try {
    // Serialize the weftPattern to arrays
    const serializedWeftPattern = weftPattern.map(row =>
      row.map(weftLayer =>
        weftLayer.map(cell => {
          if (typeof cell === 'object' && cell.levels) {
            // p5.js color object - convert to array
            return [red(cell), green(cell), blue(cell)];
          } else if (Array.isArray(cell)) {
            // Already an array
            return cell;
          } else {
            // Some other type - try to convert
            return [0, 0, 0]; // Default to black
          }
        })
      )
    );

    // Serialize palette colors to arrays
    const serializedPaletteColors = currentPalette && currentPalette.colors ?
      currentPalette.colors.map(c => {
        if (typeof c === 'object' && c.levels) {
          return [red(c), green(c), blue(c)];
        } else if (Array.isArray(c)) {
          return c;
        } else {
          return [0, 0, 0];
        }
      }) : [];

    // Generate simplified pattern data for Krokbragd weaving
    const patternData = {
      version: "2.0",
      metadata: {
        title: `Krokbragd_Pattern_${new Date().toISOString().slice(0, 10)}`,
        description: "",
        author: "Anonymous",
        created: new Date().toISOString(),
        category: "Krokbragd"
      },
      pattern: {
        weftPattern: serializedWeftPattern,
        gridWidth: gridWidth,
        gridHeight: gridHeight,
        currentPalette: currentPalette ? currentPalette.name : 'default',
        paletteColors: serializedPaletteColors,
        warpColor: [red(warpColor), green(warpColor), blue(warpColor)]
      },
      display: {
        zoomLevel: zoomLevel,
        offsetX: offsetX,
        offsetY: offsetY,
        cellSize: cellSize
      }
    };

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '');
    const filename = `krokbragd_pattern_${timestamp}.json`;

    // Convert to JSON and create blob
    const jsonString = JSON.stringify(patternData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link and trigger download
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Clean up object URL
    URL.revokeObjectURL(downloadUrl);

    console.log(`Pattern saved as: ${filename}`);

  } catch (error) {
    console.error('Error saving pattern:', error);
    alert('Failed to save pattern. Please try again.');
  }
}

function exportPattern() {
  try {
    // Simple PNG export using p5.js built-in function
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '');
    const filename = `krokbragd_pattern_${timestamp}`;

    saveCanvas(filename, 'png');
    console.log(`Pattern exported as: ${filename}.png`);

  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export pattern. Please try again.');
  }
}

function exportPatternPDF() {
  // use jsPDF to create a PDF export of the pattern, the row order, and the colors used
  const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });

  // Layout constants
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 10;
  const usableWidth = pageWidth - (2 * margin);

  // Section positions
  const patternStartY = 45;
  const maxPatternWidth = usableWidth;
  const maxPatternHeight = 150; // Reserve space for tables below
  const sectionGap = 10;

  // Add pattern title
  doc.setFontSize(16);
  doc.text('Krokbragd Pattern', margin, 15);

  // Add pattern metadata
  doc.setFontSize(12);
  doc.text(`Created: ${new Date().toISOString().slice(0, 10)}`, margin, 25);
  doc.text(`Grid Size: ${gridWidth} x ${gridHeight}`, margin, 35);

  // Calculate optimal cell size for pattern grid
  const baseCellSize = 5; // Base size in mm
  const requiredWidth = gridWidth * baseCellSize;
  const requiredHeight = gridHeight * baseCellSize;

  // Calculate scale factors to fit within available space
  const scaleX = Math.min(1, maxPatternWidth / requiredWidth);
  const scaleY = Math.min(1, maxPatternHeight / requiredHeight);
  const scale = Math.min(scaleX, scaleY); // Use smaller scale to maintain aspect ratio

  const cellSizeMM = baseCellSize * scale;
  const patternWidth = gridWidth * cellSizeMM;
  const patternHeight = gridHeight * cellSizeMM;

  // Center the pattern horizontally
  const patternStartX = margin + (usableWidth - patternWidth) / 2;

  // Add a simple representation of the pattern grid
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      let x = patternStartX + col * cellSizeMM;
      let y = patternStartY + row * cellSizeMM;

      // Get weft colors for this pattern row's three wefts
      let weft1Color = weftPattern[row][0][col];
      let weft2Color = weftPattern[row][1][col];
      let weft3Color = weftPattern[row][2][col];
      // Convert indices to colors if needed (for backward compatibility)
      weft1Color = typeof weft1Color === 'number' ? weftColors[weft1Color] : weft1Color;
      weft2Color = typeof weft2Color === 'number' ? weftColors[weft2Color] : weft2Color;
      weft3Color = typeof weft3Color === 'number' ? weftColors[weft3Color] : weft3Color;

      // Make sure we have valid p5.Color objects
      if (!weft1Color || !weft1Color.levels) weft1Color = color(200, 100, 100);
      if (!weft2Color || !weft2Color.levels) weft2Color = color(100, 200, 100);
      if (!weft3Color || !weft3Color.levels) weft3Color = color(100, 100, 200);

      // Fix the threading pattern calculation to use modulo 4
      let threadingPos = col % 4;
      let visibleColor;

      if (threadingPos === 0 || threadingPos === 4) {
        visibleColor = weft1Color;  // Weft 1 shows at positions 0 and 4
      } else if (threadingPos === 2) {
        visibleColor = weft2Color;  // Weft 2 shows at position 2
      } else {
        visibleColor = weft3Color;  // Weft 3 shows at positions 1 and 3
      }

      // Set fill color
      doc.setFillColor(red(visibleColor), green(visibleColor), blue(visibleColor));
      doc.rect(x, y, cellSizeMM, cellSizeMM, 'F');
    }
  }

  // get unique colors in weftpattern
  let uniqueColors = new Set();
  for (let row of weftPattern) {
    for (let layer of row) {
      for (let color of layer) {
        if (typeof color === 'object' && color.levels) {
          uniqueColors.add(ColorMan.getHex(color));
        } else if (Array.isArray(color)) {
          uniqueColors.add(ColorMan.rgbToHex(color[0], color[1], color[2]));
        }
      }
    }
  }
  uniqueColors = Array.from(uniqueColors);

  // produce a list of colors used in the pattern
  let colorsUsedText = 'Colors Used:\n';
  uniqueColors.forEach((hex, index) => {
    colorsUsedText += `Color ${index + 1}: ${hex}\n`;
  });

  // Create row order table with colors
  const tableStartY = patternStartY + patternHeight + sectionGap;
  doc.setFontSize(12);
  doc.text('Row Order Table:', margin, tableStartY);

  // Add table headers with better spacing
  const headerY = tableStartY + 10;
  doc.setFontSize(10);
  doc.text('Row', margin + 2, headerY);
  doc.text('Weft 1', margin + 32, headerY);
  doc.text('Weft 2', margin + 48, headerY);
  doc.text('Weft 3', margin + 64, headerY);

  // Draw header underline
  doc.line(margin, headerY + 2, margin + 80, headerY + 2);

  let currentY = headerY + 10; // Starting Y position for data rows
  const rowHeight = 8; // Height between rows
  const maxY = pageHeight - margin - 20; // Maximum Y position before new page

  for (let row = 0; row < gridHeight; row++) {
    // Check if we need a new page
    if (currentY > maxY) {
      doc.addPage();
      currentY = 20; // Reset Y position on new page

      // Add headers again on new page
      doc.setFontSize(10);
      doc.text('Row', margin + 2, currentY);
      doc.text('Weft 1', margin + 32, currentY);
      doc.text('Weft 2', margin + 48, currentY);
      doc.text('Weft 3', margin + 64, currentY);
      doc.line(margin, currentY + 2, margin + 80, currentY + 2);
      currentY += 10;
    }

    let weft1Color = weftPattern[row][0][0];
    let weft2Color = weftPattern[row][1][0];
    let weft3Color = weftPattern[row][2][0];

    // Convert indices to colors if needed
    weft1Color = typeof weft1Color === 'number' ? weftColors[weft1Color] : weft1Color;
    weft2Color = typeof weft2Color === 'number' ? weftColors[weft2Color] : weft2Color;
    weft3Color = typeof weft3Color === 'number' ? weftColors[weft3Color] : weft3Color;

    // Draw row number aligned with rectangles
    doc.setFontSize(10);
    doc.text(`${row + 1}`, margin + 2, currentY + 4);

    // Draw weft color rectangles with borders
    doc.setFillColor(red(weft1Color), green(weft1Color), blue(weft1Color));
    doc.rect(margin + 30, currentY, 7, 6, 'F');
    doc.setDrawColor(0, 0, 0); // Black border
    doc.rect(margin + 30, currentY, 7, 6, 'S');

    doc.setFillColor(red(weft2Color), green(weft2Color), blue(weft2Color));
    doc.rect(margin + 46, currentY, 7, 6, 'F');
    doc.rect(margin + 46, currentY, 7, 6, 'S');

    doc.setFillColor(red(weft3Color), green(weft3Color), blue(weft3Color));
    doc.rect(margin + 62, currentY, 7, 6, 'F');
    doc.rect(margin + 62, currentY, 7, 6, 'S');

    currentY += rowHeight;
  }

  // Add colors used section with proper spacing
  currentY += 15; // Add some space after the table
  if (currentY > maxY - 50) { // If not enough space for colors section
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.text(colorsUsedText, margin, currentY);


  // Save the PDF
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '');
  doc.save(`krokbragd_pattern_${timestamp}.pdf`);
}


function importPattern() {
  try {
    // Create a simple file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (!file) {
        console.log('No file selected');
        // Clean up the input element
        document.body.removeChild(fileInput);
        return;
      }


      const reader = new FileReader();
      reader.onload = function (e) {
        console.log('File read successfully, parsing JSON...'); // Debug log
        try {
          const patternData = JSON.parse(e.target.result);
          console.log('JSON parsed successfully:', patternData); // Debug log
          loadPatternFromData(patternData);
          console.log(`Pattern "${patternData.metadata?.title || 'Untitled'}" loaded successfully!`);
        } catch (error) {
          console.error('Error parsing pattern file:', error);
          alert('Failed to load pattern file. Please check the file format.');
        }
        // Clean up the input element after processing
        document.body.removeChild(fileInput);
      };

      reader.onerror = function () {
        console.error('Error reading file');
        alert('Failed to read pattern file.');
        // Clean up the input element on error
        document.body.removeChild(fileInput);
      };

      reader.readAsText(file);
    });

    // Trigger file dialog
    document.body.appendChild(fileInput);
    fileInput.click();
    // Don't remove the element immediately - let the change event handler clean it up

    // Add a timeout to clean up if no file is selected (user cancels)
    setTimeout(() => {
      if (document.body.contains(fileInput)) {
        console.log('Cleaning up file input after timeout (dialog likely cancelled)');
        document.body.removeChild(fileInput);
      }
    }, 30000); // 30 second timeout

  } catch (error) {
    console.error('Error setting up pattern import:', error);
    alert('Failed to set up pattern import.');
  }
}

function loadPatternFromData(data) {
  try {
    // Save current state for undo
    saveStateForUndo();

    // Handle different data structure versions
    let patternInfo, metadata;

    if (data.version === "2.0" && data.pattern) {
      // New enhanced format
      patternInfo = data.pattern;
      metadata = data.metadata;

      // Load dimensions
      gridWidth = patternInfo.gridWidth || 30;
      gridHeight = patternInfo.gridHeight || 20;
      // Don't call resizePattern here as it will overwrite the imported data

      // Load warp color
      if (patternInfo.warpColor) {
        warpColor = color(patternInfo.warpColor[0], patternInfo.warpColor[1], patternInfo.warpColor[2]);
      }

      // Load weft pattern
      if (patternInfo.weftPattern) {
        weftPattern = patternInfo.weftPattern;

        // Convert color arrays back to p5.js color objects
        for (let i = 0; i < weftPattern.length; i++) {
          for (let j = 0; j < weftPattern[i].length; j++) {
            for (let k = 0; k < weftPattern[i][j].length; k++) {
              let colorData = weftPattern[i][j][k];
              if (Array.isArray(colorData)) {
                weftPattern[i][j][k] = color(colorData[0], colorData[1], colorData[2]);
              }
            }
          }
        }
      }

      // Load palette
      if (patternInfo.currentPalette && patternInfo.paletteColors) {
        // Just use the saved palette colors directly
        paletteColors = patternInfo.paletteColors.map(c =>
          Array.isArray(c) ? color(c[0], c[1], c[2]) : c
        );
        // Set the current palette name if it exists (though we don't have a palettes array)
        currentPalette = { name: patternInfo.currentPalette, colors: paletteColors };
      } else if (patternInfo.paletteColors) {
        // Just load the palette colors without palette name
        paletteColors = patternInfo.paletteColors.map(c =>
          Array.isArray(c) ? color(c[0], c[1], c[2]) : c
        );
      }

      // Restore display settings if available
      if (data.display) {
        zoomLevel = data.display.zoomLevel || 1.0;
        offsetX = data.display.offsetX || 0;
        offsetY = data.display.offsetY || 0;
        cellSize = data.display.cellSize || 20;
      }

      // Update pattern statistics
      if (metadata) {
        patternStats.lastLoaded = new Date().toISOString();
        patternStats.loadCount++;
        patternStats.currentTitle = metadata.title;
      }

    } else {
      // Legacy format (version 1.0 or older)
      loadPatternFromJSON(data);
      return;
    }

    // Update UI
    createRowColorPickers();

    // Update dimension input fields
    let widthInput = select('#pattern-width');
    let heightInput = select('#pattern-height');
    if (widthInput) widthInput.value(gridWidth);
    if (heightInput) heightInput.value(gridHeight);

    redraw();

    // Additional debug: force a frame redraw
    requestAnimationFrame(() => {
      redraw();
    });

  } catch (error) {
    console.error('Error loading pattern data:', error);
    alert(`Failed to load pattern: ${error.message}`);
  }
}

function loadPatternFromJSON(data) {
  // Save current state for undo
  saveStateForUndo();

  // Check version compatibility
  if (!data.version) {
    alert('Warning: This pattern was created with an older version and may not load correctly.');
  }

  // Load dimensions and resize
  gridWidth = data.gridWidth || 30;
  gridHeight = data.gridHeight || 20;
  // Don't call resizePattern here as it will overwrite the imported data

  // Load warp color
  if (data.warpColor) {
    warpColor = color(data.warpColor[0], data.warpColor[1], data.warpColor[2]);
  }

  // Load weft pattern
  if (data.weftPattern) {
    weftPattern = data.weftPattern;

    // Convert color arrays back to p5.js color objects
    for (let i = 0; i < weftPattern.length; i++) {
      for (let j = 0; j < weftPattern[i].length; j++) {
        for (let k = 0; k < weftPattern[i][j].length; k++) {
          let colorData = weftPattern[i][j][k];
          if (Array.isArray(colorData)) {
            weftPattern[i][j][k] = color(colorData[0], colorData[1], colorData[2]);
          }
        }
      }
    }
  }

  // Load palette colors
  if (data.paletteColors) {
    paletteColors = data.paletteColors.map(c => color(c[0], c[1], c[2]));
  }

  // Update UI
  createRowColorPickers();

  // Update dimension input fields
  let widthInput = select('#pattern-width');
  let heightInput = select('#pattern-height');
  if (widthInput) widthInput.value(gridWidth);
  if (heightInput) heightInput.value(gridHeight);

  // Force screen redraw to show imported pattern
  redraw();
}

// Helper functions for pattern serialization
function serializePattern() {
  let serialized = [];

  for (let i = 0; i < gridHeight; i++) {
    let rowData = [[], [], []];

    for (let j = 0; j < 3; j++) {
      let color = weftPattern[i][j][0];
      if (typeof color !== 'number') {
        color = [red(color), green(color), blue(color)];
      }

      // Check if all cells in row use the same color
      let sameColor = true;
      for (let k = 1; k < gridWidth; k++) {
        let cellColor = weftPattern[i][j][k];
        if (typeof cellColor !== 'number') {
          cellColor = [red(cellColor), green(cellColor), blue(cellColor)];
        }

        if (!colorsEqual(color, cellColor)) {
          sameColor = false;
          break;
        }
      }

      if (sameColor) {
        // Store just one color for the entire row's weft
        rowData[j] = color;
      } else {
        // Store individual colors for each cell
        rowData[j] = [];
        for (let k = 0; k < gridWidth; k++) {
          let cellColor = weftPattern[i][j][k];
          if (typeof cellColor !== 'number') {
            cellColor = [red(cellColor), green(cellColor), blue(cellColor)];
          }
          rowData[j].push(cellColor);
        }
      }
    }

    serialized.push(rowData);
  }

  return serialized;
}

function deserializePattern(data) {
  // Clear current pattern
  weftPattern = [];

  // Recreate pattern from serialized data
  for (let i = 0; i < gridHeight; i++) {
    weftPattern.push([[], [], []]);

    if (i < data.length) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < gridWidth; k++) {
          let colorData;

          if (Array.isArray(data[i][j]) && Array.isArray(data[i][j][0])) {
            // Individual cell colors
            colorData = k < data[i][j].length ? data[i][j][k] : data[i][j][0];
          } else {
            // One color for the entire row
            colorData = data[i][j];
          }

          weftPattern[i][j].push(color(colorData[0], colorData[1], colorData[2]));
        }
      }
    } else {
      // Fill with default colors for any missing rows
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < gridWidth; k++) {
          weftPattern[i][j].push(weftColors[j]);
        }
      }
    }
  }
}

// Undo/Redo functionality
function saveStateForUndo() {
  // Create a deep copy of the current pattern state
  let currentState = {
    weftPattern: JSON.parse(JSON.stringify(serializePattern())),
    gridWidth: gridWidth,
    gridHeight: gridHeight
  };

  // Add to undo stack
  undoStack.push(currentState);

  // Keep stack at maximum size
  if (undoStack.length > maxUndoSteps) {
    undoStack.shift();
  }

  // Clear redo stack when a new action is performed
  redoStack = [];
}

function undoAction() {
  if (undoStack.length === 0) return;

  // Save current state to redo stack
  let currentState = {
    weftPattern: serializePattern(),
    gridWidth: gridWidth,
    gridHeight: gridHeight
  };

  redoStack.push(currentState);

  // Restore previous state
  let previousState = undoStack.pop();
  gridWidth = previousState.gridWidth;
  gridHeight = previousState.gridHeight;
  deserializePattern(previousState.weftPattern);

  // Update UI
  createRowColorPickers();
}

function redoAction() {
  if (redoStack.length === 0) return;

  // Save current state to undo stack
  let currentState = {
    weftPattern: serializePattern(),
    gridWidth: gridWidth,
    gridHeight: gridHeight
  };

  undoStack.push(currentState);

  // Restore redo state
  let redoState = redoStack.pop();
  gridWidth = redoState.gridWidth;
  gridHeight = redoState.gridHeight;
  deserializePattern(redoState.weftPattern);

  // Update UI
  createRowColorPickers();
}

// New Project - Clear current pattern and start fresh
function newProject() {
  try {
    // Save current state for undo
    saveStateForUndo();

    // Prompt for new project dimensions
    let newWidth = prompt('Enter pattern width (5-100):', gridWidth || 30);
    let newHeight = prompt('Enter pattern height (5-100):', gridHeight || 20);

    // Validate input
    newWidth = parseInt(newWidth);
    newHeight = parseInt(newHeight);

    if (isNaN(newWidth) || newWidth < 5 || newWidth > 100) newWidth = 30;
    if (isNaN(newHeight) || newHeight < 5 || newHeight > 100) newHeight = 20;

    // Set grid dimensions
    gridWidth = newWidth;
    gridHeight = newHeight;

    // Clear the pattern - initialize with all cells set to 0 (no color)
    weftPattern = [];
    for (let i = 0; i < gridHeight; i++) {
      weftPattern.push([[], [], []]);
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < gridWidth; k++) {
          weftPattern[i][j].push(0); // 0 means no color selected
        }
      }
    }

    // Reset colors to defaults
    warpColor = color(240, 240, 240); // Light gray for warp
    weftColors = [
      color(200, 100, 100), // Reddish for weft 1
      color(100, 200, 100), // Greenish for weft 2  
      color(100, 100, 200)  // Bluish for weft 3
    ];

    // Reset view settings
    zoomLevel = 1.0;
    offsetX = 0;
    offsetY = 0;
    cellSize = 20;

    // Reset palette to default
    currentPalette = null;

    // Update UI
    createRowColorPickers();

    // Update dimension input fields
    let widthInput = select('#pattern-width');
    let heightInput = select('#pattern-height');
    if (widthInput) widthInput.value(gridWidth);
    if (heightInput) heightInput.value(gridHeight);

    // Force screen redraw
    redraw();

    // Notify of pattern change
    if (typeof window.notifyPatternChange === 'function') {
      window.notifyPatternChange();
    }

  } catch (error) {
    console.error('Error creating new project:', error);
    alert('Failed to create new project. Please try again.');
  }
}

// Resize pattern
function resizePattern(newWidth, newHeight) {
  // Save current state for undo
  saveStateForUndo();

  // Temporary storage for current pattern
  let oldPattern = weftPattern;
  let oldWidth = gridWidth;
  let oldHeight = gridHeight;

  // Update dimensions
  gridWidth = newWidth;
  gridHeight = newHeight;

  // Create new pattern array
  weftPattern = [];

  // Fill new pattern, preserving existing data where possible
  for (let i = 0; i < gridHeight; i++) {
    weftPattern.push([[], [], []]);

    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < gridWidth; k++) {
        if (i < oldHeight && k < oldWidth && oldPattern[i] && oldPattern[i][j]) {
          // Copy existing color
          weftPattern[i][j].push(oldPattern[i][j][k]);
        } else {
          // Fill with default color
          weftPattern[i][j].push(weftColors[j]);
        }
      }
    }
  }

  // Update UI
  createRowColorPickers();

  // Update pattern size input fields in toolbar
  let widthInput = select('#pattern-width');
  let heightInput = select('#pattern-height');
  if (widthInput) widthInput.value(gridWidth);
  if (heightInput) heightInput.value(gridHeight);
}

// Helper to check if two colors are equal (within tolerance)
function colorsEqual(c1, c2) {
  if (Array.isArray(c1) && Array.isArray(c2)) {
    return Math.abs(c1[0] - c2[0]) < 2 &&
      Math.abs(c1[1] - c2[1]) < 2 &&
      Math.abs(c1[2] - c2[2]) < 2;
  }
  return false;
}

// Create a color category in the palette
function createColorCategory(parent, title, colors) {

  let paletteSwatches = select('.palette-swatches');
  for (let c of colors) {
    let swatch = createDiv();
    swatch.class('color-swatch');
    swatch.style('background-color', ColorMan.getHex(c));
    swatch.parent(paletteSwatches);

    // Add click handler
    swatch.mousePressed(() => {
      setWorkingColor(c);
    });
  }
}

// Update the recent colors display
function updateRecentColorSwatches() {
  let recentSwatches = select('#recent-colors-container');
  if (!recentSwatches) return;

  // Clear existing swatches
  recentSwatches.html('');

  // Add new swatches
  for (let c of ColorMan.colorHistory) {
    let swatch = createDiv();
    swatch.class('color-swatch');
    swatch.style('background-color', c);
    swatch.parent(recentSwatches);
    // Add click handler
    swatch.mouseReleased(() => {
      setWorkingColor(c);
    });
  }
}

// Load palettes from the JSON file and populate the palette selector
function loadPalettesFromJSON() {
  // Get the palette selector element
  let paletteSelect = select('#palette-select');
  if (!paletteSelect) return;

  // Clear existing options
  paletteSelect.html('');

  // Create default palettes in case the file can't be loaded
  let defaultPalettes = [{
    name: "Default Palette",
    colors: [
      [200, 100, 100],  // Red
      [100, 200, 100],  // Green
      [100, 100, 200],  // Blue
      [220, 180, 120],  // Tan
      [180, 130, 80],   // Brown
      [80, 60, 40],     // Dark Brown
      [240, 240, 200],  // Cream
      [80, 100, 120]    // Slate Blue
    ]
  }];

  // Helper function to setup palettes in the UI
  function setupPalettesInUI(palettes) {
    // Store all palettes globally so we can access them later
    allPalettes = palettes;

    // Add each palette as an option in the selector
    palettes.forEach((palette, index) => {
      paletteSelect.option(palette.name, index);
    });

    // Add event listener to handle palette selection
    paletteSelect.changed(() => {
      let selectedIndex = parseInt(paletteSelect.value());
      if (selectedIndex >= 0 && selectedIndex < palettes.length) {
        // Store the current palette index
        currentPaletteIndex = selectedIndex;

        // Convert RGB arrays to p5.Color objects
        let selectedPalette = palettes[selectedIndex];
        paletteColors = selectedPalette.colors.map(rgb => color(rgb[0], rgb[1], rgb[2]));
        // Update the color palette display
        updateColorPaletteDisplay(selectedPalette.name, selectedIndex);
      }
    });

    // Trigger the change event to load the first palette
    if (palettes.length > 0) {
      paletteSelect.value('0');
      paletteSelect.elt.dispatchEvent(new Event('change'));
    }
  }

  // Load the palettes.json file with error handling using fetch
  fetch('palettes.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Store the loaded palettes
      let loadedPalettes = data.palettes || defaultPalettes;
      // Setup UI with loaded palettes
      setupPalettesInUI(loadedPalettes);
    })
    .catch(error => {
      // Use default palettes instead
      setupPalettesInUI(defaultPalettes);
    });

  // Set up palette import/export buttons
  setupPaletteButtons();
}

// Update the display of the currently selected palette
function updateColorPaletteDisplay(paletteName, paletteIndex) {
  // Get the palette swatches container
  let paletteSwatches = select('#palette-swatches');
  if (!paletteSwatches) return;

  // Clear existing content
  paletteSwatches.html('');

  select('#send-to-working').mousePressed(() => {
    importPaletteToWorkingColors(paletteIndex);
  });
  // Create a color category for the selected palette
  createColorCategory(paletteSwatches, paletteName, paletteColors);
}

// Set up palette import/export buttons
function setupPaletteButtons() {
  // Import palette button
  let importBtn = select('#import-palette');
  if (importBtn) {
    importBtn.mousePressed(() => {
      // Create a file input element
      let fileInput = createFileInput((file) => {
        if (file.type === 'application' && file.subtype === 'json') {
          // Read and parse the JSON file
          let reader = new FileReader();
          reader.onload = (e) => {
            try {
              let data = JSON.parse(e.target.result);
              if (data.palettes && Array.isArray(data.palettes)) {
                // Store the imported palettes and update the UI
                updatePaletteSelectorWithData(data.palettes);
                alert('Palettes imported successfully!');
              } else {
                alert('Invalid palette format. File must contain a "palettes" array.');
              }
            } catch (err) {
              alert('Error parsing JSON file: ' + err.message);
            }
          };
          reader.readAsText(file.file);
        } else {
          alert('Please select a JSON file.');
        }
      });
      fileInput.attribute('accept', '.json');
      fileInput.elt.click(); // Trigger the file dialog
    });
  }

  // Export palette button
  let exportBtn = select('#export-palette');
  if (exportBtn) {
    exportBtn.mousePressed(() => {
      // Get the current palettes
      loadJSON('palettes.json', (data) => {
        // Convert to JSON string with nice formatting
        let jsonStr = JSON.stringify(data, null, 2);

        // Create a download link
        let blob = new Blob([jsonStr], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        let link = document.createElement('a');
        link.href = url;
        link.download = 'palettes.json';
        link.click();
      });
    });
  }
}

// Export the current working colors as a palette JSON file
function exportWorkingColorsAsPalette() {
  // Check if we have any working colors
  if (workingColors.length === 0) {
    alert('No working colors to export. Add some colors to your working colors first.');
    return;
  }

  // Prompt for palette name
  let paletteName = prompt('Enter a name for your palette:', 'My Working Colors');
  if (!paletteName) return; // User cancelled

  // Convert working colors to the format expected by the palette system [r,g,b]
  let colorArray = workingColors.map(c => [c.levels[0], c.levels[1], c.levels[2]]);

  // Create the palette object
  let newPalette = {
    name: paletteName,
    colors: colorArray
  };

  // Try to load existing palettes first
  loadJSON('palettes.json',
    // Success callback
    (data) => {
      // Add the new palette
      if (!data.palettes) {
        data.palettes = [];
      }
      data.palettes.push(newPalette);

      // Save the updated palettes array
      saveWorkingColorsToJSON(data);
    },
    // Error callback
    () => {
      // If file doesn't exist yet, create a new palettes object
      let data = {
        palettes: [newPalette]
      };
      saveWorkingColorsToJSON(data);
    }
  );
}

// Save the palettes data to a JSON file
function saveWorkingColorsToJSON(data) {
  // Convert to JSON string with nice formatting
  let jsonStr = JSON.stringify(data, null, 2);

  // Create a download link
  let blob = new Blob([jsonStr], { type: 'application/json' });
  let url = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.href = url;
  link.download = 'palettes.json';
  link.click();

  alert('Working colors exported as a palette! To use this palette, replace your existing palettes.json file with the downloaded file, or merge them manually.');
}

// Import a palette directly into working colors
function importPaletteToWorkingColors(paletteIndex) {
  // Check if we have valid palettes loaded
  if (!allPalettes || allPalettes.length === 0 || paletteIndex >= allPalettes.length) {
    alert('No valid palette selected.');
    return;
  }

  // Get the selected palette
  let selectedPalette = allPalettes[paletteIndex];

  // Clear current working colors
  workingColors = [];

  // Add each color from the palette to working colors
  for (let colorRGB of selectedPalette.colors) {
    let c = color(colorRGB[0], colorRGB[1], colorRGB[2]);
    addToWorkingColors(c);
  }

  // Update the working colors display
  updateWorkingColorsDisplay();

}

// Update the palette selector with new palette data
function updatePaletteSelectorWithData(palettes) {
  // Store all palettes globally
  allPalettes = palettes;
  // Get the palette selector element
  let paletteSelect = select('#palette-select');
  if (!paletteSelect) return;

  // Clear existing options
  paletteSelect.html('');

  // Add each palette as an option in the selector
  palettes.forEach((palette, index) => {
    paletteSelect.option(palette.name, index);

    // Convert RGB arrays to p5.Color objects for the selected palette
    // Update the UI to display ALL palettes
    paletteSelect.changed(() => {
      let selectedIndex = parseInt(paletteSelect.value());
      if (selectedIndex >= 0 && selectedIndex < palettes.length) {
        // Store the current palette index
        currentPaletteIndex = selectedIndex;

        // Convert RGB arrays to p5.Color objects
        let selectedPalette = palettes[selectedIndex];
        paletteColors = selectedPalette.colors.map(rgb => color(rgb[0], rgb[1], rgb[2]));
        // Update the color palette display
        updateColorPaletteDisplay(selectedPalette.name, selectedIndex);
      }
    });
    paletteSelect.elt.dispatchEvent(new Event('change'));


  });
}

// Add the new function to set the working color
function setWorkingColor(newColor) {
  workingColor = color(newColor);
  ColorMan.addToHistory(newColor);

  if (uiComponents.workingColorControl?.picker) {
    // test workingColor if hex string or p5.Color
    if (typeof workingColor === 'string') {
      uiComponents.workingColorControl.picker.value(workingColor);
    } else {
      uiComponents.workingColorControl.picker.value(ColorMan.getHex(workingColor));
    }
  }

  if (uiComponents.workingColorControl?.hexDisplay) {
    uiComponents.workingColorControl.hexDisplay.html(ColorMan.getHex(workingColor));
  }

  updateRecentColorSwatches();
}

// Helper functions for enhanced save/load system

function getUniqueColorsCount() {
  const colorSet = new Set();
  for (let i = 0; i < gridHeight; i++) {
    for (let j = 0; j < gridWidth; j++) {
      for (let k = 0; k < 3; k++) {
        colorSet.add(weftPattern[i][k][j]);
      }
    }
  }
  return colorSet.size;
}

// ========================================
// HELP MODAL FUNCTIONALITY
// ========================================

function setupHelpModal() {
  // Get modal elements
  const modal = document.getElementById('help-modal');
  const closeButton = document.getElementById('help-modal-close');
  const overlay = modal.querySelector('.modal-overlay');
  const tabs = modal.querySelectorAll('.help-tab');
  const panels = modal.querySelectorAll('.help-panel');

  // Close modal handlers
  closeButton.addEventListener('click', hideHelpModal);
  overlay.addEventListener('click', hideHelpModal);

  // Close modal on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      hideHelpModal();
    }
  });

  // Tab switching functionality
  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const targetPanelId = this.getAttribute('aria-controls');
      switchHelpTab(this, targetPanelId);
    });

    // Keyboard navigation for tabs
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });

  // Initialize first tab
  if (tabs.length > 0) {
    const firstTab = tabs[0];
    const firstPanelId = firstTab.getAttribute('aria-controls');
    switchHelpTab(firstTab, firstPanelId);
  }
}

function showHelpModal() {
  const modal = document.getElementById('help-modal');

  // Show modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  // Focus management
  const firstTab = modal.querySelector('.help-tab');
  if (firstTab) {
    firstTab.focus();
  }

  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';

  console.log('Help modal opened');
}

function hideHelpModal() {
  const modal = document.getElementById('help-modal');

  // Hide modal
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');

  // Restore body scroll
  document.body.style.overflow = '';

  // Return focus to help button
  const helpButton = document.getElementById('help-button');
  if (helpButton) {
    helpButton.focus();
  }

  console.log('Help modal closed');
}

function switchHelpTab(activeTab, targetPanelId) {
  const modal = document.getElementById('help-modal');
  const tabs = modal.querySelectorAll('.help-tab');
  const panels = modal.querySelectorAll('.help-panel');

  // Remove active state from all tabs and panels
  tabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });

  panels.forEach(panel => {
    panel.classList.remove('active');
  });

  // Add active state to clicked tab and corresponding panel
  activeTab.classList.add('active');
  activeTab.setAttribute('aria-selected', 'true');

  const targetPanel = document.getElementById(targetPanelId);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  console.log(`Switched to help tab: ${targetPanelId}`);
}
