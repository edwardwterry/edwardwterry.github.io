// import p5 from 'p5';
let spacebar = false;

$(document).ready(function () {
  
  // https://gist.github.com/wanbinkimoon/0771fea9b199ce5ac32edc8f6d815584
  const sketch = p => {
    let scene1;
  
    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight);
  
      scene1 = p.createGraphics(400, 400);
  
      p.background(100)
    };
  
    const drawScene = () => {
      console.log(p.createGraphics)
    }

    p.draw = () => {
      drawScene()
    };
  
    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  
    p.mousePressed = () => {};
  };
  
  new p5(sketch);


});

AFRAME.registerComponent("collider-check", {
  dependencies: ["raycaster"],

  init: function () {
    this.el.addEventListener("raycaster-intersection", function () {
      console.log("Player hit something!");
    });
  },
});

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
    // console.log(intersection.uv);
  },
});

// https://www.w3schools.com/jsref/event_onkeydown.asp
document.addEventListener('keydown', function (event) {
  if (event.which == 32){ // spacebar
    spacebar = true;
    console.log('Spacebar down');
  }
});

document.addEventListener('keyup', function (event) {
  if (event.which == 32){ // spacebar
    spacebar = false;
    console.log('Spacebar up');
  }
});

