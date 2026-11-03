/**
 * Lightweight OBJ Loader
 * Parses vertices and faces from Wavefront OBJ formatted strings.
 */

export function parseOBJ(objText) {
  const positions = [];
  const faceIndices = [];

  const lines = objText.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const type = parts[0];

    if (type === 'v') {
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        positions.push([x, y, z]);
      }
    } else if (type === 'f') {
      const vertIdxs = [];
      for (let i = 1; i < parts.length; i++) {
        const token = parts[i];
        if (!token) continue;
        // Handles v, v/vt, v/vt/vn, v//vn
        const vPart = token.split('/')[0];
        let idx = parseInt(vPart, 10);
        if (isNaN(idx)) continue;

        // OBJ indices are 1-based; negative numbers are relative
        if (idx < 0) {
          idx = positions.length + idx;
        } else {
          idx = idx - 1;
        }
        vertIdxs.push(idx);
      }

      // Triangulate n-gons using simple fan triangulation
      if (vertIdxs.length >= 3) {
        for (let i = 1; i < vertIdxs.length - 1; i++) {
          faceIndices.push([vertIdxs[0], vertIdxs[i], vertIdxs[i + 1]]);
        }
      }
    }
  }

  return { positions, faceIndices };
}
