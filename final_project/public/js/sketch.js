let socket;

let spacebar = false;
let ready_to_add_hit = false;
let target_canvas;
let u, v;
let cloud_intersection;

let bubbles;

let hits = [];

let expiry = 180; //secs

let ripple_u = 0.0;
let ripple_v = 0.0;

// tone setup
let synth;
let ball_seq;
let forest_seq;
let ripple_seq;
let bpm = 72;
let spm;

let ball_scale_fract;
let ball_scale;

let forest_uv = [];
let raindrop_uv = [];
let synth3, synth2, synth4;
let synthOptions;
let lfo;

var oscPort = new osc.WebSocketPort({
  url: "ws://localhost:3000", // URL to your Web Socket server. // TODO change from localhost?
  metadata: true,
});

oscPort.open();
$(document).ready(function () {
  const sketch = (p) => {
    let width = 512;
    let height = 512;

    let cols;
    let rows;
    let current; // = new float[cols][rows];
    let previous; // = new float[cols][rows];

    let dampening = 0.99;

    p.setup = () => {
      p.pixelDensity(1);
      c = p.createCanvas(width, height);
      cols = width;
      rows = height;
      // The following line initializes a 2D cols-by-rows array with zeroes
      // in every array cell, and is equivalent to this Processing line:
      // current = new float[cols][rows];
      current = new Array(cols).fill(0).map((n) => new Array(rows).fill(0));
      previous = new Array(cols).fill(0).map((n) => new Array(rows).fill(0));
    };

    p.draw = () => {
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      var HTMLcanvas = document.getElementById("ripple-canvas");
      var HTMLcontext = HTMLcanvas.getContext("2d");
      x_pix = Math.floor(ripple_u * width);
      z_pix = Math.floor(ripple_v * height);
      // console.log(x_pix, z_pix);
      previous[x_pix][z_pix] = 500;
      // previous[235][301] = 500;
      p.background(87, 185, 255);

      p.loadPixels();
      for (let i = 1; i < cols - 1; i++) {
        for (let j = 1; j < rows - 1; j++) {
          current[i][j] =
            (previous[i - 1][j] +
              previous[i + 1][j] +
              previous[i][j - 1] +
              previous[i][j + 1]) /
              2 -
            current[i][j];
          current[i][j] = current[i][j] * dampening;
          // Unlike in Processing, the pixels array in p5.js has 4 entries
          // for each pixel, so we have to multiply the index by 4 and then
          // set the entries for each color component separately.
          let index = (i + j * cols) * 4;
          p.pixels[index + 0] = current[i][j];
          p.pixels[index + 1] = current[i][j];
          p.pixels[index + 2] = current[i][j];
        }
      }
      p.updatePixels();

      let temp = previous;
      previous = current;
      current = temp;

      HTMLcontext.drawImage(c.canvas, 0, 0);
    };
  };

  myp5 = new p5(sketch);

  var HTMLcanvas = document.getElementById("forest-canvas");
  var HTMLcontext = HTMLcanvas.getContext("2d");
  let img = document.getElementById("forest");
  HTMLcontext.drawImage(img, 0, 0);

  let sceneElement = document.querySelector("a-scene");

  let num_cylinders = 8;
  let bubble_shooter_assy = document.createElement("a-entity");
  bubble_shooter_assy.setAttribute("id", "bubble-shooter");
  sceneElement.appendChild(bubble_shooter_assy);

  for (let i = 0; i < num_cylinders; i++) {
    let entity = document.createElement("a-entity");
    entity.setAttribute("position", { x: 8, y: 0, z: 0 });
    entity.setAttribute("id", i);
    let cyl = document.createElement("a-entity");
    entity.setAttribute("rotation", {
      x: 0,
      y: (360 / num_cylinders) * i,
      z: 0,
    });
    cyl.setAttribute("bubble-shooter", "");
    cyl.setAttribute("material", "side: double; opacity: 0.5");
    cyl.setAttribute("position", { x: 1, y: 0.8, z: 0 });
    let fan = document.createElement("a-entity");
    fan.setAttribute("fan", "");
    fan.setAttribute("id", i);
    fan.setAttribute("position", { x: 0, y: -0.4, z: 0 });
    fan.setAttribute("raycaster-listen", "");
    let ball = document.createElement("a-entity");
    ball.setAttribute("ball", "");
    ball.setAttribute("position", { x: 0, y: 0, z: 0 });
    ball.setAttribute("material", "color: #6df4ff; metalness: 0.8");
    cyl.appendChild(ball);
    cyl.appendChild(fan);
    entity.appendChild(cyl);
    bubble_shooter_assy.appendChild(entity);
  }

  // var nLasers	= 14
  // for(var i = 0; i < nLasers; i++){
  // 	(function(){
  //     var laserBeam	= new THREEx.LaserBeam()
  //     let laserBeamEl = document.createElement('a-entity');
  //     sceneElement.appendChild(laserBeamEl)

  // 		var laserCooked	= new THREEx.LaserCooked(laserBeam)
  // 		// onRenderFcts.push(function(delta, now){
  // 		// 	laserCooked.update(delta, now)
  // 		// })
  // 		var object3d		= laserBeam.object3d
  // 		object3d.position.x	= (i-nLasers/2)/2
  // 		object3d.position.y	= 4
  // 		object3d.rotation.z	= -Math.PI/2
  // 	})()
  // }

  // connect
  Tone.Transport.bpm.value = bpm;

  let bps = bpm / 60.0;
  let spb = 1 / bps;
  spm = spb * 4.0;  
  const synthOptions = {
    frequency: 100,
    attackNoise: 1,
    dampening: 6000,
    resonance: 0.7,
    volume: -10.0,
  };

  ball_scale = ["C3", "D3", "Eb3", "F3", "G3", "Ab3", "Bb3", "C4"];
  ball_scale_fract = new Array(num_cylinders);
  ball_notes = [];
  forest_notes = [''];
  for (let i = 0; i < ball_scale_fract.length; i++){
    ball_scale_fract[i] = 0;
    ball_notes[i] = ball_scale[ball_scale_fract[i]];
  }
  // forest_notes = ball_notes;
  const synth = new Tone.PolySynth(synthOptions);
  synth3 = new Tone.PolySynth(synthOptions);
  const delay = new Tone.FeedbackDelay('8n', '0.1');

  // var lfo = new Tone.LFO("2:0:0", 400, 800 ).start();

  synth2 = new Tone.DuoSynth(synthOptions);
  // lfo.connect(synth2.frequency);
  synth2.toMaster();
  synth.toMaster();
  // synth3.toMaster();

  let feedbackDelay = new Tone.FeedbackDelay("16n", 0.8).toMaster();
  feedbackDelay.wet.value = 0.0;
  
  let vol = new Tone.Volume(-15).connect(feedbackDelay);

  synth4 = new Tone.MetalSynth({
    frequency: 100,
    harmonicity: 1.5,
    modulationIndex: 20,
    resonance: 2000,
    octaves: 1.5,  }).connect(vol);

  // 20Hz Sine LFO ~~ Don't forget to start your LFO
  let lfo4 = new Tone.LFO({
      type: "sine",
      min: 20,
      max: 1000,
      phase: 1,
      frequency: .05,
      amplitude: 1,
    }).start();
  
  lfo4.connect(synth4.frequency);  

  ball_seq = new Tone.Sequence(
    function (time, note) {
      // synth.triggerAttackRelease(note, "16n", time);
    },
    ball_notes,
    "8n"
  ).start(0);
  ball_seq.loop = true;
  // ball_seq.humanize = true;

  forest_seq = new Tone.Sequence(
    function (time, note) {
      // console.log('in forets seq', forest_notes);
      // console.log('in forets seq', time, note);
      // synth2.triggerAttackRelease(note, "8n", time);
    },
    forest_notes,
    "1n"
  ).start(0);
  forest_seq.loop = true;  
  forest_seq.humanize = true;

  Tone.Transport.start();

  function get_note_from_canvas_fract(fract) {
    let index = Math.floor(fract * scale.length);
    return scale[index];
  }
  
  function create_note(pt) {
    let fract = get_fraction_of_canvas(pt);
    seq.add(
      get_secs_from_canvas_fract(fract.x),
      get_note_from_canvas_fract(fract.y)
    );
  }

  function get_fraction_of_canvas(point) {
    return createVector(
      point.x / window.innerWidth,
      point.y / window.innerHeight
    );
  }

  function get_secs_from_canvas_fract(fract) {
    let bps = bpm / 60.0;
    let spb = 1 / bps;
    let spm = spb * 4.0;
    return fract * spm;
  }  

  // periodically check for raindrops falling through the floor
  setInterval(() => {
    let ripple_surface = document.querySelector("#ripple-surface");
    // loop through raindrops
    let raindrops = document.querySelectorAll("[raindrop]");
    for (let i = 0; i < raindrops.length; i++) {
      if (
        raindrops[i].object3D.position.y < ripple_surface.object3D.position.y
      ) {
        raindrops[i].remove();
      }
    }
  }, 100);
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
      // console.log("normal", this.raycaster);
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
    // console.log(intersection);
    if (intersection.uv) {
      u = 1.0 - intersection.uv["x"];
      v = intersection.uv["y"];
      // console.log(u, v);
    }

    if (spacebar && ready_to_add_hit) {
      //cloud
      if (intersection.object.el.id == "cloud") {
        let pt = intersection.point;
        // console.log(this.el.object3D.worldToLocal(intersection.object.parent.parent.position));
        let raindrop = document.createElement("a-entity");
        raindrop.setAttribute("raindrop", "");
        raindrop.setAttribute("position", pt);
        raindrop.setAttribute("material", "opacity: 0.5");

        let scene = document.querySelector("a-scene");
        // console.log(scene);
        scene.appendChild(raindrop);
      }

      //fan
      if (intersection.object.el.attributes[0].name == "fan") {
        // https://aframe.io/docs/1.0.0/introduction/javascript-events-dom-apis.html#looping-over-entities-from-queryselectorall
        var fans = document.querySelectorAll("[fan]");
        var balls = document.querySelectorAll("[ball]");
        for (var i = 0; i < fans.length; i++) {
          if (i == intersection.object.el.id) {
            fans[i].components.fan.increase();
            balls[i].components.ball.raise();
            ball_scale_fract[i] = Math.floor(balls[i].object3D.position.y * ball_scale.length);
            ball_seq.at(i, ball_scale[ball_scale_fract[i]]);
          }
        }
      }

      if (intersection.object.el.id == "forest-wall") {
        let pt = intersection.point;
    
        // console.log(pt);
        let firefly = document.createElement("a-entity");
        firefly.setAttribute("firefly", "");
        firefly.setAttribute("position", pt);
        let scene = document.querySelector("a-scene");
        scene.appendChild(firefly);
        forest_uv.push([u, v]);

        // var fireflies = document.querySelectorAll("[firefly]");
        for (var i = 0; i < forest_uv.length; i++) {
          // console.log(forest_uv[i][0] * spm,
          //   ball_scale[Math.floor(forest_uv[i][1] * ball_scale.length)]);
          //   forest_seq.add(
          //     forest_uv[i][0] * spm,
          //     ball_scale[Math.floor(forest_uv[i][1] * ball_scale.length)]
          //   );
          //   forest_seq.at(
          //   forest_uv[i][0] * spm / 2.0,
          //   ball_scale[Math.floor(forest_uv[i][1] * ball_scale.length)]
          // );
        }            
      }
      ready_to_add_hit = false;
    }

    if (spacebar){
      var globes = document.querySelectorAll("[globe]");
      for (var i = 0; i < globes.length; i++) {
        if (i == intersection.object.el.id) {
          globes[i].components.globe.wind_up();
        }
      }      
    }

    // oscPort.send({
    //   address: "/wall_ray",
    //   args: [
    //     {
    //       type: "s",
    //       value: id.el.id,
    //     },
    //     {
    //       type: "f",
    //       value: u,
    //     },
    //     {
    //       type: "f",
    //       value: v,
    //     },
    //   ],
    // });
  },
});

