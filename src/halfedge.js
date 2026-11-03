/**
 * Half-Edge (DCEL) Data Structure
 */

export class Vertex {
  constructor(id, position) {
    this.id = id;
    this.position = position; // [x, y, z]
    this.halfEdge = null;     // An outgoing half-edge
  }
}

export class Face {
  constructor(id) {
    this.id = id;
    this.halfEdge = null;     // One half-edge bordering this face
  }

  /**
   * Returns array of vertices for this face in order.
   */
  getVertices() {
    const vertices = [];
    let curr = this.halfEdge;
    if (!curr) return vertices;
    do {
      vertices.push(curr.origin);
      curr = curr.next;
    } while (curr && curr !== this.halfEdge);
    return vertices;
  }

  /**
   * Returns array of half-edges around this face.
   */
  getHalfEdges() {
    const edges = [];
    let curr = this.halfEdge;
    if (!curr) return edges;
    do {
      edges.push(curr);
      curr = curr.next;
    } while (curr && curr !== this.halfEdge);
    return edges;
  }
}

export class HalfEdge {
  constructor(id) {
    this.id = id;
    this.origin = null; // Vertex where the half-edge starts
    this.face = null;   // Face this half-edge borders (null for outer boundary)
    this.next = null;   // Next half-edge around face
    this.prev = null;   // Previous half-edge around face
    this.twin = null;   // Opposite half-edge
  }

  get target() {
    return this.next ? this.next.origin : (this.twin ? this.twin.origin : null);
  }
}

export class DCEL {
  constructor() {
    this.vertices = [];
    this.faces = [];
    this.halfEdges = [];
  }
}

/**
 * Builds a DCEL from vertex positions and face indices.
 * @param {Array<[number, number, number]>} positions
 * @param {Array<Array<number>>} faceIndices
 * @returns {DCEL}
 */
export function buildDCEL(positions, faceIndices) {
  const dcel = new DCEL();
  let heIdCounter = 0;

  // 1. Create vertices
  for (let i = 0; i < positions.length; i++) {
    dcel.vertices.push(new Vertex(i, positions[i]));
  }

  // Edge map to pair twins: "min_max" -> HalfEdge
  const edgeMap = new Map();

  // 2. Create faces and face half-edges
  for (let fIdx = 0; fIdx < faceIndices.length; fIdx++) {
    const fVerts = faceIndices[fIdx];
    if (fVerts.length < 3) continue;

    const face = new Face(fIdx);
    dcel.faces.push(face);

    const faceHalfEdges = [];
    for (let i = 0; i < fVerts.length; i++) {
      const vOrigin = dcel.vertices[fVerts[i]];
      const he = new HalfEdge(heIdCounter++);
      he.origin = vOrigin;
      he.face = face;
      if (!vOrigin.halfEdge) {
        vOrigin.halfEdge = he;
      }
      faceHalfEdges.push(he);
      dcel.halfEdges.push(he);
    }

    face.halfEdge = faceHalfEdges[0];

    // Link next and prev within this face
    const len = faceHalfEdges.length;
    for (let i = 0; i < len; i++) {
      const curr = faceHalfEdges[i];
      const next = faceHalfEdges[(i + 1) % len];
      curr.next = next;
      next.prev = curr;

      // Register in edgeMap to find twins
      const u = curr.origin.id;
      const v = next.origin.id;
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;

      if (edgeMap.has(key)) {
        const other = edgeMap.get(key);
        curr.twin = other;
        other.twin = curr;
      } else {
        edgeMap.set(key, curr);
      }
    }
  }

  // 3. Handle boundary edges (half-edges without twins)
  // For open meshes, create virtual boundary half-edges with face = null
  for (const [key, he] of edgeMap.entries()) {
    if (!he.twin) {
      const boundaryHe = new HalfEdge(heIdCounter++);
      boundaryHe.origin = he.target;
      boundaryHe.face = null;
      boundaryHe.twin = he;
      he.twin = boundaryHe;
      dcel.halfEdges.push(boundaryHe);
    }
  }

  return dcel;
}

/**
 * Validates a DCEL structure and returns diagnostic results.
 * @param {DCEL} dcel
 * @returns {{ valid: boolean, errors: string[], stats: object }}
 */
