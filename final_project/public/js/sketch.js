let socket;

let spacebar = false;
let ready_to_add_hit = false;
let target_canvas;
let u, v;
let myp5;

let bubbles;

let wall_mark_id = 0;

let hits = [];

let expiry = 180; //secs

// gameplay elements
// balls
class Ball {
  constructor(id, height) {
    this.id = id;
    this.height = height;
  }
}

// raindrops
class Raindrop {
  constructor(u, v, height) {
    this.u = u;
    this.v = v;
    this.height = height;
  }
}

// fireflies
class Firefly {
  constructor(u, v, x, y, z) {
    this.u = u;
    this.v = v;
    this.x = x;
    this.y = y;
    this.z = z;
  }
  fly3d(){
    return;
  }
}

// topo map
class MapBeam {
  constructor(theta, x) {
    this.theta = theta;
    this.x = x;
  }
}


var oscPort = new osc.WebSocketPort({
  url: "ws://localhost:3000", // URL to your Web Socket server. // TODO change from localhost?
  metadata: true,
});

oscPort.open();
$(document).ready(function () {
  // https://gist.github.com/wanbinkimoon/0771fea9b199ce5ac32edc8f6d815584
  const sketch = (p) => {
    let width = 2048;
    let height = 512;

    let theShader;
    let forestShader;
    let forestImg;

    p.preload = () => {
      theShader = p.loadShader('js/basic.vert', 'js/basic.frag');
      forestShader = p.loadShader('js/uniform.vert', 'js/uniform.frag');
      forestImg = p.loadImage('assets/forest_small_trim.jpg');
    }
    p.setup = () => {
      c = p.createCanvas(width, height, p.WEBGL);
    };

    p.draw = () => {
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      var HTMLcanvas = document.getElementById("custom-canvas");
      var HTMLcontext = HTMLcanvas.getContext("2d");

      if (ready_to_add_hit){
        let d = new Date();
        hits.push([u, v, d.getTime()]);
        ready_to_add_hit = false;
      }

      // console.log(hits);
      pruneHits();

      // p.shader(theShader);
      // theShader.setUniform('resolution', [width, height]);
      // theShader.setUniform('mouse', [p.map(u, 0, 1, 0, width), p.map(v, 0, 1, 0, height)]);
      // theShader.setUniform('time', p.frameCount * 0.01);
      // theShader.setUniform('draw', spacebar);

      p.shader(forestShader);
      forestShader.setUniform('imageTex', forestImg);

      c.rect(0,0,width, height);
      HTMLcontext.drawImage(c.canvas, 0, 0);
    };

    function pruneHits(){
      
    }
  };

  myp5 = new p5(sketch);

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
    fan.setAttribute("fan", "");
    fan.setAttribute("position", {x: 0, y: -0.4, z: 0});
    cyl.appendChild(fan);
    entity.appendChild(cyl);
    bubble_shooter_assy.appendChild(entity);
  }

  // setInterval(spawnBubbles, 3000);
  // function spawnBubbles() {
  //   let id = Math.floor(Math.random() * num_cylinders);
  //   let shooter = document.getElementById('bubble-shooter');
  //   let height = shooter.children[id].children[0].components['bubble-shooter'].mesh.geometry.parameters.height; // TODO fix
  //   let above_ground = height / 2.0;
  //   let elev_angle = Math.abs(shooter.children[id].children[0].components.rotation.data.z);
  //   let tip_pos = {x: shooter.children[id].children[0].components.position.data.x + above_ground * Math.sin(elev_angle*Math.PI/180.0),
  //   y: shooter.children[id].children[0].components.position.data.y + above_ground * Math.cos(elev_angle*Math.PI/180.0), z: 0};
  //   // console.log(tip_pos );
  //   let entity = document.createElement("a-entity");
  //   entity.setAttribute("bubble", "");
  //   entity.setAttribute("id", id);
  //   entity.setAttribute("raycaster-listen", "");
  //   entity.setAttribute("position", tip_pos);
  //   // entity.setAttribute("velocity", { x: 0.5, y: 0.866, z: 0 });
  //   shooter.children[id].appendChild(entity);
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
    id = intersection.object;
    // console.log(intersection.point);
    if (intersection.uv){
      u = intersection.uv["x"];
      // v = intersection.uv["y"];
      // u = 1.0 - intersection.uv["x"];
      v = 1.0 - intersection.uv["y"];
    }

    if (spacebar) {
      if (id.el.attributes[0].name == "bubble") {
        $("[id=" + id.el.id + "]").remove(); // TODO don't remove the tube
      }
    }
    oscPort.send({
      address: "/wall_ray",
      args: [
        {
          type: "s",
          value: id.el.id,
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

AFRAME.registerComponent("bubble", {
  schema: {
    // color: { type: "color", default: "#AAA" },
  },

  // multiple: true,

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
    this.geometry = new THREE.SphereGeometry(0.1, 32, 32);

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
    // this.el.setAttribute("position", { x: 0, y: 0, z: 0 });
    // this.el.setAttribute("velocity", { x: 0, y: 0, z: 0 });
    // this.el.setAttribute("acceleration", { x: 0, y: -9.8, z: 0 });
  },
  tick: function (t) {
    // let obj = this.el.object3D;
    // let pos = this.position;
    let pos = this.el.getAttribute("position");
    // let vel = this.el.getAttribute("velocity");
    // console.log(t);

    this.el.setAttribute('position', { x: pos.x + 0.02 * 0.5 + Math.random()*0.01, y: pos.y + 0.02 * 0.866, z: pos.z });
    // TODO get time since spawn
    // this.el.setAttribute('position', { x: pos.x + 0.02 * 0.5 + Math.random()*0.01, y: pos.y + 0.02 * (0.866- 0.5 *0.02* 9.81 * (0.001*t)*(0.001*t)), z: pos.z });
    // obj.position.set += 0.01;
    // this.camera.position = this.mesh.position;
    // // console.log(this.camera.position);

    // this.mesh.visible = false;
    // // console.log(this.el);
    // // this.camera.update();//this.el.sceneEl.renderer, this.el.sceneEl);
    // this.mesh.visible = true;
  },
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

AFRAME.registerComponent("fan", {
  schema: {
    w: { type: "vec3" , default: {x: 0, y: 1, z: 0}},
  },
  init: function () {
    this.el.setAttribute('scale', {x: 0.2, y: 0.2, z: 0.2});
    this.el.setAttribute('obj-model', 'obj: #fan; mtl: #fan;');
  },
  tick: function () {
    let rot = this.el.getAttribute('rotation');
    let w = this.el.getAttribute('w');
    let dt = 0.01;
    this.el.setAttribute('rotation', {x: 0, y: rot.y + dt , z: 0})
  }
});
