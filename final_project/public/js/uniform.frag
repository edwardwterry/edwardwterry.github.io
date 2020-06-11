precision mediump float;

#define NUM_CIRCLES 2

// we need our texcoords for drawing textures
varying vec2 vTexCoord;

// images are sent to the shader as a variable type called sampler2D
uniform sampler2D imageTex;
uniform vec2 circles[NUM_CIRCLES];
uniform vec2 resolution;

// this is a function that turns an rgb value that goes from 0 - 255 into 0.0 - 1.0
vec3 rgb(float r, float g, float b){
  return vec3(r / 255.0, g / 255.0, b / 255.0);
}

// adapted from jono brandels simple circle https://www.shadertoy.com/view/XsjGDt
vec4 circle(float x, float y, float diam, vec3 col){
    vec2 coord = gl_FragCoord.xy;
    // flip the y coords for p5
    // coord.y = resolution.y - coord.y;

    // store the x and y in a vec2 
    vec2 p = vec2(x, y);

    // calculate the circle
    // first you get the difference of the circles location and the screen coordinates
    // compute the length of that result and subtract the radius
    // this creates a black and white mask that we can use to multiply against our colors
    float c = length( p - coord) - diam*0.5;

    // restrict the results to be between 0.0 and 1.0
    c = clamp(c, 0.0,1.0);
  
    // send out the color, with the circle as the alpha channel  
    // return vec4(rgb(col.r, col.g, col.b), 1.0 - c);  
    return vec4(rgb(col.r, col.g, col.b), c);  
}

void main() {
  // by default, our texcoords will be upside down
  // lets flip them by inverting the y component
  vec2 uv = vTexCoord;
  uv.y = 1.0 - uv.y;
  // uv.y *= 1.4;

  // we can access our image by using the GLSL shader function texture2D()
  // texture2D expects a sampler2D, and texture coordinates as it's input
  vec4 im = texture2D(imageTex, uv);

    // a color for the rect 
  // vec3 grn = vec3(224.0, 210.0, 70.0);
  vec3 grn = vec3(224.0, 255.0, 255.0);
    // call our circle function
  // int num_circles = circles.length();
  // for (int i = 0; i < NUM_CIRCLES; i++){
    vec4 circ = circle(resolution.x * 0.5, resolution.y * 0.5, 100.0, grn);
    // vec4 circ = circle(resolution.x * circles[i].x, resolution.y * circles[i].y, 100.0, grn);
    // im.rgb = mix(im.rgb, circ.rgb, 1.0-circ.a);

  // }

  // lets invert the colors just for fun
  // cactus.rgb = 1.0 - cactus.rgb;

  gl_FragColor = im;
}