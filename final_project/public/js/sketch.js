// Initialize variables

// Audio
let ball_seq;
let bpm = 40;
let spm;

let samplers = {  
  'water': null,
  'wind': [],
  'earth': null,
  'forest': null,
}
let scale_notes = ["F3", "Bb3", "C4", "D4", "Eb4", "Ab4"];
let firefly_speeds = ["slow", "med", "fast"];
let ball_scale_fract;
let drum_sequences = [];
let wind_volume_range = [-30, 5];
let freeverb;
let pitch_shift;

// Interaction
let spacebar = false;
let ready_to_add_hit = false;
let u, v;
let ripple_u = 0.0;
let ripple_v = 0.0;
let fan_speed_range = [0.3, 0.6];
let ball_height_range = [0.0, 1.0];

// Layout
let global_pos;
let room_centers = {
  'water': new THREE.Vector3( 0, 0, 8 ),
  'wind': new THREE.Vector3( 8, 0, 0 ),
  'earth': new THREE.Vector3( -8, 0, 0 ),
  'forest': new THREE.Vector3( 0, 0, -5.4 ),
};
let num_cylinders = 8;
let max_fireflies = 50;

$(document).ready(function () {
  let sceneElement = document.querySelector("a-scene");

  ////////////////////////////////////////// 
  // CLOUD ROOM
  //////////////////////////////////////////
  const sketch = (p) => {
    let width = 512;
    let height = 512;

    let cols;
    let rows;
    let current; // = new float[cols][rows];
    let previous; // = new float[cols][rows];

    let dampening = 0.995;

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
      previous[x_pix][z_pix] = 500;
      p.background(0);

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

  // periodically check for raindrops falling through the floor
  setInterval(() => {
    let ripple_surface = document.querySelector("#ripple-surface");
    let raindrops = document.querySelectorAll("[raindrop]");
    for (let i = 0; i < raindrops.length; i++) {
      if (
        raindrops[i].object3D.position.y <
          ripple_surface.object3D.position.y + 0.2 &&
        !raindrops[i].struck
      ) {
        let note =
          scale_notes[Math.floor(Math.random() * scale_notes.length)];
          samplers['water'].triggerAttack(note);
          raindrops[i].struck = true;
      }
      if (raindrops[i].object3D.position.y < -200) {
        // HACK to help deleting object
        raindrops[i].remove();
      }
    }
  }, 20);

  ////////////////////////////////////////// 
  // FOREST ROOM
  //////////////////////////////////////////  
  var HTMLcanvas = document.getElementById("forest-canvas");
  var HTMLcontext = HTMLcanvas.getContext("2d");
  let img = document.getElementById("forest");
  HTMLcontext.drawImage(img, 0, 0);

  setInterval(() => {
    let fireflies = document.querySelectorAll("[firefly]");
    for (let i = 0; i < fireflies.length; i++) { 
      if (fireflies[i].components.firefly.data.time_alive > 40000){
        fireflies[i].remove();
      }
    }
    while (fireflies.length > max_fireflies) {
      fireflies[0].remove();
    }
  }, 500);  

  ////////////////////////////////////////// 
  // WIND ROOM
  //////////////////////////////////////////   
  let bubble_shooter_assy = document.createElement("a-entity");
  bubble_shooter_assy.setAttribute("id", "bubble-shooter");
  sceneElement.appendChild(bubble_shooter_assy);

  for (let i = 0; i < num_cylinders; i++) {
    let entity = document.createElement("a-entity");
    entity.setAttribute("position", room_centers['wind']);
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
    fan.setAttribute("position", { x: 0, y: -0.45, z: 0 });
    fan.setAttribute("raycaster-listen", "");
    let ball = document.createElement("a-entity");
    ball.setAttribute("ball", "");
    ball.setAttribute("id", i);
    ball.setAttribute("position", { x: 0, y: 0, z: 0 });
    ball.setAttribute("material", "color: #6df4ff; metalness: 0.8");
    cyl.appendChild(ball);
    cyl.appendChild(fan);
    entity.appendChild(cyl);
    bubble_shooter_assy.appendChild(entity);
  }



  ////////////////////////////////////////// 
  // TONE.JS
  //////////////////////////////////////////  
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.start('+2.0');

  let bps = bpm / 60.0;
  let spb = 1 / bps;
  spm = spb * 4.0;
  const synthOptions = {
    attackNoise: 1,
    dampening: 6000,
    resonance: 0.7,
    volume: -10,
  };

  ball_scale_fract = new Array(num_cylinders);
  ball_notes = [];
  for (let i = 0; i < ball_scale_fract.length; i++) {
    ball_scale_fract[i] = 0;
    ball_notes[i] = scale_notes[ball_scale_fract[i]];
  }
  const synth2 = new Tone.PolySynth(synthOptions);

  ball_seq = new Tone.Sequence(
    function (time, note) {
      // synth2.triggerAttackRelease(note, "16n", time);
    },
    ball_notes,
    "8n"
  ).start(0);
  ball_seq.loop = true;
  

  samplers['forest'] = new Tone.Sampler(
    {
      'F3': "assets/forest_F3.mp3",
      "G#4": "assets/forest_Ab4.mp3",
    },
    {
      attack : 2000,
      volume: -20,
    }
  );
  samplers['water'] = new Tone.Sampler(
    {
      'F3': "assets/ripple_F3.mp3",
      "G#4": "assets/ripple_Ab4.mp3",
    },
    {
      volume: 15,
    }
  );  

  let reverb = new Tone.Convolver({ url: 'assets/space.wav', wet: 0.3 });
  // samplers['wind'] = new Tone.MembraneSynth(
  //   {
  //     pitchDecay : 0.05 ,
  //     octaves : 10 ,
  //     oscillator : {
  //       type : 'sine'
  //     },
  //     envelope : {
  //       attack : 0.001 ,
  //       decay : 0.4 ,
  //       sustain : 0.01 ,
  //       release : 1.4 ,
  //       attackCurve : 'exponential'
  //     }
  //   }  
  // );  
  samplers['earth'] = new Tone.GrainPlayer;
  const PingPongOptions = {
    "delayTime": '8n',
    "feedback": 0.3,
    'wet': 0.2
  }
  autoFilter = new Tone.Chorus( {
    frequency : 0.7 ,
    delayTime : 1.5 ,
    depth : 0.7 ,
    type : 'sine' ,
    spread : 180
    }
  );
  freeverb = new Tone.Freeverb({
    roomSize: 500,
    dampening: 1000
  });  

  // const freeverb_wind = new Tone.Freeverb({
  //   roomSize: 0.5,
  //   dampening: 3000
  // });   
  const pingPong = new Tone.PingPongDelay(PingPongOptions);
  samplers['water'].connect(pingPong);
  pingPong.toMaster();

  // create individual polyrhythmic sequences
  for (let i = 0; i < num_cylinders; i++){
    let sampler = new Tone.Sampler(
      {
        'A3': "assets/conga" + i % 3 + ".wav"
      },
      {
        volume: -40,
      }
    ); 
    samplers['wind'].push(sampler);
    samplers['wind'][i].connect(reverb); // connect(Tone.Master);
    let poly_notes = [];
    for (let j = 0; j < i + 1; j++){
      poly_notes.push('A3');
    }
    let seq = new Tone.Sequence((time, note) => {
      sampler.triggerAttack(note);
    }, poly_notes, spm / (i + 1));
    seq.loop = true;
    seq.humanize = true;
    drum_sequences.push(seq);
  }
  reverb.toMaster();
  // var lfo = new Tone.LFO("4n", 400, 4000);
  // var filter = new Tone.Filter(200, "highpass");
  // lfo.connect(filter.frequency);  

  // lfo.start();
  // lfo.toMaster();
  // let buff = new Tone.Buffer('assets/amb_comp.mp3');
	// Tone.Buffer.on('load', function(){
	// 	// after loading the buffer, create the Tone.GrainPlayer
	// 	samplers['earth'] = new Tone.GrainPlayer(buff);
	// 	// we're setting the defaults "by hand" just for the heck of it
	// 	// the better way to do this is probably when you create the GrainPlayer
	// 	samplers['earth'].grainSize = 0.02;
	// 	samplers['earth'].playbackRate = 1;
	// 	samplers['earth'].loop = true;
	// 	samplers['earth'].volume.value = -15;
	// 	samplers['earth'].detune = 0;
	// 	samplers['earth'].toMaster();
  // });  

  // let loaded = false;
  // setInterval(async () => {
  //   if (buff.loaded && !loaded) {
  //     samplers['earth'].start();
  //     loaded = true;
  //   }
  // }, 2000);  

  samplers['earth'] = new Tone.Player({
    "url" : "assets/amb_comp.mp3",
    "autostart" : true,
    'loop': true
  });
  pitch_shift = new Tone.PitchShift();
  samplers['earth'].connect(pitch_shift);
  pitch_shift.toMaster();

  // samplers['earth'] = grainer;
  // samplers['forest'].connect(autoFilter);
  // autoFilter.connect(freeverb);
  freeverb.toMaster();
  // samplers['water'].toMaster();
  // samplers['wind'].toMaster();
  for (let i = 0; i < num_cylinders; i++){
    drum_sequences[i].start(0);
  }

  setInterval(() => {
    // update sampler volumes based on distance from room
    if (global_pos){
      for (var key in samplers) {
        let dist = room_centers[key].distanceTo(global_pos);
        // if (key != 'wind'){
        //   samplers[key].volume.value = Math.min(-0.2*dist*dist, -15);
        // }
        // console.log(key, dist, samplers[key].volume.value);
      }
    }
  }, 20);

  setInterval(() => {
    // fans[i].components.fan.decrease();
    // balls[i].components.ball.lower();
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
      // console.log("Player hit something!");
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
    if (intersection.uv) {
      u = 1.0 - intersection.uv["x"];
      v = intersection.uv["y"];
    }

    if (spacebar && ready_to_add_hit) {

      // CLOUD INTERACTION
      if (intersection.object.el.id == "cloud") {
        let pt = intersection.point;
        let raindrop = document.createElement("a-entity");
        raindrop.setAttribute("raindrop", "struck: false;");
        raindrop.setAttribute("position", pt);
        raindrop.setAttribute("material", "opacity: 0.5");

        let scene = document.querySelector("a-scene");
        scene.appendChild(raindrop);
      }

      // FAN INTERACTION
      if (intersection.object.el.attributes[0].name == "fan") {
        // https://aframe.io/docs/1.0.0/introduction/javascript-events-dom-apis.html#looping-over-entities-from-queryselectorall
        var fans = document.querySelectorAll("[fan]");
        fans[intersection.object.el.id].components.fan.increase();
      }

      // FOREST INTERACTION
      if (intersection.object.el.id == "forest-wall") {
        let pt = intersection.point;
        let firefly = document.createElement("a-entity");
        firefly.setAttribute("firefly", "");
        firefly.setAttribute("position", pt);
        // console.log(firefly);
        let scene = document.querySelector("a-scene");
        let note =
          scale_notes[Math.floor(Math.random() * scale_notes.length)];
        let filt = new Tone.Chorus( {
          frequency : Math.random() * 2 + 1.5,
          delayTime : 1.5 ,
          depth : 0.7 ,
          type : 'sine' ,
          spread : 180
          }
        );          
        samplers['forest'].connect(filt);
        filt.connect(freeverb);
        samplers['forest'].triggerAttack(note);
        scene.appendChild(firefly);
      }
      ready_to_add_hit = false;
    }

    // EARTH INTERACTION
    var globe = document.querySelector("[globe]");
    if (spacebar && intersection.object.parent.uuid == globe.object3D.uuid){
      globe.components.globe.wind_up();
    }
  },
});

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

// A frame components

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
    acc: { type: "vec3", default: { x: 0, y: -0.000001, z: 0 } },
    vel: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    struck: { type: "bool", default: false },
  },

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.007, 16, 16);
    this.material = new THREE.MeshBasicMaterial({ color: 0x6df4ff });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
    this.data.struck = false;
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
    let fans = document.querySelectorAll("[fan]");
    let throttle = fans[this.el.id].components.fan.data.throttle;
    this.el.setAttribute("position", {
      x: 0,
      y: throttle * (ball_height_range[1] - ball_height_range[0]) + ball_height_range[0],
      z: 0,
    }); // TODO slerp
  },

  // raise: function (i) {
  //   let fans = document.querySelectorAll("[fan]");
  //   let throttle = fans[i].components.fan.data.throttle;
  //   this.el.setAttribute("position", {
  //     x: 0,
  //     y: throttle * (ball_height_range[1] - ball_height_range[0]) + ball_height_range[0],
  //     z: 0,
  //   }); // TODO slerp
  // },
});

