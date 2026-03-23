// script.js (фрагмент — замените существующий файл на этот)
import { mat4, mat3,vec4} from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js";
import { loadOBJ } from "./objLoader.js"; // наш исправленный loader
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
    const sphere = createSphere(gl, 40, 40, 2);

    sphere.position = [0, 0, -8];
    sphere.scale = 1.0;

    objects.push(sphere);
}

function setupLightsAndUniforms(program) {
    const lightWorld = [0, 5, 5];

    // ✅ правильное преобразование
    const lightEye4 = vec4.transformMat4([], [...lightWorld, 1.0], viewMatrix);
    const lightEye = [lightEye4[0], lightEye4[1], lightEye4[2]];

    gl.uniform3fv(gl.getUniformLocation(program, "uLightPosition"), lightEye);

    // ambient
    const ambientVal = parseFloat(document.getElementById("ambient").value);
    gl.uniform3fv(
        gl.getUniformLocation(program, "uAmbientLightColor"),
        [ambientVal, ambientVal, ambientVal]
    );

    // diffuse / specular
    gl.uniform3fv(gl.getUniformLocation(program, "uDiffuseLightColor"), [0.7, 0.7, 0.7]);
    gl.uniform3fv(gl.getUniformLocation(program, "uSpecularLightColor"), [1, 1, 1]);

    // attenuation
    gl.uniform1f(
        gl.getUniformLocation(program, "uLinear"),
        parseFloat(document.getElementById("linear").value)
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "uQuadratic"),
        parseFloat(document.getElementById("quadratic").value)
    );

    // модель освещения
    const modelMap = { lambert: 0, phong: 1, blinn: 2, toon: 3 };
    gl.uniform1i(
        gl.getUniformLocation(program, "uLightingModel"),
        modelMap[document.getElementById("model").value]
    );

    // ✅ камера (важно для specular)
    gl.uniform3fv(
        gl.getUniformLocation(program, "uViewPosition"),
        [0, 0, 0]
    );

    // ✅ цвет объекта
    gl.uniform3fv(
        gl.getUniformLocation(program, "uObjectColor"),
        [1.0, 0.5, 0.3]
    );
}

function drawObject(program, obj) {
    // modelMatrix
    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, obj.position);
    const s = obj.scale || 1.0;
    mat4.scale(modelMatrix, modelMatrix, [s, s, s]);

    // mvMatrix = view * model
    mat4.mul(mvMatrix, viewMatrix, modelMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uMVMatrix"), false, mvMatrix);

    // normal matrix must come from mvMatrix
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

    // выбор шейдера
    const shading = document.getElementById("shading").value;
    const program = (shading === "gouraud") ? gouraudProgram : phongProgram;
    gl.useProgram(program);

    // projection
    const aspect = gl.canvas.width / gl.canvas.height;
    mat4.perspective(pMatrix, 1.04, aspect, 0.1, 100);

    // view (камера)
    mat4.identity(viewMatrix);
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -10]);

    setupLightsAndUniforms(program);

    for (const obj of objects) {
        drawObject(program, obj);
    }

    requestAnimationFrame(render);
}

function createSphere(gl, latBands = 30, longBands = 30, radius = 1) {
    const positions = [];
    const normals = [];

    for (let lat = 0; lat <= latBands; lat++) {
        const theta = lat * Math.PI / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let lon = 0; lon <= longBands; lon++) {
            const phi = lon * 2 * Math.PI / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;

            normals.push(x, y, z);
            positions.push(radius * x, radius * y, radius * z);
        }
    }

    const vertices = [];
    const vertexNormals = [];

    for (let lat = 0; lat < latBands; lat++) {
        for (let lon = 0; lon < longBands; lon++) {
            const first = lat * (longBands + 1) + lon;
            const second = first + longBands + 1;

            const indices = [
                first, second, first + 1,
                second, second + 1, first + 1
            ];

            for (let i of indices) {
                vertices.push(
                    positions[3 * i],
                    positions[3 * i + 1],
                    positions[3 * i + 2]
                );
                vertexNormals.push(
                    normals[3 * i],
                    normals[3 * i + 1],
                    normals[3 * i + 2]
                );
            }
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

    return {
        positionBuffer,
        normalBuffer,
        vertexCount: vertices.length / 3
    };
}

init();