export function verifyDCEL(dcel) {
  const errors = [];

  // Check vertices
  for (const v of dcel.vertices) {
    if (!v.halfEdge) {
      errors.push(`Vertex ${v.id} has no incident halfEdge.`);
    } else if (v.halfEdge.origin !== v) {
      errors.push(`Vertex ${v.id} outgoing halfEdge has mismatched origin (${v.halfEdge.origin?.id}).`);
    }
  }

  // Check half-edges
  for (const he of dcel.halfEdges) {
    if (!he.origin) {
      errors.push(`HalfEdge ${he.id} missing origin vertex.`);
    }
    if (!he.twin) {
      errors.push(`HalfEdge ${he.id} has no twin.`);
    } else if (he.twin.twin !== he) {
      errors.push(`HalfEdge ${he.id} twin pairing is asymmetrical.`);
    }
    if (he.face) {
      if (!he.next || !he.prev) {
        errors.push(`HalfEdge ${he.id} in face ${he.face.id} is missing next/prev pointer.`);
      } else if (he.next.prev !== he) {
        errors.push(`HalfEdge ${he.id}.next.prev does not loop back.`);
      }
    }
  }

  // Check faces
  for (const f of dcel.faces) {
    if (!f.halfEdge) {
      errors.push(`Face ${f.id} has no starting halfEdge.`);
      continue;
    }
    let count = 0;
    let curr = f.halfEdge;
    const visited = new Set();
    while (curr) {
      if (visited.has(curr)) {
        break;
      }
      visited.add(curr);
      if (curr.face !== f) {
        errors.push(`Face ${f.id} contains halfEdge ${curr.id} pointing to wrong face (${curr.face?.id}).`);
      }
      curr = curr.next;
      count++;
      if (count > 10000) {
        errors.push(`Face ${f.id} has an infinite or overly large loop (>10000 edges).`);
        break;
      }
    }
    if (curr !== f.halfEdge) {
      errors.push(`Face ${f.id} halfEdge loop is not closed.`);
    }
  }

  const boundaryEdgeCount = dcel.halfEdges.filter(he => he.face === null).length;

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      vertexCount: dcel.vertices.length,
      faceCount: dcel.faces.length,
      halfEdgeCount: dcel.halfEdges.length,
      boundaryEdges: boundaryEdgeCount
    }
  };
}

/**
 * Collects the one-ring neighborhood of a vertex using DCEL traversal.
 * Handles both closed manifolds and boundary vertices.
 * 
 * @param {Vertex} vertex
 * @returns {{
 *   neighbors: Vertex[],
 *   valence: number,
 *   isBoundary: boolean,
 *   boundaryNeighbors: Vertex[]
 * }}
 */
export function getOneRing(vertex) {
  let curr = vertex.halfEdge;
  if (!curr) {
    return { neighbors: [], valence: 0, isBoundary: false, boundaryNeighbors: [] };
  }

  // If the starting halfedge has no face (outer boundary), use twin
  if (!curr.face && curr.twin) {
    curr = curr.twin;
  }

  let start = curr;
  let isBoundary = false;

  // Rewind as far as possible using prev.twin to reach the boundary start (if on boundary)
  while (curr.face && curr.prev && curr.prev.twin && curr.prev.twin.face) {
    curr = curr.prev.twin;
    if (curr === start) break; // full loop (interior vertex)
  }

  if (!curr.prev || !curr.prev.twin || !curr.prev.twin.face) {
    isBoundary = true;
  }

  const neighbors = [];
  const startHE = curr;
  let he = startHE;
  let count = 0;

  if (isBoundary) {
    // For boundary vertex, first neighbor is the origin of incoming boundary edge
    if (he.prev) {
      neighbors.push(he.prev.origin);
    }
    while (he && count++ < 500) {
      neighbors.push(he.twin.origin);
      if (!he.twin || !he.twin.face) break;
      he = he.twin.next;
    }
  } else {
    // Interior vertex: full cyclic loop
    while (count++ < 500) {
      neighbors.push(he.twin.origin);
      he = he.twin.next;
      if (!he || he === startHE) break;
    }
  }

  return {
    neighbors,
    valence: neighbors.length,
    isBoundary,
    boundaryNeighbors: isBoundary && neighbors.length >= 2 ? [neighbors[0], neighbors[neighbors.length - 1]] : []
  };
}
