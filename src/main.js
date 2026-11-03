import { Viewer } from './viewer.js';
import { Controls } from './controls.js';
import { parseOBJ } from './loader.js';
import { buildDCEL, verifyDCEL } from './halfedge.js';
import { dcelToBufferGeometry } from './meshAdapter.js';
import { loop, butterfly } from './subdivision/index.js';

let currentDCEL = null;
let currentShading = 'flat';
let subdivisionLevel = 0;

const canvas = document.getElementById('viewport');
const uiPanel = document.getElementById('ui-panel');

const viewer = new Viewer(canvas);

function loadMeshFromObjText(objText, fitCamera = true) {
  try {
    const { positions, faceIndices } = parseOBJ(objText);
    if (positions.length === 0 || faceIndices.length === 0) {
      alert('Failed to parse OBJ file: No vertices or faces found.');
      return;
    }

    // Reset subdivision level on new mesh load
    subdivisionLevel = 0;
    controls.updateSubdivLevel(subdivisionLevel);

    // Build & verify DCEL
    currentDCEL = buildDCEL(positions, faceIndices);
    const verification = verifyDCEL(currentDCEL);

    console.log('DCEL Verification Result:', verification);
    if (!verification.valid) {
      console.warn('DCEL verification warnings/errors:', verification.errors);
    }

    // Generate Three.js BufferGeometry
    const geometry = dcelToBufferGeometry(currentDCEL, currentShading);
    viewer.setMesh(geometry, fitCamera);

    // Update Controls Stats
    controls.updateStats({
      vertexCount: verification.stats.vertexCount,
      faceCount: verification.stats.faceCount,
      halfEdgeCount: verification.stats.halfEdgeCount,
      valid: verification.valid,
      errors: verification.errors
    });
  } catch (err) {
    console.error('Error processing mesh:', err);
    alert(`Error processing mesh: ${err.message}`);
  }
}

const controls = new Controls(uiPanel, {
  onShadingChange: (mode) => {
    currentShading = mode;
    viewer.setShading(mode);
    if (currentDCEL) {
      // Re-generate geometry with appropriate normals
      const geometry = dcelToBufferGeometry(
        currentDCEL,
        mode === 'smooth' ? 'smooth' : 'flat'
      );
      viewer.setMesh(geometry, false);
    }
  },
  onWireframeToggle: (visible) => {
    viewer.setWireframe(visible);
  },
  onSubdivide: (scheme) => {
    if (!currentDCEL) return;
    if (subdivisionLevel >= 5) {
      if (!confirm(`Current subdivision level is ${subdivisionLevel} (${currentDCEL.faces.length.toLocaleString()} faces). Another subdivision will create ${ (currentDCEL.faces.length * 4).toLocaleString() } faces. Continue?`)) {
        return;
      }
    }

    try {
      const schemeFn = scheme === 'butterfly' ? butterfly : loop;
      currentDCEL = schemeFn(currentDCEL);
      subdivisionLevel++;
      controls.updateSubdivLevel(subdivisionLevel);

      const verification = verifyDCEL(currentDCEL);
      console.log(`Subdivision [${scheme}] level ${subdivisionLevel}:`, verification);

      const geometry = dcelToBufferGeometry(
        currentDCEL,
        currentShading === 'smooth' ? 'smooth' : 'flat'
      );
      viewer.setMesh(geometry, false);

      controls.updateStats({
        vertexCount: verification.stats.vertexCount,
        faceCount: verification.stats.faceCount,
        halfEdgeCount: verification.stats.halfEdgeCount,
        valid: verification.valid,
        errors: verification.errors
      });
    } catch (err) {
      console.error('Subdivision error:', err);
      alert(`Subdivision failed: ${err.message}`);
    }
  },
  onFileLoaded: (text, filename) => {
    console.log(`Loaded custom file: ${filename}`);
    loadMeshFromObjText(text, true);
  }
});

// Load default cube model
fetch('/models/cube.obj')
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.text();
  })
  .then((text) => loadMeshFromObjText(text, true))
  .catch((err) => console.error('Failed to load default cube:', err));
