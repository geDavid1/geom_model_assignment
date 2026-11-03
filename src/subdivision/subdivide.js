import { buildDCEL } from '../halfedge.js';

/**
 * Shared 1-to-4 triangle subdivision topology builder.
 * Computes updated vertex positions and edge points, then reconstructs a verified DCEL.
 * 
 * @param {import('../halfedge.js').DCEL} dcel
 * @param {Object} callbacks
 * @param {(he: import('../halfedge.js').HalfEdge) => [number, number, number]} callbacks.edgePoint
 * @param {(vertex: import('../halfedge.js').Vertex) => [number, number, number]} callbacks.vertexPoint
 * @returns {import('../halfedge.js').DCEL}
 */
export function subdivide(dcel, { edgePoint, vertexPoint }) {
  const newPositions = new Array(dcel.vertices.length);

  // 1. Compute new positions for existing vertices
  for (let i = 0; i < dcel.vertices.length; i++) {
    newPositions[i] = vertexPoint(dcel.vertices[i]);
  }

  // 2. Compute edge points (one per undirected edge)
  const edgeMap = new Map();

  for (const he of dcel.halfEdges) {
    if (!he.origin || !he.twin || !he.twin.origin) continue;
    const u = he.origin.id;
    const v = he.twin.origin.id;
    const key = u < v ? `${u}_${v}` : `${v}_${u}`;

    if (!edgeMap.has(key)) {
      // Pick the half-edge that has an incident face if possible
      const targetHE = he.face ? he : he.twin;
      const pt = edgePoint(targetHE);
      const newIndex = newPositions.length;
      newPositions.push(pt);
      edgeMap.set(key, newIndex);
    }
  }

  // 3. Build 4 new triangles for each original face
  const newFaces = [];

  for (const face of dcel.faces) {
    const verts = face.getVertices();
    if (verts.length !== 3) continue;

    const v0 = verts[0].id;
    const v1 = verts[1].id;
    const v2 = verts[2].id;

    const e01Key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
    const e12Key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
    const e20Key = v2 < v0 ? `${v2}_${v0}` : `${v0}_${v2}`;

    const e01 = edgeMap.get(e01Key);
    const e12 = edgeMap.get(e12Key);
    const e20 = edgeMap.get(e20Key);

    // 4 sub-triangles preserving CCW winding orientation
    newFaces.push([v0, e01, e20]);
    newFaces.push([e01, v1, e12]);
    newFaces.push([e20, e12, v2]);
    newFaces.push([e01, e12, e20]);
  }

  return buildDCEL(newPositions, newFaces);
}
