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

var oscPort = new osc.WebSocketPort({
  url: "ws://localhost:3000", // URL to your Web Socket server. // TODO change from localhost?
  metadata: true,
});

oscPort.open();
$(document).ready(function () {
  // https://gist.github.com/wanbinkimoon/0771fea9b199ce5ac32edc8f6d815584
  const sketch = (p) => {
    let width = 1024;
    let height = 256;

    let theShader; 

    p.preload = () => {
      theShader = p.loadShader('js/basic.vert', 'js/basic.frag');
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

      console.log(hits);

      p.shader(theShader);
      theShader.setUniform('resolution', [width, height]);
      theShader.setUniform('mouse', [p.map(u, 0, 1, 0, width), p.map(v, 0, 1, 0, height)]);
      theShader.setUniform('time', p.frameCount * 0.01);
      theShader.setUniform('draw', spacebar);
      c.rect(0,0,width, height);
      HTMLcontext.drawImage(c.canvas, 0, 0);
    };
  };

  myp5 = new p5(sketch);

  let sceneElement = document.querySelector("a-scene");

  for (let i = 0; i < 10; i++) {
    let entity = document.createElement("a-entity");
    entity.setAttribute("bubble", "");
    entity.setAttribute("id", i);
    entity.setAttribute("raycaster-listen", "");
    entity.setAttribute("scale", { x: 0.1, y: 0.1, z: 0.1 });
    entity.setAttribute("position", { x: i * 0.2, y: 1, z: -3 });
    sceneElement.appendChild(entity);
  }
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
    id = intersection.object;
    // console.log(id.el);
    u = intersection.uv["x"];
    // v = intersection.uv["y"];
    // u = 1.0 - intersection.uv["x"];
    v = 1.0 - intersection.uv["y"];

    if (spacebar) {
      if (id.el.attributes[0].name == "bubble") {
        $("[id=" + id.el.id + "]").remove();
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
  tick: function () {
    // let obj = this.el.object3D;
    // let pos = this.position;
    let pos = this.el.getAttribute("position");
    this.el.setAttribute("position", { x: pos.x, y: pos.y, z: pos.z });

    // this.el.setObject3D('position', { x: -0.5, y: 0, z: 0 });
    // obj.position.set += 0.01;
    // this.camera.position = this.mesh.position;
    // // console.log(this.camera.position);

    // this.mesh.visible = false;
    // // console.log(this.el);
    // // this.camera.update();//this.el.sceneEl.renderer, this.el.sceneEl);
    // this.mesh.visible = true;
  },
});
