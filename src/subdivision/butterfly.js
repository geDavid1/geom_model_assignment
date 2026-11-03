import { subdivide } from './subdivide.js';

/**
 * Collects one-ring neighbors in cyclic order starting from a specific outgoing half-edge.
 * @param {import('../halfedge.js').HalfEdge} startHE
 * @returns {import('../halfedge.js').Vertex[]}
 */
function getOrderedRingFromEdge(startHE) {
  const ring = [];
  let curr = startHE;
  let count = 0;
  do {
    ring.push(curr.twin.origin);
    if (!curr.twin || !curr.twin.face) break;
    curr = curr.twin.next;
    count++;
  } while (curr && curr !== startHE && count < 100);
  return ring;
}

/**
 * Zorin/Schröder/Sweldens irregular vertex stencil for Modified Butterfly.
 * @param {import('../halfedge.js').Vertex} v
 * @param {import('../halfedge.js').Vertex[]} ring - Ordered 1-ring neighbors starting with edge target
 * @returns {[number, number, number]}
 */
function computeIrregularStencil(v, ring) {
  const K = ring.length;
  if (K === 0) return [...v.position];

  const s = new Float64Array(K);
  if (K === 3) {
    s[0] = 5 / 12;
    s[1] = -1 / 12;
    s[2] = -1 / 12;
  } else if (K === 4) {
    s[0] = 3 / 8;
    s[1] = 0;
    s[2] = -1 / 8;
    s[3] = 0;
  } else {
    for (let j = 0; j < K; j++) {
      s[j] = (1 / K) * (0.25 + Math.cos((2 * Math.PI * j) / K) + 0.5 * Math.cos((4 * Math.PI * j) / K));
    }
  }

  const vPos = v.position;
  let x = 0.75 * vPos[0];
  let y = 0.75 * vPos[1];
  let z = 0.75 * vPos[2];

  for (let j = 0; j < K; j++) {
    const p = ring[j].position;
    x += s[j] * p[0];
    y += s[j] * p[1];
    z += s[j] * p[2];
  }

  return [x, y, z];
}

/**
 * Modified Butterfly Subdivision Scheme
 * Interpolating scheme for triangular meshes (C1 continuous on arbitrary topology).
 * 
 * @param {import('../halfedge.js').DCEL} dcel
 * @returns {import('../halfedge.js').DCEL}
 */
export function butterfly(dcel) {
  return subdivide(dcel, {
    edgePoint(he) {
      const v0 = he.origin;
      const v1 = he.twin.origin;

      // Boundary edge: midpoint
      if (!he.face || !he.twin || !he.twin.face) {
        return [
          0.5 * (v0.position[0] + v1.position[0]),
          0.5 * (v0.position[1] + v1.position[1]),
          0.5 * (v0.position[2] + v1.position[2])
        ];
      }

      const ring0 = getOrderedRingFromEdge(he);
      const ring1 = getOrderedRingFromEdge(he.twin);

      const K0 = ring0.length;
      const K1 = ring1.length;

      // Case 1: Both endpoints regular (valence 6) - 8-point stencil
      if (K0 === 6 && K1 === 6) {
        const a = he.prev.origin.position;
        const b = he.twin.prev.origin.position;
        const c = ring0[2].position;
        const e = ring0[4].position;
        const f = ring1[2].position;
        const d = ring1[4].position;

        return [
          0.5 * (v0.position[0] + v1.position[0]) + 0.125 * (a[0] + b[0]) - 0.0625 * (c[0] + d[0] + e[0] + f[0]),
          0.5 * (v0.position[1] + v1.position[1]) + 0.125 * (a[1] + b[1]) - 0.0625 * (c[1] + d[1] + e[1] + f[1]),
          0.5 * (v0.position[2] + v1.position[2]) + 0.125 * (a[2] + b[2]) - 0.0625 * (c[2] + d[2] + e[2] + f[2])
        ];
      }

      // Case 2: One extraordinary, one regular
      if (K0 !== 6 && K1 === 6) {
        return computeIrregularStencil(v0, ring0);
      }
      if (K0 === 6 && K1 !== 6) {
        return computeIrregularStencil(v1, ring1);
      }

      // Case 3: Both extraordinary
      const p0 = computeIrregularStencil(v0, ring0);
      const p1 = computeIrregularStencil(v1, ring1);
      return [
        0.5 * (p0[0] + p1[0]),
        0.5 * (p0[1] + p1[1]),
        0.5 * (p0[2] + p1[2])
      ];
    },

    vertexPoint(v) {
      // Interpolating property: existing vertices do NOT move
      return [...v.position];
    }
  });
}