AFRAME.registerComponent("firefly", {
  schema: {
    time_alive: { type: "float", default: 0.0 },
  },  
  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.01, 16, 16);
    this.material = new THREE.MeshBasicMaterial({ color: 0xc7c34d });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    this.el.object3D.el.components.firefly.material.opacity =
      (Math.sin(t * 0.002) + 1.0) / 2.0; // .color too
    this.data.time_alive += dt;
    // console.log(this.data.time_alive);
  },
});

AFRAME.registerComponent("fan", {
  schema: {
    omega: { type: "vec3", default: { x: 0, y: fan_speed_range[0], z: 0 } },
    throttle: { type: "float", default: 0.0 },
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
    // this.data.throttle = 0.01;
    this.data.throttle = Math.max(this.data.throttle - 0.00001 * dt, 0.0);
    samplers['wind'][this.el.id].volume.value = this.data.throttle * (wind_volume_range[1] - wind_volume_range[0]) + wind_volume_range[0];
    // console.log(this.data.throttle);
  },
  increase: function () {
    this.data.throttle = Math.min(this.data.throttle + 0.05, 1.0);
    this.data.omega.y = this.data.throttle * (fan_speed_range[1] - fan_speed_range[0]) + fan_speed_range[0];
  },
});

AFRAME.registerComponent("globe", {
  schema: {
    omega: { type: "vec3", default: { x: 0, y: 0.005, z: 0 } },
  },
  multiple: true,
  init: function () {
    this.el.setAttribute("rotation", { x: 0, y: 0, z: 0 });
  },
  tick: function (t, dt) {
    let rot = this.el.getAttribute("rotation");
    pitch_shift.pitch = Math.abs(rot.x *0.04);
    // console.log(Math.sin(t));
    // samplers['earth'].grainSize = 0.01 ;//(Math.random() + 0.5) * 0.2 * 0.37; //val > 0 ? val : -val;
    let k = 0.000003;
    let c = 0.99;
    if (rot.x < -40){
      rot.x = -40;
    } else if (rot.x > 40){
      rot.x = 40;
    }    
    let fx = spacebar ? 0 : -k * rot.x;
    this.data.omega.x += fx * dt;
    this.data.omega.x *= c;
    if (this.data.omega.x < -0.05){
      this.data.omega.x = -0.05;
    } else if (this.data.omega.x > 0.05){
      this.data.omega.x = 0.05;
    }
    let angle = rot.x + this.data.omega.x * dt;
    if (angle < -40){
      angle = -40;
    } else if (angle > 40){
      angle = 40;
    }   
    this.el.setAttribute("rotation", {
      x: angle,
      y: rot.y + this.data.omega.y * dt,
      z: 0,
    });
    console.log(angle); 
  },
  wind_up: function () {
    let rot = this.el.getAttribute("rotation");
    this.el.setAttribute("rotation", { x: Math.min(rot.x + 0.5, 40), y: rot.y, z: 0 });
  },
});

AFRAME.registerComponent("position-reader", {
  tick: function () {
    var position = new THREE.Vector3();
    this.el.object3D.getWorldPosition(position);
    global_pos = position;
  },
});