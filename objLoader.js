export async function loadOBJ(gl, url) {
    const response = await fetch(url);
    const text = await response.text();

    const tempPositions = [];
    const tempNormals = [];
    const tempUVs = [];

    const outPositions = [];
    const outNormals = [];
    const outUVs = [];

    function parseIndex(token, arrayLength) {
        if (!token) return undefined;
        const idx = parseInt(token, 10);
        if (isNaN(idx)) return undefined;
        return idx < 0 ? arrayLength + idx : idx - 1;
    }

    const lines = text.split(/\r?\n/);
    for (let raw of lines) {
        const line = raw.trim();
        if (line === "" || line.startsWith("#")) continue;
        const parts = line.split(/\s+/);
        if (parts[0] === "v") {
            tempPositions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        } else if (parts[0] === "vn") {
            tempNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        } else if (parts[0] === "vt") {
            tempUVs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
        } else if (parts[0] === "f") {
            const tokens = parts.slice(1);
            for (let i = 1; i < tokens.length - 1; i++) {
                const tri = [tokens[0], tokens[i], tokens[i + 1]];
                for (let t of tri) {
                    const comps = t.split("/");
                    const pIdx = parseIndex(comps[0], tempPositions.length);
                    const vtIdx = comps.length > 1 && comps[1] !== "" ? parseIndex(comps[1], tempUVs.length) : undefined;
                    const vnIdx = comps.length > 2 && comps[2] !== "" ? parseIndex(comps[2], tempNormals.length) : undefined;

                    const pos = tempPositions[pIdx];
                    outPositions.push(pos[0], pos[1], pos[2]);

                    if (vnIdx !== undefined) {
                        const n = tempNormals[vnIdx];
                        outNormals.push(n[0], n[1], n[2]);
                    } else {
                        outNormals.push(0, 0, 0);
                    }

                    if (vtIdx !== undefined) {
                        const uv = tempUVs[vtIdx];
                        outUVs.push(uv[0], uv[1]);
                    } else {
                        outUVs.push(0, 0);
                    }
                }
            }
        }
    }

    let needNormals = false;
    for (let i = 0; i < outNormals.length; i++) {
        if (outNormals[i] !== 0) { needNormals = false; break; }
        needNormals = true;
    }

    if (needNormals) {
        const accum = new Float32Array(outNormals.length);
        for (let i = 0; i < outPositions.length; i += 9) {
            const v0 = [outPositions[i], outPositions[i + 1], outPositions[i + 2]];
            const v1 = [outPositions[i + 3], outPositions[i + 4], outPositions[i + 5]];
            const v2 = [outPositions[i + 6], outPositions[i + 7], outPositions[i + 8]];

            const ux = v1[0] - v0[0], uy = v1[1] - v0[1], uz = v1[2] - v0[2];
            const vx = v2[0] - v0[0], vy = v2[1] - v0[1], vz = v2[2] - v0[2];
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;
            const len = Math.hypot(nx, ny, nz) || 1.0;
            nx /= len; ny /= len; nz /= len;

            for (let j = 0; j < 3; j++) {
                const off = i + j * 3;
                accum[off] += nx; accum[off + 1] += ny; accum[off + 2] += nz;
            }
        }
        for (let i = 0; i < accum.length; i += 3) {
            const nx = accum[i], ny = accum[i + 1], nz = accum[i + 2];
            const l = Math.hypot(nx, ny, nz) || 1.0;
            outNormals[i] = nx / l; outNormals[i + 1] = ny / l; outNormals[i + 2] = nz / l;
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outPositions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(outNormals), gl.STATIC_DRAW);

    return {
        positionBuffer,
        normalBuffer,
        vertexCount: outPositions.length / 3,
        position: [0, 0, 0]
    };
}