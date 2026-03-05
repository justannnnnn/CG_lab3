import { mat4, mat3 } from "https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js";

let gl;
let shaderProgram;
let objects = [];

let mvMatrix = mat4.create();
let pMatrix = mat4.create();
let nMatrix = mat3.create();
let viewMatrix = mat4.create();

async function init() {

    const canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl");
    gl.enable(gl.DEPTH_TEST);

    await loadScene();

    render();
}

function compileShader(source, type) {

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:",
            gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function initShaders(vertexSource, fragmentSource) {

    const vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader link error:",
            gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

async function loadScene() {

    let snowman = await loadOBJ(gl, "snowman.obj");
    let model2 = await loadOBJ(gl, "teamugobj.obj");
    let model3 = await loadOBJ(gl, "FinalBaseMesh.obj");

    // Масштабируем все объекты
    const scaleSnowman = 2.0;
    const scaleMug = 2.0;
    const scaleBase = 0.5; // сильно уменьшить FinalBaseMesh

    snowman.position = [-2, 0, -8];
    model2.position = [2, 0, -8];
    model3.position = [0, 0, -8];

    snowman.scale = scaleSnowman;
    model2.scale = scaleMug;
    model3.scale = scaleBase;

    objects.push(snowman, model2, model3);
}

function render() {

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let shading = document.getElementById("shading").value;

    if (shading === "gouraud")
        shaderProgram = initShaders(gouraudVS, gouraudFS);
    else
        shaderProgram = initShaders(phongVS, phongFS);

    gl.useProgram(shaderProgram);

    mat4.perspective(pMatrix, 1.04, gl.canvas.width / gl.canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uPMatrix"), false, pMatrix);

    setupLights();

    mat4.identity(viewMatrix);
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -10]); // камера назад

    objects.forEach(obj => {
        drawObject(obj);
    });

    requestAnimationFrame(render);
}

function drawObject(obj) {
    // mvMatrix = viewMatrix * modelMatrix
    let modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, obj.position);
    const s = obj.scale || 1.0;
    mat4.scale(modelMatrix, modelMatrix, [s, s, s]);

    mat4.mul(mvMatrix, viewMatrix, modelMatrix);

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shaderProgram, "uMVMatrix"),
        false,
        mvMatrix
    );

    // нормали берём из модели без view, только модельные трансформации
    mat3.normalFromMat4(nMatrix, modelMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNMatrix"), false, nMatrix);

    const posLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.positionBuffer);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);

    const normLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normLoc);

    gl.drawArrays(gl.TRIANGLES, 0, obj.vertexCount);
}

function setupLights() {

    gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightPosition"), [0, 5, 5]);

    let ambientVal = parseFloat(document.getElementById("ambient").value);

    gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uAmbientLightColor"),
        [ambientVal, ambientVal, ambientVal]);

    gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uDiffuseLightColor"),
        [0.7, 0.7, 0.7]);

    gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uSpecularLightColor"),
        [1, 1, 1]);

    gl.uniform1f(gl.getUniformLocation(shaderProgram, "uLinear"),
        parseFloat(document.getElementById("linear").value));

    gl.uniform1f(gl.getUniformLocation(shaderProgram, "uQuadratic"),
        parseFloat(document.getElementById("quadratic").value));

    let modelMap = { lambert: 0, phong: 1, blinn: 2, toon: 3 };

    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uLightingModel"),
        modelMap[document.getElementById("model").value]);
}

init();