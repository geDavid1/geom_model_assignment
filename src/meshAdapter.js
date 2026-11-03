import * as THREE from 'three';

/**
 * Converts a DCEL mesh into a THREE.BufferGeometry.
 * Uses DCEL traversal for smooth normal calculation.
 * 
 * @param {import('./halfedge.js').DCEL} dcel
 * @param {'flat' | 'smooth'} shading
 * @returns {THREE.BufferGeometry}
 */
export function dcelToBufferGeometry(dcel, shading = 'flat') {
  const geometry = new THREE.BufferGeometry();

  if (shading === 'flat') {
    // For flat shading, unshared vertices per face triangle ensure crisp face normals
    const positions = [];
    const normals = [];

    for (const face of dcel.faces) {
      const verts = face.getVertices();
      if (verts.length < 3) continue;

      // Calculate face normal
      const p0 = new THREE.Vector3(...verts[0].position);
      const p1 = new THREE.Vector3(...verts[1].position);
      const p2 = new THREE.Vector3(...verts[2].position);

      const vA = new THREE.Vector3().subVectors(p1, p0);
      const vB = new THREE.Vector3().subVectors(p2, p0);
      const faceNormal = new THREE.Vector3().crossVectors(vA, vB).normalize();

      // Triangles (fan if face had > 3 vertices)
      for (let i = 1; i < verts.length - 1; i++) {
        const tri = [verts[0], verts[i], verts[i + 1]];
        for (const v of tri) {
          positions.push(v.position[0], v.position[1], v.position[2]);
          normals.push(faceNormal.x, faceNormal.y, faceNormal.z);
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  } else {
    // Smooth shading: shared vertices with area-weighted averaged normals via DCEL
    const posArray = new Float32Array(dcel.vertices.length * 3);
    const normArray = new Float32Array(dcel.vertices.length * 3);
    const vertexNormals = dcel.vertices.map(() => new THREE.Vector3(0, 0, 0));

    // Fill positions
    for (let i = 0; i < dcel.vertices.length; i++) {
      const pos = dcel.vertices[i].position;
      posArray[i * 3] = pos[0];
      posArray[i * 3 + 1] = pos[1];
      posArray[i * 3 + 2] = pos[2];
    }

    // Accumulate area-weighted face normals into each incident vertex
    const indices = [];
    for (const face of dcel.faces) {
      const verts = face.getVertices();
      if (verts.length < 3) continue;

      const p0 = new THREE.Vector3(...verts[0].position);
      const p1 = new THREE.Vector3(...verts[1].position);
      const p2 = new THREE.Vector3(...verts[2].position);

      const vA = new THREE.Vector3().subVectors(p1, p0);
      const vB = new THREE.Vector3().subVectors(p2, p0);
      const cross = new THREE.Vector3().crossVectors(vA, vB); // length is 2x face area

      for (const v of verts) {
        vertexNormals[v.id].add(cross);
      }

      for (let i = 1; i < verts.length - 1; i++) {
        indices.push(verts[0].id, verts[i].id, verts[i + 1].id);
      }
    }

    // Normalize vertex normals
    for (let i = 0; i < dcel.vertices.length; i++) {
      const n = vertexNormals[i].normalize();
      normArray[i * 3] = n.x;
      normArray[i * 3 + 1] = n.y;
      normArray[i * 3 + 2] = n.z;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normArray, 3));
    geometry.setIndex(indices);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
