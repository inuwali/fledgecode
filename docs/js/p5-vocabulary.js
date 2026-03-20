// Centralized P5.js vocabulary and definitions
// This file contains all P5.js functions, variables, constants, and type definitions
// used across the application for consistency and maintainability

/**
 * P5.js functions that need to be bound to the user code scope
 */
export const P5_FUNCTIONS = [
    // Structure & Environment
    'preload', 'loop', 'noLoop', 'redraw', 'remove', 'isLooping', 'print',
    'cursor', 'noCursor', 'fullscreen', 'pixelDensity', 'displayDensity',
    
    // Basic drawing functions
    'createCanvas', 'background', 'fill', 'stroke', 'noFill', 'noStroke',
    'ellipse', 'circle', 'rect', 'square', 'line', 'point', 'triangle', 'quad', 'arc',
    'beginShape', 'endShape', 'vertex', 'curveVertex', 'bezierVertex', 'quadraticVertex',
    'bezier', 'curve', 'beginContour', 'endContour',
    
    // Shape attributes
    'strokeCap', 'strokeJoin', 'smooth', 'noSmooth',
    
    // Curve utilities
    'bezierDetail', 'bezierPoint', 'bezierTangent',
    'curveDetail', 'curveTightness', 'curvePoint', 'curveTangent',
    
    // Transformations
    'translate', 'rotate', 'scale', 'push', 'pop', 'shearX', 'shearY',
    'applyMatrix', 'resetMatrix',
    
    // Math and utility functions
    'random', 'randomGaussian', 'randomSeed', 'noise', 'noiseDetail', 'noiseSeed',
    'millis', 'frameRate', 'dist', 'map', 'lerp', 'norm', 'mag', 'constrain',
    'min', 'max', 'abs', 'ceil', 'floor', 'round', 'fract',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'radians', 'degrees',
    'exp', 'log', 'pow', 'sqrt', 'sq',
    
    // Colors
    'color', 'lerpColor', 'red', 'green', 'blue', 'alpha',
    'hue', 'saturation', 'brightness', 'lightness',
    'strokeWeight', 'rectMode', 'ellipseMode', 'colorMode', 'angleMode',
    
    // Canvas operations
    'clear', 'erase', 'noErase', 'blendMode', 'filter',
    'save', 'saveCanvas', 'saveFrames', 'saveGif',
    
    // Text and fonts
    'text', 'textSize', 'textAlign', 'textFont', 'textLeading', 'textStyle',
    'textWidth', 'textAscent', 'textDescent', 'textBounds', 'textWrap', 'textToPoints',
    
    // Graphics and vectors
    'createGraphics', 'createVector',
    
    // Images
    'image', 'imageMode', 'tint', 'noTint', 'createImage',
    'loadPixels', 'updatePixels', 'get', 'set', 'copy', 'blend',
    
    // Loading
    'loadImage', 'loadFont', 'loadJSON', 'loadXML', 'loadTable', 'loadStrings', 'loadBytes',
    
    // Data saving
    'saveJSON', 'saveStrings', 'saveTable', 'createWriter',
    
    // Input checking
    'keyIsDown',
    
    // Date/time
    'day', 'hour', 'minute', 'month', 'second', 'year',
    
    // Array utilities
    'append', 'arrayCopy', 'concat', 'reverse', 'shorten', 'shuffle', 'sort', 'splice', 'subset',
    
    // String utilities
    'join', 'match', 'matchAll', 'split', 'splitTokens', 'trim',
    'nf', 'nfc', 'nfp', 'nfs',
    
    // Type conversion
    'boolean', 'byte', 'char', 'float', 'hex', 'int', 'str', 'unchar', 'unhex',
    
    // DOM elements (commonly used in tutorials)
    'createElement', 'createDiv', 'createP', 'createSpan',
    'createButton', 'createSlider', 'createInput', 'createCheckbox', 'createSelect',
    'createColorPicker', 'createFileInput',
    'select', 'selectAll', 'removeElements',
    
    // 3D functions (for WebGL mode tutorials)
    'box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'ellipsoid',
    'rotateX', 'rotateY', 'rotateZ',
    'camera', 'perspective', 'ortho', 'frustum',
    'ambientLight', 'directionalLight', 'pointLight', 'spotLight',
    'lights', 'noLights', 'lightFalloff',
    'ambientMaterial', 'specularMaterial', 'emissiveMaterial', 'normalMaterial',
    'metalness', 'shininess',
    
    // Accessibility
    'describe', 'describeElement', 'textOutput', 'gridOutput'
];

