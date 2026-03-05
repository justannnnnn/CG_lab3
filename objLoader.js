async function loadOBJ(gl, url) {

    const response = await fetch(url);
    const text = await response.text();

    const positions = [];
    const normals = [];

    const tempPositions = [];
    const tempNormals = [];

    const lines = text.split("\n");

    for (let line of lines) {

        line = line.trim();
        const parts = line.split(/\s+/);

        if (parts[0] === "v") {
            tempPositions.push([
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            ]);
        }

        else if (parts[0] === "vn") {
            tempNormals.push([
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            ]);
        }

        else if (parts[0] === "f") {

            // триангуляция через fan method
            for (let i = 2; i < parts.length - 1; i++) {

                const verts = [parts[1], parts[i], parts[i + 1]];

                for (let v of verts) {

                    const indices = v.split("/");

                    const positionIndex = parseInt(indices[0]) - 1;
                    const normalIndex = indices[2] ? parseInt(indices[2]) - 1 : positionIndex;

                    const pos = tempPositions[positionIndex];
                    const norm = tempNormals[normalIndex] || [0, 0, 1];

                    positions.push(...pos);
                    normals.push(...norm);
                }
            }
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    return {
        positionBuffer: positionBuffer,
        normalBuffer: normalBuffer,
        vertexCount: positions.length / 3,
        position: [0, 0, 0]
    };
}