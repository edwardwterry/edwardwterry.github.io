let socket;

let spacebar = false;
let target_canvas;
let u, v;
let myp5;

let bubbles;

var oscPort = new osc.WebSocketPort({
  url: "ws://localhost:3000", // URL to your Web Socket server. // TODO change from localhost?
  metadata: true,
});

oscPort.open();
$(document).ready(function () {
  // https://gist.github.com/wanbinkimoon/0771fea9b199ce5ac32edc8f6d815584
  const sketch = (p) => {
    let width = 150;
    let height = 75;

    let rows = 30;
    let cols = 60;
    let grid_cell_size = 5; // pixels
    let canvas;
    let grid;
    let raise_amount = 20;
    p.setup = () => {
      canvas = p.createVector(cols * grid_cell_size, rows * grid_cell_size);
      c = p.createCanvas(canvas.x, canvas.y);
      grid = create2DArray();
      // console.log(grid);

      // c = p.createCanvas(width, height);
      // c.background(200, 200, 200);
      // c.strokeWeight(1);
      // p.fill(0);
    };

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

    function noiseGrid() {
      for (let c = 0; c < cols; ++c) {
        for (let r = 0; r < rows; ++r) {
          grid[c][r] += 0.2 * (p.random() * 2.0 - 1.0);
        }
      }
    }

    function renderGrid() {
      p.noStroke();
      for (let c = 0; c < cols; ++c) {
        for (let r = 0; r < rows; ++r) {
          p.fill(30, 30, grid[c][r]);
          p.square(c * grid_cell_size, r * grid_cell_size, grid_cell_size);
        }
      }
    }

    function raiseGrid() {
      let point_ij = gridCellIndices(p.createVector(u, v));
      if (spacebar) {
        for (let c = 0; c < cols; ++c) {
          for (let r = 0; r < rows; ++r) {
            grid[c][r] +=
              raise_amount *
              p.exp(
                -10 *
                  (p.pow(c - point_ij.x, 2) / 20 +
                    p.pow(r - point_ij.y, 2) / 20)
              );
          }
        }
      }
    }

    function decayGrid() {
      for (let c = 0; c < cols; ++c) {
        for (let r = 0; r < rows; ++r) {
          grid[c][r] -= p.exp(grid[c][r] * 1e-4) * 0.1;
          grid[c][r] = p.max(0, grid[c][r]);
        }
      }
    }

    function gridCellIndices(point_uv) {
      let i = p.floor((point_uv.x * canvas.x) / grid_cell_size);
      let j = p.floor((point_uv.y * canvas.y) / grid_cell_size);
      return p.createVector(i, j);
    }

    p.draw = () => {
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      var HTMLcanvas = document.getElementById("custom-canvas");
      var HTMLcontext = HTMLcanvas.getContext("2d");
      // if (spacebar) {
      //   // console.log(p.int(u * width), p.int(v * height));
      //   p.ellipse(p.int(u * width), p.int(v * height), 0.1, 0.1);
      // }

      raiseGrid();
      decayGrid();
      noiseGrid();
      renderGrid();

      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      HTMLcontext.drawImage(c.canvas, 0, 0);
    };
  };

  myp5 = new p5(sketch);
});

AFRAME.registerComponent("canvas-updater", {
  dependencies: ["geometry", "material"],

  tick: function () {
    var el = this.el;
    var material;

    material = el.getObject3D("mesh").material;
    if (!material.map) {
      return;
    }
    material.map.needsUpdate = true;
  },
});

AFRAME.registerComponent("collider-check", {
  dependencies: ["raycaster"],

  init: function () {
    this.el.addEventListener("raycaster-intersection", function () {
      console.log("Player hit something!");
    });
  },
});

AFRAME.registerComponent("screen", {
  update: function () {
    var material = new THREE.MeshBasicMaterial({
      // color: "green",
      wireframe: false,
    });

    var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    let canvasMap = new THREE.Texture(document.getElementById("custom-canvas"));
    material.map = canvasMap;
    material.map.needsUpdate = true;
    material.needsUpdate = true;
    this.el.setObject3D("mesh", new THREE.Mesh(geometry, material));
  },
});

// --------------------------
// RAYCASTING

// helps to get the properties of the intersected elements
// oscPort.on("ready", function () {
AFRAME.registerComponent("raycaster-listen", {
  init: function () {
    // Use events to figure out what raycaster is listening so we don't have to
    // hardcode the raycaster.
    this.el.addEventListener("raycaster-intersected", (evt) => {
      this.raycaster = evt.detail.el;
    });
    this.el.addEventListener("raycaster-intersected-cleared", (evt) => {
      this.raycaster = null;
    });
  },

  tick: function () {
    if (!this.raycaster) {
      return;
    } // Not intersecting.

    let intersection = this.raycaster.components.raycaster.getIntersection(
      this.el
    );
    if (!intersection) {
      return;
    }
    u = intersection.uv["x"];
    // v = intersection.uv["y"];
    // console.log('u v', u, v);
    // u = 1.0 - intersection.uv["x"];
    v = 1.0 - intersection.uv["y"];
    oscPort.send({
      address: "/wall_ray",
      args: [
        {
          type: "i",
          value: intersection.object.id,
        },
        {
          type: "f",
          value: u,
        },
        {
          type: "f",
          value: v,
        },
      ],
    });
  },
});
// });

// --------------------------
// KEYBOARD INTERACTION
// listen for keydown and keyup events
// https://www.w3schools.com/jsref/event_onkeydown.asp
document.addEventListener("keydown", function (event) {
  if (event.which == 32) {
    spacebar = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.which == 32) {
    spacebar = false;
  }
});

AFRAME.registerComponent("bubble", {
  schema: {
    // color: { type: "color", default: "#AAA" },
  },

  /**
   * Initial creation and setting of the mesh.
   */
  init: function () {
    let el = this.el;
    // this.renderer = el.renderer;
    this.camera = new THREE.CubeCamera(0.1, 5000, 512);

    let fShader = THREE.FresnelShader;

    let fresnelUniforms = {
      mRefractionRatio: { type: "f", value: 1.02 },
      mFresnelBias: { type: "f", value: 0.1 },
      mFresnelPower: { type: "f", value: 2.0 },
      mFresnelScale: { type: "f", value: 1.0 },
      tCube: { type: "t", value: this.camera.renderTarget }, //  textureCube }
    };

    // Create geometry.
    this.geometry = new THREE.SphereGeometry(1, 32, 32);

    // Create material.
    this.material = new THREE.ShaderMaterial({
      uniforms: fresnelUniforms,
      vertexShader: fShader.vertexShader,
      fragmentShader: fShader.fragmentShader,
    });
    const material = new THREE.MeshPhongMaterial({
      opacity: 0.7,
      transparent: true,
    });

    // Create mesh.
    this.mesh = new THREE.Mesh(this.geometry, material);

    // Set mesh on entity.
    el.setObject3D("mesh", this.mesh);
  },
  // tick: function () {
  //   this.camera.position = this.mesh.position;
  //   // console.log(this.camera.position);

  //   this.mesh.visible = false;
  //   // console.log(this.el);
  //   // this.camera.update();//this.el.sceneEl.renderer, this.el.sceneEl);
  //   this.mesh.visible = true;
  // },
});
