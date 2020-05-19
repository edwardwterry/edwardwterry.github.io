let spacebar = false;
let target_canvas;
let u, v;
let canvas;

$(document).ready(function () {
  // https://gist.github.com/wanbinkimoon/0771fea9b199ce5ac32edc8f6d815584
  const sketch = (p) => {
    let width = 1000;
    let height = 200;
    p.setup = () => {
      pg = p.createGraphics(width, height);
      pg.background(100, 50, 180);
    };

    p.draw = () => {
      p.image(pg, 0, 0);
      if (spacebar) {
        // p.line(u * width, v * height, p.pmouseX, p.pmouseY);
        // p.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
        // p.ellipse(u * width, v * height, 30, 40);
        // console.log(u * width, v * height);
      }
    };
  };

  canvas = new p5(sketch, document.getElementById('custom-canvas-0'));
});



AFRAME.registerComponent("collider-check", {
  dependencies: ["raycaster"],

  init: function () {
    this.el.addEventListener("raycaster-intersection", function () {
      console.log("Player hit something!");
    });
  },
});


// --------------------------
// RAYCASTING

// helps to get the properties of the intersected elements
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
    u = 1.0 - intersection.uv["x"];
    v = 1.0 - intersection.uv["y"];
  },
});

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
