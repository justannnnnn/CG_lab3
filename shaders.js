export const gouraudVS = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;

uniform vec3 uLightPosition;
uniform vec3 uAmbientLightColor;
uniform vec3 uDiffuseLightColor;
uniform vec3 uSpecularLightColor;

uniform float uLinear;
uniform float uQuadratic;
uniform int uLightingModel; // 0 lambert,1 phong,2 blinn,3 toon

varying vec3 vLightWeighting;

const float shininess = 16.0;

void main(void){

vec4 vertexPositionEye4 = uMVMatrix * vec4(aVertexPosition,1.0);
vec3 vertexPositionEye3 = vertexPositionEye4.xyz;

vec3 normal = normalize(uNMatrix * aVertexNormal);
vec3 lightDir = normalize(uLightPosition - vertexPositionEye3);

float lambertTerm = max(dot(normal, lightDir),0.0);

vec3 ambient = uAmbientLightColor;
vec3 diffuse = uDiffuseLightColor * lambertTerm;

vec3 specular = vec3(0.0);

if(uLightingModel == 1){
    vec3 viewDir = normalize(-vertexPositionEye3);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(reflectDir, viewDir),0.0), shininess);
    specular = uSpecularLightColor * spec;
}
if(uLightingModel == 2){
    vec3 viewDir = normalize(-vertexPositionEye3);
    vec3 halfway = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfway),0.0), shininess);
    specular = uSpecularLightColor * spec;
}
if(uLightingModel == 3){
    if(lambertTerm > 0.75) lambertTerm = 1.0;
    else if(lambertTerm > 0.5) lambertTerm = 0.7;
    else if(lambertTerm > 0.25) lambertTerm = 0.4;
    else lambertTerm = 0.2;
    diffuse = uDiffuseLightColor * lambertTerm;
}

float distance = length(uLightPosition - vertexPositionEye3);
float attenuation = 1.0 / (1.0 + uLinear*distance + uQuadratic*distance*distance);

vLightWeighting = (ambient + diffuse + specular) * attenuation;

gl_Position = uPMatrix * vertexPositionEye4;
}
`;

export const gouraudFS = `
precision mediump float;
varying vec3 vLightWeighting;
void main(void){
gl_FragColor = vec4(vLightWeighting,1.0);
}
`;

export const phongVS = `
attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;

varying vec3 vNormal;
varying vec3 vPosition;

void main(void){
vec4 pos = uMVMatrix * vec4(aVertexPosition,1.0);
vPosition = pos.xyz;
vNormal = normalize(uNMatrix * aVertexNormal);
gl_Position = uPMatrix * pos;
}
`;

export const phongFS = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uLightPosition;
uniform vec3 uAmbientLightColor;
uniform vec3 uDiffuseLightColor;
uniform vec3 uSpecularLightColor;

uniform float uLinear;
uniform float uQuadratic;
uniform int uLightingModel;

const float shininess = 16.0;

void main(void){

vec3 normal = normalize(vNormal);
vec3 lightDir = normalize(uLightPosition - vPosition);

float lambertTerm = max(dot(normal, lightDir),0.0);

vec3 ambient = uAmbientLightColor;
vec3 diffuse = uDiffuseLightColor * lambertTerm;
vec3 specular = vec3(0.0);

if(uLightingModel == 1){
    vec3 viewDir = normalize(-vPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(reflectDir, viewDir),0.0), shininess);
    specular = uSpecularLightColor * spec;
}
if(uLightingModel == 2){
    vec3 viewDir = normalize(-vPosition);
    vec3 halfway = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfway),0.0), shininess);
    specular = uSpecularLightColor * spec;
}
if(uLightingModel == 3){
    if(lambertTerm > 0.75) lambertTerm = 1.0;
    else if(lambertTerm > 0.5) lambertTerm = 0.7;
    else if(lambertTerm > 0.25) lambertTerm = 0.4;
    else lambertTerm = 0.2;
    diffuse = uDiffuseLightColor * lambertTerm;
}
if(uLightingModel == 4){
    vec3 viewDir = normalize(-vPosition);
    vec3 h = normalize(lightDir + viewDir);

    float hn = max(dot(normal, h), 0.0001);
    float hn2 = hn * hn;

    float k = 10.0;
    float spec = exp(-k * (1.0 - hn2) / hn2);

    specular = uSpecularLightColor * spec;
}
if(uLightingModel == 5){
    vec3 viewDir = normalize(-vPosition);

    float nl = max(dot(normal, lightDir), 0.0);
    float nv = max(dot(normal, viewDir), 0.0);

    vec3 lProj = normalize(lightDir - normal * nl);
    vec3 vProj = normalize(viewDir - normal * nv);

    float cx = max(dot(lProj, vProj), 0.0);

    float cosAlpha = max(nl, nv);
    float cosBeta  = min(nl, nv);

    float dx = sqrt((1.0 - cosAlpha*cosAlpha)*(1.0 - cosBeta*cosBeta)) / max(cosBeta, 0.001);

    float a = 0.7;
    float b = 0.3;

    diffuse = uDiffuseLightColor * nl * (a + b * cx * dx);
}
if(uLightingModel == 6){
    vec3 viewDir = normalize(-vPosition);
    vec3 h = normalize(lightDir + viewDir);

    float nl = max(dot(normal, lightDir), 0.0);
    float nv = max(dot(normal, viewDir), 0.0);
    float nh = max(dot(normal, h), 0.0);
    float vh = max(dot(viewDir, h), 0.0);

    float roughness = 0.5;
    float r2 = roughness * roughness;

    float nh2 = nh * nh;
    float D = exp(-(1.0 - nh2)/(nh2 * r2)) / (r2 * nh2 * nh2 + 0.0001);

    float F = pow(1.0 - nv, 5.0);
    float k = roughness / 2.0;
    float G = min(1.0, min((2.0*nh*nv)/vh, (2.0*nh*nl)/vh));

    float spec = (D * F * G) / max(nv, 0.001);

    specular = uSpecularLightColor * spec;
}
if(uLightingModel == 7){
    vec3 viewDir = normalize(-vPosition);

    float nl = max(dot(normal, lightDir), 0.0);
    float nv = max(dot(normal, viewDir), 0.0);

    float k = 0.8;

    float d1 = pow(nl, 1.0 + k);
    float d2 = pow(1.0 - nv, 1.0 - k);

    diffuse = uDiffuseLightColor * d1 * d2;
}

float distance = length(uLightPosition - vPosition);
float attenuation = 1.0 / (1.0 + uLinear*distance + uQuadratic*distance*distance);

vec3 finalColor = (ambient + diffuse + specular) * attenuation;

gl_FragColor = vec4(finalColor,1.0);
}
`;