AFRAME.registerComponent("raycaster-listen-mountain", {
  init: function () {
    // Use events to figure out what raycaster is listening so we don't have to
    // hardcode the raycaster.
    this.el.addEventListener("raycaster-intersected", (evt) => {
      // console.log("raycaster-intersected");
      this.raycaster = evt.detail.el;
      // console.log("mtn", this.raycaster);
    });
    this.el.addEventListener("raycaster-intersected-cleared", (evt) => {
      // console.log(evt);
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
    // console.log(intersection);
  },
});
// });

// --------------------------
// KEYBOARD INTERACTION
// listen for keydown and keyup events
// https://www.w3schools.com/jsref/event_onkeydown.asp
document.addEventListener("keydown", function (event) {
  if (event.which == 32 && spacebar == false) {
    spacebar = true;
    ready_to_add_hit = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.which == 32) {
    spacebar = false;
  }
});

AFRAME.registerComponent("bubble-shooter", {
  init: function () {
    let el = this.el;
    this.geometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 32, 1, true);
    // this.material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    this.material = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },
});

AFRAME.registerComponent("raindrop", {
  schema: {
    acc: { type: "vec3", default: { x: 0, y: -0.000004, z: 0 } },
    vel: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
  },
  multiple: true,

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.007, 16, 16);
    this.material = new THREE.MeshBasicMaterial({ color: 0x6df4ff });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    let pos = this.el.getAttribute("position");
    this.data.vel.y = this.data.vel.y + dt * this.data.acc.y;
    this.el.setAttribute("position", {
      x: pos.x,
      y: pos.y + this.data.vel.y * dt,
      z: pos.z,
    });
    let ripple_surface = document.querySelector("#ripple-surface");
    // console.log(ripple_surface);
    if (
      this.el.getAttribute("position").y < ripple_surface.object3D.position.y
    ) {
      let cloud_room_pos = document
        .querySelector("#cloud-room")
        .getAttribute("position");
      ripple_u =
        1.0 -
        ((cloud_room_pos.x - this.el.getAttribute("position").x) / 2.5 + 0.5);
      ripple_v =
        (cloud_room_pos.z - this.el.getAttribute("position").z) / 2.0 + 0.5;
      synth4.triggerAttackRelease(ball_scale[Math.floor(ripple_u * ball_scale.length)], 0.5, 1.0); // remove dupliate     
      
    }
  },
});

