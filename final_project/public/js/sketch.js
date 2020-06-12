let socket;

let spacebar = false;
let ready_to_add_hit = false;
let target_canvas;
let u, v;
let cloud_intersection;

let bubbles;

let hits = [];

let expiry = 180; //secs


var oscPort = new osc.WebSocketPort({
  url: "ws://localhost:3000", // URL to your Web Socket server. // TODO change from localhost?
  metadata: true,
});

oscPort.open();
$(document).ready(function () {

  var HTMLcanvas = document.getElementById("custom-canvas");
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
        // console.log(pt);
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
    acc: { type: 'vec3', default: {x: 0, y: -0.0000005, z: 0}},
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
    let rand_incr = Math.random() * 2.0 - 1.0;
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