/**
 * P5.js variables that need to be bound to the user code scope
 */
export const P5_VARIABLES = [
    // Canvas dimensions
    'width', 'height', 'windowWidth', 'windowHeight', 'displayWidth', 'displayHeight',
    
    // Mouse state
    'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'mouseIsPressed', 'mouseButton',
    'movedX', 'movedY', 'winMouseX', 'winMouseY',
    
    // Keyboard state
    'key', 'keyCode', 'keyIsPressed',
    
    // Touch
    'touches',
    
    // Time and animation
    'frameCount', 'deltaTime', 'focused',
    
    // Device sensors
    'accelerationX', 'accelerationY', 'accelerationZ',
    'pAccelerationX', 'pAccelerationY', 'pAccelerationZ',
    'rotationX', 'rotationY', 'rotationZ',
    'pRotationX', 'pRotationY', 'pRotationZ',
    'deviceOrientation', 'turnAxis',
    
    // Pixels
    'pixels'
];

/**
 * P5.js constants that need to be bound to the user code scope
 */
export const P5_CONSTANTS = [
    // Mathematical constants
    'PI', 'TWO_PI', 'HALF_PI', 'QUARTER_PI', 'TAU',
    
    // Drawing modes
    'RADIUS', 'CENTER', 'CORNER', 'CORNERS',
    'DEGREES', 'RADIANS',
    
    // Color modes
    'RGB', 'HSB', 'HSL',
    
    // Blend modes
    'BLEND', 'ADD', 'MULTIPLY', 'SCREEN', 'OVERLAY',
    'DARKEN', 'LIGHTEN', 'COLOR_BURN', 'COLOR_DODGE',
    'HARD_LIGHT', 'SOFT_LIGHT', 'DIFFERENCE', 'EXCLUSION',
    'BURN', 'DODGE', 'DARKEST', 'LIGHTEST', 'REPLACE', 'REMOVE',
    
    // Shape modes
    'OPEN', 'CHORD', 'PIE', 'CLOSE',
    'LINES', 'TRIANGLES', 'TRIANGLE_FAN', 'TRIANGLE_STRIP',
    'QUADS', 'QUAD_STRIP', 'POINTS',
    
    // Stroke styles
    'PROJECT', 'SQUARE', 'ROUND', 'BEVEL', 'MITER',
    
    // Text alignment
    'LEFT', 'RIGHT', 'CENTER', 'TOP', 'BOTTOM', 'BASELINE',
    
    // Text styles
    'NORMAL', 'ITALIC', 'BOLD', 'BOLDITALIC',
    
    // Directions
    'UP', 'DOWN',
    
    // Renderer types
    'P2D', 'WEBGL', 'WEBGL2',
    
    // Filter types
    'THRESHOLD', 'GRAY', 'OPAQUE', 'INVERT', 'POSTERIZE',
    'BLUR', 'ERODE', 'DILATE',
    
    // Image modes
    'IMAGE',
    
    // Key codes (commonly used)
    'BACKSPACE', 'DELETE', 'ENTER', 'RETURN', 'TAB', 'ESCAPE',
    'SHIFT', 'CONTROL', 'OPTION', 'ALT', 'UP_ARROW', 'DOWN_ARROW',
    'LEFT_ARROW', 'RIGHT_ARROW'
];

/**
 * TypeScript definitions for P5.js (used by Monaco Editor for autocompletion)
 */
