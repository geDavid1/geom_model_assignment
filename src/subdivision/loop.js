import { subdivide } from './subdivide.js';
import { getOneRing } from '../halfedge.js';

/**
 * Loop Subdivision Scheme
 * Approximating scheme for triangular meshes (C2 quartic splines on regular vertices).
 * 
 * @param {import('../halfedge.js').DCEL} dcel
 * @returns {import('../halfedge.js').DCEL}
 */
export function loop(dcel) {
  return subdivide(dcel, {
    edgePoint(he) {
      const v0 = he.origin.position;
      const v1 = he.twin.origin.position;

      // Boundary edge: midpoint
      if (!he.face || !he.twin || !he.twin.face) {
        return [
          0.5 * (v0[0] + v1[0]),
          0.5 * (v0[1] + v1[1]),
          0.5 * (v0[2] + v1[2])
        ];
      }

      // Interior edge: 3/8 endpoints + 1/8 opposite vertices
      const v2 = he.prev.origin.position;
      const v3 = he.twin.prev.origin.position;

      return [
        (3 / 8) * (v0[0] + v1[0]) + (1 / 8) * (v2[0] + v3[0]),
        (3 / 8) * (v0[1] + v1[1]) + (1 / 8) * (v2[1] + v3[1]),
        (3 / 8) * (v0[2] + v1[2]) + (1 / 8) * (v2[2] + v3[2])
      ];
    },

    vertexPoint(v) {
      const { neighbors, valence, isBoundary, boundaryNeighbors } = getOneRing(v);
      const pos = v.position;

      // Boundary vertex: 3/4 self + 1/8 each boundary neighbor
      if (isBoundary && boundaryNeighbors.length >= 2) {
        const b1 = boundaryNeighbors[0].position;
        const b2 = boundaryNeighbors[1].position;
        return [
          0.75 * pos[0] + 0.125 * (b1[0] + b2[0]),
          0.75 * pos[1] + 0.125 * (b1[1] + b2[1]),
          0.75 * pos[2] + 0.125 * (b1[2] + b2[2])
        ];
      }

      const n = valence;
      if (n === 0) return [...pos];

      // Warren's beta weights
      const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
      const selfWeight = 1 - n * beta;

      let x = selfWeight * pos[0];
      let y = selfWeight * pos[1];
      let z = selfWeight * pos[2];

      for (const nb of neighbors) {
        x += beta * nb.position[0];
        y += beta * nb.position[1];
        z += beta * nb.position[2];
      }

      return [x, y, z];
    }
  });
}
