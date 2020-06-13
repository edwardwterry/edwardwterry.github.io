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

    let dampening = 1.0;

    p.setup = () => {
      p.pixelDensity(1);
      c = p.createCanvas(width, height);
      cols = width;
      rows = height;
      // The following line initializes a 2D cols-by-rows array with zeroes
      // in every array cell, and is equivalent to this Processing line:
      // current = new float[cols][rows];
      current = new Array(cols).fill(0).map(n => new Array(rows).fill(0));
      previous = new Array(cols).fill(0).map(n => new Array(rows).fill(0));
    };

    p.draw = () => {
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      var HTMLcanvas = document.getElementById("ripple-canvas");
      var HTMLcontext = HTMLcanvas.getContext("2d");
      x_pix = Math.floor(ripple_u * width);
      z_pix = Math.floor(ripple_v * height);
      console.log(x_pix, z_pix);
      previous[x_pix+50][z_pix+50] = 500;
      previous[235][301] = 500;
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

  var HTMLcanvas = document.getElementById("forest-canvas");
  var HTMLcontext = HTMLcanvas.getContext("2d");
  let img = document.getElementById('forest');
  HTMLcontext.drawImage(img, 0, 0);

  let sceneElement = document.querySelector("a-scene");

  let num_cylinders = 12;
  let bubble_shooter_assy = document.createElement("a-entity");
  bubble_shooter_assy.setAttribute("id", 'bubble-shooter');
  sceneElement.appendChild(bubble_shooter_assy);

  for (let i = 0; i < num_cylinders; i++) {
    let entity = document.createElement("a-entity");
    entity.setAttribute("position", {x: 8, y: 0, z: 0});
    entity.setAttribute("id", i);
    let cyl = document.createElement("a-entity");
    entity.setAttribute("rotation", { x: 0, y: 360 / num_cylinders * i, z: 0 });
    cyl.setAttribute("bubble-shooter", "");
    cyl.setAttribute("material", "side: double; opacity: 0.5");
    cyl.setAttribute("position", {x: 1, y: 0.5, z: 0});
    let fan = document.createElement("a-entity");
    fan.setAttribute("fan", '');
    fan.setAttribute("id", i);
    fan.setAttribute("position", {x: 0, y: -0.4, z: 0});
    fan.setAttribute('raycaster-listen', '');
    let ball = document.createElement("a-entity");
    ball.setAttribute("ball", "");
    ball.setAttribute("position", {x: 0, y: 0, z: 0});    
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
  
  // periodically check for raindrops falling through the floor
  setInterval(() => {
    let ripple_surface = document.querySelector('#ripple-surface');
    // loop through raindrops
    let raindrops = document.querySelectorAll('[raindrop]');
    for (let i = 0; i < raindrops.length; i++){
      if (raindrops[i].object3D.position.y < ripple_surface.object3D.position.y){
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
      // console.log("Player hit something!");
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
    if (intersection.uv){
      u = 1.0 - intersection.uv["x"];
      v = intersection.uv["y"];
      // console.log(u, v);
    }

    if (spacebar && ready_to_add_hit) {

      //cloud 
      if (intersection.object.el.id == "cloud"){
        let pt = intersection.point;
        // console.log(this.el.object3D.worldToLocal(intersection.object.parent.parent.position));
        let raindrop = document.createElement("a-entity");
        raindrop.setAttribute("raindrop", "");
        raindrop.setAttribute("position", pt);
        raindrop.setAttribute("material", "opacity: 0.5");
        
        let scene = document.querySelector('a-scene');
        // console.log(scene);
        scene.appendChild(raindrop);
      }

      //fan
      if (intersection.object.el.attributes[0].name == "fan") {
        // https://aframe.io/docs/1.0.0/introduction/javascript-events-dom-apis.html#looping-over-entities-from-queryselectorall
        var fans = document.querySelectorAll('[fan]');
        var balls = document.querySelectorAll('[ball]');
        for (var i = 0; i < fans.length; i++) {
          if (i == intersection.object.el.id){
            fans[i].components.fan.increase();
            balls[i].components.ball.raise();
          }
        }
      }

      if (intersection.object.el.id == "forest-wall"){
        let pt = intersection.point;
        // console.log(pt);
        let firefly = document.createElement("a-entity");
        firefly.setAttribute("firefly", "");
        firefly.setAttribute("position", pt);     
        let scene = document.querySelector('a-scene');
        scene.appendChild(firefly);
      }
      ready_to_add_hit = false;
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
    acc: { type: 'vec3', default: {x: 0, y: -0.000001, z: 0}},
    vel: { type: 'vec3', default: {x: 0, y: 0, z: 0}}
  },
  multiple: true,

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.007, 16, 16);
    this.material = new THREE.MeshBasicMaterial({color: 0x6df4ff});
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    let pos = this.el.getAttribute('position');
    this.data.vel.y = this.data.vel.y + dt * this.data.acc.y;
    this.el.setAttribute('position', {x: pos.x, y: pos.y + this.data.vel.y * dt, z: pos.z});
    let ripple_surface = document.querySelector('#ripple-surface');
    // console.log(ripple_surface);
    if (this.el.getAttribute('position').y < ripple_surface.object3D.position.y) {
      // console.log(this.el.object3D.worldToLocal(this.el.getAttribute('position')));
      // console.log(this.el);
    }
    let cloud_room_pos = document.querySelector('#cloud-room').getAttribute('position');
    ripple_u = (cloud_room_pos.x - this.el.getAttribute('position').x) / 2.5 + 0.5;
    ripple_v = (cloud_room_pos.z - this.el.getAttribute('position').z) / 2.0 + 0.5;
    // console.log(ripple_u, ripple_v);
  }
});

AFRAME.registerComponent("ball", {
  multiple: true,

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.15, 16, 16);
    this.material = new THREE.MeshBasicMaterial({color: 0x6df4ff});
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    let rand_incr = 0;// Math.random() * 2.0 - 1.0;
    let noise_factor = 5e-5;
    let pos = this.el.getAttribute('position');
    this.el.setAttribute('position', {x: 0, y: Math.max(pos.y + rand_incr*noise_factor*dt, -0.4), z: 0});
  },

  raise: function() {
    let raise_incr = 0.05;
    let pos = this.el.getAttribute('position');
    this.el.setAttribute('position', {x: 0, y: Math.min(pos.y + raise_incr, 1.0) , z: 0}); // TODO slerp
  }
});

AFRAME.registerComponent("firefly", {
  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.01, 16, 16);
    this.material = new THREE.MeshBasicMaterial({color: 0xC7C34D});
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    this.el.object3D.el.components.firefly.material.opacity = (Math.sin(t*0.002)+1.0)/2.0;// .color too
    // console.log(this.el);
  },
});

AFRAME.registerComponent("fan", {
  schema: {
    omega: { type: "vec3", default: {x: 0, y: 0.1, z: 0} },
  },
  multiple: true,
  init: function () {
    this.el.setAttribute('scale', {x: 0.2, y: 0.2, z: 0.2});
    this.el.setAttribute('rotation', {x: 0, y: 0, z: 0});
    this.el.setAttribute('obj-model', 'obj: #fan; mtl: #fan;');
  },
  tick: function (t, dt) {
    let omega = this.data.omega;
    let rot = this.el.getAttribute('rotation');
    this.el.setAttribute('rotation', {x: 0, y: rot.y + omega.y*dt , z: 0})
  },
  increase: function() {
    this.data.omega.y += 0.03;
  }
});
