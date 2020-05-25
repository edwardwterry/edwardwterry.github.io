let socket;

let spacebar = false;
let target_canvas;
let u, v;
let myp5;

var oscPort = new osc.WebSocketPort({
  url: "ws://localhost:3000", // URL to your Web Socket server. // TODO change from localhost?
  metadata: true,
});

oscPort.open();

$(document).ready(function () {
  // socket = io.connect();

  // https://gist.github.com/wanbinkimoon/0771fea9b199ce5ac32edc8f6d815584
  const sketch = (p) => {
    let width = 300;
    let height = 200;
    let count = 0;
    p.setup = () => {
      c = p.createCanvas(width, height);
      c.background(255, 255, 255);
      c.strokeWeight(20);
      p.fill(0);
    };
    p.draw = () => {
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage

      var HTMLcanvas = document.getElementById("custom-canvas");
      var HTMLcontext = HTMLcanvas.getContext("2d");
      // if (spacebar) {
      // console.log("frame count", p.frameCount);
      c.background(30, 30, 30);
      p.point(p.frameCount, 30);
      console.log(p.int(u * width), p.int(v * height));
      // console.log(u, v);
      // }
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      HTMLcontext.drawImage(c.canvas, 0, 0);
      count++;
    };
  };

  myp5 = new p5(sketch);
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
oscPort.on("ready", function () {
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