AFRAME.registerComponent("ball", {
  multiple: true,

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.15, 16, 16);
    this.material = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    let rand_incr = 0; // Math.random() * 2.0 - 1.0;
    let noise_factor = 5e-5;
    let pos = this.el.getAttribute("position");
    this.el.setAttribute("position", {
      x: 0,
      y: Math.max(pos.y + rand_incr * noise_factor * dt, -0.4),
      z: 0,
    });
  },

  raise: function () {
    let raise_incr = 0.05;
    let pos = this.el.getAttribute("position");
    this.el.setAttribute("position", {
      x: 0,
      y: Math.min(pos.y + raise_incr, 1.0),
      z: 0,
    }); // TODO slerp
  },
});

AFRAME.registerComponent("firefly", {
  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.01, 16, 16);
    this.material = new THREE.MeshBasicMaterial({ color: 0xc7c34d });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
    // var lfo_local = lfo;
    // lfo_local.
    // let s2 = new Tone.DuoSynth(synthOptions);
    // lfo_local.connect(s2.frequency);

    // s2.toMaster();    
    // synth4.triggerAttackRelease(ball_scale[Math.floor(Math.random()*ball_scale.length)], 5); // remove dupliate     
    synth4.triggerAttackRelease("A3", 5); // remove dupliate     
  },

  tick: function (t, dt) {
    this.el.object3D.el.components.firefly.material.opacity =
      (Math.sin(t * 0.002) + 1.0) / 2.0; // .color too
    // console.log(this.el);
  },
});