export const P5_TYPE_DEFINITIONS = `
    // P5.js Variables - Canvas & Window
    declare var width: number;
    declare var height: number;
    declare var windowWidth: number;
    declare var windowHeight: number;
    declare var displayWidth: number;
    declare var displayHeight: number;
    
    // P5.js Variables - Mouse
    declare var mouseX: number;
    declare var mouseY: number;
    declare var pmouseX: number;
    declare var pmouseY: number;
    declare var mouseIsPressed: boolean;
    declare var mouseButton: string;
    declare var movedX: number;
    declare var movedY: number;
    declare var winMouseX: number;
    declare var winMouseY: number;
    
    // P5.js Variables - Keyboard
    declare var key: string;
    declare var keyCode: number;
    declare var keyIsPressed: boolean;
    
    // P5.js Variables - Touch & Device
    declare var touches: any[];
    declare var accelerationX: number;
    declare var accelerationY: number;
    declare var accelerationZ: number;
    declare var pAccelerationX: number;
    declare var pAccelerationY: number;
    declare var pAccelerationZ: number;
    declare var rotationX: number;
    declare var rotationY: number;
    declare var rotationZ: number;
    declare var pRotationX: number;
    declare var pRotationY: number;
    declare var pRotationZ: number;
    declare var deviceOrientation: string;
    declare var turnAxis: string;
    
    // P5.js Variables - Time & State
    declare var frameCount: number;
    declare var deltaTime: number;
    declare var focused: boolean;
    declare var pixels: Uint8ClampedArray;
    
    // P5.js Constants - Mathematical
    declare var PI: number;
    declare var TWO_PI: number;
    declare var HALF_PI: number;
    declare var QUARTER_PI: number;
    declare var TAU: number;
    
    // P5.js Constants - Drawing Modes
    declare var RADIUS: number;
    declare var CENTER: number;
    declare var CORNER: number;
    declare var CORNERS: number;
    declare var DEGREES: number;
    declare var RADIANS: number;
    
    // P5.js Constants - Colors & Blending
    declare var RGB: number;
    declare var HSB: number;
    declare var HSL: number;
    declare var BLEND: number;
    declare var ADD: number;
    declare var MULTIPLY: number;
    declare var SCREEN: number;
    declare var OVERLAY: number;
    declare var DARKEN: number;
    declare var LIGHTEN: number;
    
    // P5.js Constants - Shapes & Text
    declare var LEFT: number;
    declare var RIGHT: number;
    declare var CENTER: number;
    declare var TOP: number;
    declare var BOTTOM: number;
    declare var BASELINE: number;
    declare var NORMAL: number;
    declare var ITALIC: number;
    declare var BOLD: number;
    declare var BOLDITALIC: number;
    
    // P5.js Constants - Renderers
    declare var P2D: string;
    declare var WEBGL: string;
    declare var WEBGL2: string;
    
    // P5.js Functions - Structure
    declare function preload(): void;
    declare function setup(): void;
    declare function draw(): void;
    declare function loop(): void;
    declare function noLoop(): void;
    declare function redraw(): void;
    declare function remove(): void;
    declare function isLooping(): boolean;
    declare function print(...args: any[]): void;
    
    // P5.js Functions - Canvas
    declare function createCanvas(w: number, h: number, renderer?: string): any;
    declare function resizeCanvas(w: number, h: number): void;
    declare function cursor(type?: string): void;
    declare function noCursor(): void;
    declare function fullscreen(val?: boolean): boolean | void;
    declare function pixelDensity(val?: number): number | void;
    declare function displayDensity(): number;
    
    // P5.js Functions - Basic Drawing
    declare function background(color: any): void;
    declare function clear(): void;
    declare function fill(color: any): void;
    declare function noFill(): void;
    declare function stroke(color: any): void;
    declare function noStroke(): void;
    declare function strokeWeight(weight: number): void;
    declare function strokeCap(cap: any): void;
    declare function strokeJoin(join: any): void;
    
    // P5.js Functions - Shapes
    declare function ellipse(x: number, y: number, w: number, h?: number): void;
    declare function circle(x: number, y: number, d: number): void;
    declare function rect(x: number, y: number, w: number, h: number, tl?: number, tr?: number, br?: number, bl?: number): void;
    declare function square(x: number, y: number, s: number, tl?: number, tr?: number, br?: number, bl?: number): void;
    declare function line(x1: number, y1: number, x2: number, y2: number): void;
    declare function point(x: number, y: number): void;
    declare function triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void;
    declare function quad(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
    declare function arc(x: number, y: number, w: number, h: number, start: number, stop: number, mode?: any): void;
    
    // P5.js Functions - Complex Shapes
    declare function beginShape(kind?: any): void;
    declare function endShape(mode?: any): void;
    declare function vertex(x: number, y: number): void;
    declare function curveVertex(x: number, y: number): void;
    declare function bezierVertex(x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
    declare function quadraticVertex(cx: number, cy: number, x3: number, y3: number): void;
    declare function bezier(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
    declare function curve(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void;
    
    // P5.js Functions - Transformations
    declare function translate(x: number, y: number, z?: number): void;
    declare function rotate(angle: number): void;
    declare function rotateX(angle: number): void;
    declare function rotateY(angle: number): void;
    declare function rotateZ(angle: number): void;
    declare function scale(s: number): void;
    declare function scale(x: number, y: number, z?: number): void;
    declare function shearX(angle: number): void;
    declare function shearY(angle: number): void;
    declare function push(): void;
    declare function pop(): void;
    declare function applyMatrix(a: number, b: number, c: number, d: number, e: number, f: number): void;
    declare function resetMatrix(): void;
    
    // P5.js Functions - Math
    declare function random(max?: number): number;
    declare function random(min: number, max: number): number;
    declare function randomGaussian(mean?: number, sd?: number): number;
    declare function randomSeed(seed: number): void;
    declare function noise(x: number, y?: number, z?: number): number;
    declare function noiseDetail(octaves: number, falloff?: number): void;
    declare function noiseSeed(seed: number): void;
    declare function abs(n: number): number;
    declare function ceil(n: number): number;
    declare function constrain(n: number, low: number, high: number): number;
    declare function dist(x1: number, y1: number, x2: number, y2: number): number;
    declare function exp(n: number): number;
    declare function floor(n: number): number;
    declare function lerp(start: number, stop: number, amt: number): number;
    declare function log(n: number): number;
    declare function mag(x: number, y: number): number;
    declare function map(value: number, start1: number, stop1: number, start2: number, stop2: number, withinBounds?: boolean): number;
    declare function max(n0: number, ...ns: number[]): number;
    declare function min(n0: number, ...ns: number[]): number;
    declare function norm(value: number, start: number, stop: number): number;
    declare function pow(n: number, e: number): number;
    declare function round(n: number, decimals?: number): number;
    declare function sq(n: number): number;
    declare function sqrt(n: number): number;
    declare function fract(num: number): number;
    
    // P5.js Functions - Trigonometry
    declare function acos(value: number): number;
    declare function asin(value: number): number;
    declare function atan(value: number): number;
    declare function atan2(y: number, x: number): number;
    declare function cos(angle: number): number;
    declare function sin(angle: number): number;
    declare function tan(angle: number): number;
    declare function degrees(radians: number): number;
    declare function radians(degrees: number): number;
    declare function angleMode(mode: any): void;
    
    // P5.js Functions - Colors
    declare function color(r: number, g: number, b: number, a?: number): any;
    declare function color(gray: number, a?: number): any;
    declare function color(colorString: string): any;
    declare function alpha(color: any): number;
    declare function blue(color: any): number;
    declare function brightness(color: any): number;
    declare function green(color: any): number;
    declare function hue(color: any): number;
    declare function lerpColor(c1: any, c2: any, amt: number): any;
    declare function lightness(color: any): number;
    declare function red(color: any): number;
    declare function saturation(color: any): number;
    declare function colorMode(mode: any, max1?: number, max2?: number, max3?: number, maxA?: number): void;
    
    // P5.js Functions - Setting
    declare function ellipseMode(mode: any): void;
    declare function rectMode(mode: any): void;
    declare function blendMode(mode: any): void;
    declare function smooth(): void;
    declare function noSmooth(): void;
    
    // P5.js Functions - Typography
    declare function text(str: any, x: number, y: number, x2?: number, y2?: number): void;
    declare function textAlign(horizAlign: any, vertAlign?: any): void;
    declare function textFont(font: any, size?: number): any;
    declare function textLeading(leading: number): void;
    declare function textSize(size: number): void;
    declare function textStyle(style: any): void;
    declare function textWidth(str: string): number;
    declare function textAscent(): number;
    declare function textDescent(): number;
    
    // P5.js Functions - Images
    declare function image(img: any, x: number, y: number, w?: number, h?: number): void;
    declare function imageMode(mode: any): void;
    declare function tint(color: any): void;
    declare function noTint(): void;
    declare function createImage(width: number, height: number): any;
    declare function loadImage(path: string, successCallback?: Function, failureCallback?: Function): any;
    declare function get(x?: number, y?: number, w?: number, h?: number): any;
    declare function set(x: number, y: number, c: any): void;
    declare function loadPixels(): void;
    declare function updatePixels(x?: number, y?: number, w?: number, h?: number): void;
    
    // P5.js Functions - Input
    declare function keyIsDown(code: number): boolean;
    
    // P5.js Functions - Time
    declare function millis(): number;
    declare function frameRate(fps?: number): number | void;
    declare function day(): number;
    declare function hour(): number;
    declare function minute(): number;
    declare function month(): number;
    declare function second(): number;
    declare function year(): number;
    
    // P5.js Functions - Graphics
    declare function createGraphics(width: number, height: number, renderer?: string): any;
    declare function createVector(x?: number, y?: number, z?: number): any;
    
    // P5.js Functions - Loading
    declare function loadFont(path: string, successCallback?: Function, failureCallback?: Function): any;
    declare function loadJSON(path: string, datatype?: string, successCallback?: Function, failureCallback?: Function): any;
    declare function loadStrings(path: string, successCallback?: Function, failureCallback?: Function): string[];
    declare function loadTable(path: string, options?: string, successCallback?: Function, failureCallback?: Function): any;
    declare function loadXML(path: string, successCallback?: Function, failureCallback?: Function): any;
    
    // P5.js Functions - Saving
    declare function save(filename?: string): void;
    declare function saveCanvas(filename?: string, extension?: string): void;
    declare function saveFrames(filename: string, extension: string, duration: number, framerate: number, successCallback?: Function): void;
    
    // P5.js Functions - Accessibility
    declare function describe(text: string, display?: any): void;
    declare function describeElement(name: string, text: string, display?: any): void;
    declare function textOutput(display?: any): void;
    declare function gridOutput(display?: any): void;
    
    // P5.js Event Functions (user-defined callbacks)
    declare function mousePressed(event?: any): void;
    declare function mouseReleased(event?: any): void;
    declare function mouseClicked(event?: any): void;
    declare function mouseMoved(event?: any): void;
    declare function mouseDragged(event?: any): void;
    declare function mouseWheel(event?: any): void;
    declare function keyPressed(event?: any): void;
    declare function keyReleased(event?: any): void;
    declare function keyTyped(event?: any): void;
    declare function touchStarted(event?: any): void;
    declare function touchMoved(event?: any): void;
    declare function touchEnded(event?: any): void;
    declare function deviceMoved(event?: any): void;
    declare function deviceTurned(event?: any): void;
    declare function deviceShaken(event?: any): void;
    declare function windowResized(event?: any): void;
`;

/**
 * Get all P5.js identifiers (functions + variables + constants) for error suggestions
 */
export function getAllP5Identifiers() {
    return [...P5_FUNCTIONS, ...P5_VARIABLES, ...P5_CONSTANTS];
}

/**
 * Check if an identifier is a known P5.js function
 */
export function isP5Function(identifier) {
    return P5_FUNCTIONS.includes(identifier);
}

/**
 * Check if an identifier is a known P5.js variable
 */
export function isP5Variable(identifier) {
    return P5_VARIABLES.includes(identifier);
}

/**
 * Check if an identifier is a known P5.js constant
 */
export function isP5Constant(identifier) {
    return P5_CONSTANTS.includes(identifier);
}

/**
 * Check if an identifier is any known P5.js identifier
 */
export function isP5Identifier(identifier) {
    return isP5Function(identifier) || isP5Variable(identifier) || isP5Constant(identifier);
}