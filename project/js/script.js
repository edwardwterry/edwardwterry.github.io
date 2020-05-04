let lm;
var output = document.getElementById("output");
let cloud_locations = [];
let cloud_types = [];
let notes;
let cloud_images;
let hand_states, hand_position_pix;
let scale = ["G4", "Eb4", "C4", "G3"];
let chime_samples;

// tone setup
let synth;
let seq;
let bpm = 70;

function handStateFromHistory(hand, historySamples) {
  if (hand.grabStrength == 1) return "closed";
  else if (hand.grabStrength == 0) return "open";
  else {
    var sum = 0;
    for (var s = 0; s < historySamples; s++) {
      var oldHand = lm.frame(s).hand(hand.id);
      if (!oldHand.valid) break;
      sum += oldHand.grabStrength;
    }
    var avg = sum / s;
    if (hand.grabStrength - avg < 0) {
      return "opening";
    } else if (hand.grabStrength > 0) return "closing";
  }
  return "not detected";
}

function find_index_of_closest_cloud(point) {
  let min_distance = 1000.0;
  let min_distance_index = 0;
  for (let i = min_distance_index; i < cloud_locations.length; i++) {
    if (get_euclidean_distance(point, cloud_locations[i]) < min_distance) {
      min_distance_index = i;
    }
  }
  return min_distance_index;
}

function get_euclidean_distance(p1, p2) {
  return dist(p1.x, p1.y, p2.x, p2.y);
}

function update_lm(frame) {
  // left.innerHTML = lm.frame(0) + " " + lm.frame(100);
  for (let i = 0; i < frame.hands.length; i++) {
    let hand_data = frame.hands[i];
    let hand_type = hand_data.type;
    if (hand_type == "right") {
      // https://developer-archive.leapmotion.com/documentation/javascript/devguide/Leap_Coordinate_Mapping.html
      let iBox = frame.interactionBox;
      let normalizedPoint = iBox.normalizePoint(hand_data.palmPosition, true);
      hand_position_pix = get_pixels_from_ibox_fract(normalizedPoint);
      hand_state = handStateFromHistory(hand_data, 100);
      if (hand_state == "opening") {
        hand_opened(hand_position_pix);
      }
    }
  }
}

function get_pixels_from_ibox_fract(fract) {
  return createVector(
    fract[0] * window.innerWidth,
    fract[2] * window.innerHeight
  );
}

function get_secs_from_canvas_fract(fract) {
  let bps = bpm / 60.0;
  let spb = 1 / bps;
  let spm = spb * 4.0;
  return fract * spm;
}

function preload() {
  cloud_images = [
    loadImage("assets/images/cloud1.png"),
    loadImage("assets/images/cloud2.png"),
    loadImage("assets/images/cloud3.png"),
  ];
  bg = loadImage("assets/images/sat_image.png");
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  hand_position_pix = createVector(
    window.innerWidth * 0.5,
    window.innerHeight * 0.5
  );
  console.log("Created cursor at " + hand_position_pix);

  // init the LM
  lm = new Leap.Controller();
  lm.connect();
  lm.on("frame", update_lm);

  chime_samples = new Tone.Sampler({
    G3: "assets/audio/chime1.wav",
    C4: "assets/audio/chime2.wav",
    Eb4: "assets/audio/chime3.wav",
    G4: "assets/audio/chime4.wav",
  });

  chime_samples.volume.value = -20;

  // connect
  Tone.Transport.bpm.value = bpm;

  seq = new Tone.Sequence(
    function (time, note) {
      chime_samples.triggerAttackRelease(note, "10", time);
    },
    notes,
    "4n"
  ).start(0);
  seq.loop = true;
  seq.humanize = true;
  chime_samples.chain(Tone.Master);

  Tone.Transport.start();
}

function get_note_from_canvas_fract(fract) {
  let index = floor(fract * scale.length);
  return scale[index];
}

function create_note(pt) {
  let fract = get_fraction_of_canvas(pt);
  seq.add(
    get_secs_from_canvas_fract(fract.x),
    get_note_from_canvas_fract(fract.y)
  );
}

function draw_cloud(point, type) {
  let cloud_image = cloud_images[type];
  image(
    cloud_image,
    point.x - 0.5 * cloud_image.width,
    point.y - 0.5 * cloud_image.height
  );
}

function get_fraction_of_canvas(point) {
  return createVector(
    point.x / window.innerWidth,
    point.y / window.innerHeight
  );
}

function add_cloud(point) {
  append(cloud_locations, point);
  let type = random([0, 1, 2]);
  console.log("cloud type: " + type);
  append(cloud_types, type);
  create_note(point);
}

function mouseClicked() {
  add_cloud(createVector(mouseX, mouseY));
}

function hand_opened(pt) {
  console.log("hand opened!");
  if (enough_space(pt)) {
    add_cloud(createVector(pt.x, pt.y));
  }
}

function enough_space(pt){
  let min_distance = 1000.0;
  let distance;
  for (let i = 0; i < cloud_locations.length; i++) {
    distance = get_euclidean_distance(pt, cloud_locations[i]);
    if (distance < min_distance) {
      min_distance = distance;
    }
  }
  if (min_distance < 100){
    console.log("cloud too close!");
    return false;
  }
  return true;
}

function update() {
  // for (let i = 0; i < hand_states.length; i++) {
  //   handStateFromHistory(i, 10); // 10 previous frames
  // }
}

function render() {
  // draw clouds
  for (let i = 0; i < cloud_locations.length; i++) {
    draw_cloud(cloud_locations[i], cloud_types[i]);
  }
}

function draw() {
  background(bg);
  update();
  render();
  ellipse(hand_position_pix.x, hand_position_pix.y, 20, 20);
}