AFRAME.registerComponent("fan", {
  schema: {
    omega: { type: "vec3", default: { x: 0, y: 0.1, z: 0 } },
  },
  multiple: true,
  init: function () {
    this.el.setAttribute("scale", { x: 0.2, y: 0.2, z: 0.2 });
    this.el.setAttribute("rotation", { x: 0, y: 0, z: 0 });
    this.el.setAttribute("obj-model", "obj: #fan; mtl: #fan;");
  },
  tick: function (t, dt) {
    let omega = this.data.omega;
    let rot = this.el.getAttribute("rotation");
    this.el.setAttribute("rotation", { x: 0, y: rot.y + omega.y * dt, z: 0 });
  },
  increase: function () {
    this.data.omega.y += 0.03;
  },
});

AFRAME.registerComponent("globe", {
  schema: {
    omega: { type: "vec3", default: { x: 0, y: 0.02, z: 0 } },
  },
  multiple: true,
  init: function () {
    this.el.setAttribute("rotation", { x: 0, y: 0, z: 0 });
  },
  tick: function (t, dt) {
    let rot = this.el.getAttribute("rotation");
    let k = 0.000003;
    let c = 0.99;
    let fx = spacebar ? 0 : -k * rot.x;
    this.data.omega.x += fx * dt;
    this.data.omega.x *= c; // add damping
    this.el.setAttribute("rotation", { x: rot.x + this.data.omega.x * dt, y: rot.y + this.data.omega.y * dt, z: 0 });
    // console.log(rot.x);
  },
  wind_up: function () {
    // console.log('winding up');
    let rot = this.el.getAttribute("rotation");
    this.el.setAttribute("rotation", { x: Math.max(rot.x - 0.5, -20), y: rot.y, z: 0 });
  },  
});