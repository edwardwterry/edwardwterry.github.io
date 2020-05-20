let rows = 20;
let cols = 50;
let grid_cell_size = 20; // pixels
let canvas;
let grid;
let raise_amount = 40;

function setup() {
  canvas = createVector(cols * grid_cell_size, rows * grid_cell_size);
  createCanvas(canvas.x, canvas.y);
  grid = create2DArray();
}

function create2DArray() {
  let grid = new Array(cols);
  // https://www.youtube.com/watch?v=OTNpiLUSiB4
  for (let c = 0; c < cols; ++c) {
    grid[c] = new Array(rows);
    for (let r = 0; r < rows; ++r) {
      grid[c][r] = 0;
    }
  }
  return grid;
}

function draw() {
  raiseGrid();
  decayGrid();
  noiseGrid();
  renderGrid();
}

function noiseGrid() {
  for (let c = 0; c < cols; ++c) {
    for (let r = 0; r < rows; ++r) {
      grid[c][r] += 3.0 * (random() * 2.0 - 1.0);
    }
  }
}

function renderGrid() {
  noStroke();
  for (let c = 0; c < cols; ++c) {
    for (let r = 0; r < rows; ++r) {
      fill(grid[c][r]);
      square(c * grid_cell_size, r * grid_cell_size, grid_cell_size);
    }
  }
}

function raiseGrid() {
  let point_ij = gridCellIndices(createVector(mouseX / canvas.x, mouseY / canvas.y));
  if (mouseIsPressed) {
    for (let c = 0; c < cols; ++c) {
      for (let r = 0; r < rows; ++r) {
        grid[c][r] += raise_amount * exp(-(pow(c - point_ij.x, 2) / 20 + pow(r - point_ij.y, 2) / 20));
      }
    }
  }
}

function decayGrid() {
  for (let c = 0; c < cols; ++c) {
    for (let r = 0; r < rows; ++r) {
      grid[c][r] -= exp(grid[c][r] * 0.01);
      grid[c][r] = max(0, grid[c][r]);
    }
  }
}

function gridCellIndices(point_uv) {
  let i = floor(point_uv.x * canvas.x / grid_cell_size);
  let j = floor(point_uv.y * canvas.y / grid_cell_size);
  return createVector(i, j);
}