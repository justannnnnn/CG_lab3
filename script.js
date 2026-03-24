import { mat4, mat3,vec4} from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js";
import { loadOBJ } from "./objLoader.js"; 
import { gouraudVS, gouraudFS, phongVS, phongFS } from "./shaders.js";

let gl;
let gouraudProgram = null;
let phongProgram = null;
let objects = [];

let mvMatrix = mat4.create();
let pMatrix = mat4.create();
let nMatrix = mat3.create();
let viewMatrix = mat4.create();

function resizeCanvas() {
    const canvas = gl.canvas;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    }
}

function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShadersProgram(vertexSource, fragmentSource) {
    const v = compileShader(vertexSource, gl.VERTEX_SHADER);
    const f = compileShader(fragmentSource, gl.FRAGMENT_SHADER);
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(p));
        return null;
    }
    return p;
}

async function init() {
    const canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) { alert("WebGL не поддерживается"); return; }
    gl.enable(gl.DEPTH_TEST);

    // создаём программы один раз
    gouraudProgram = initShadersProgram(gouraudVS, gouraudFS);
    phongProgram = initShadersProgram(phongVS, phongFS);

    await loadScene();
    requestAnimationFrame(render);
}

async function loadScene() {
    let snowman = await loadOBJ(gl, "snowman.obj");
    let model2 = await loadOBJ(gl, "model2.obj");
    let model3 = await loadOBJ(gl, "FinalBaseMesh.obj");

    model2.scale = 3.0;

    snowman.position = [-10, 0, -8];
    model2.position = [-2, 0, -10];
    model3.position = [10, -10, -10]

    objects.push(snowman, model2, model3);
}

function setupLightsAndUniforms(program) {
    const lightWorld = [0, 5, 5];

    const lightEye4 = vec4.transformMat4([], [...lightWorld, 1.0], viewMatrix);
    const lightEye = [lightEye4[0], lightEye4[1], lightEye4[2]];

    gl.uniform3fv(gl.getUniformLocation(program, "uLightPosition"), lightEye);

    const ambientVal = parseFloat(document.getElementById("ambient").value);
    gl.uniform3fv(
        gl.getUniformLocation(program, "uAmbientLightColor"),
        [ambientVal, ambientVal, ambientVal]
    );

    gl.uniform3fv(gl.getUniformLocation(program, "uDiffuseLightColor"), [0.7, 0.7, 0.7]);
    gl.uniform3fv(gl.getUniformLocation(program, "uSpecularLightColor"), [1, 1, 1]);

    const linearVal = 1.0 - parseFloat(document.getElementById("linear").value);
    const quadVal = (1.0 - parseFloat(document.getElementById("quadratic").value));

    gl.uniform1f(gl.getUniformLocation(program, "uLinear"), linearVal);
    gl.uniform1f(gl.getUniformLocation(program, "uQuadratic"), quadVal);

    const modelMap = {
    lambert: 0,
    phong: 1,
    blinn: 2,
    toon: 3,
    ward: 4,
    oren: 5,
    cook: 6,
    minnaert: 7
    };
    
    gl.uniform1i(
        gl.getUniformLocation(program, "uLightingModel"),
        modelMap[document.getElementById("model").value]
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "uViewPosition"),
        [0, 0, 0]
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "uObjectColor"),
        [1.0, 0.5, 0.3]
    );
}

function drawObject(program, obj) {
    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, obj.position);
    const s = obj.scale || 1.0;
    mat4.scale(modelMatrix, modelMatrix, [s, s, s]);

    mat4.mul(mvMatrix, viewMatrix, modelMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uMVMatrix"), false, mvMatrix);

    mat3.normalFromMat4(nMatrix, mvMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "uNMatrix"), false, nMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uPMatrix"), false, pMatrix);

    const posLoc = gl.getAttribLocation(program, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.positionBuffer);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);

    const normLoc = gl.getAttribLocation(program, "aVertexNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normLoc);

    gl.drawArrays(gl.TRIANGLES, 0, obj.vertexCount);
}

function render() {
    resizeCanvas();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const shading = document.getElementById("shading").value;
    const program = (shading === "gouraud") ? gouraudProgram : phongProgram;
    gl.useProgram(program);

    const aspect = gl.canvas.width / gl.canvas.height;
    mat4.perspective(pMatrix, 1.04, aspect, 0.1, 100);

    mat4.identity(viewMatrix);
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -10]);

    setupLightsAndUniforms(program);

    for (const obj of objects) {
        drawObject(program, obj);
    }

    requestAnimationFrame(render);
}

init();