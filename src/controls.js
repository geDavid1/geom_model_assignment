/**
 * UI Controls Panel
 */

export class Controls {
  constructor(containerElement, callbacks = {}) {
    this.container = containerElement;
    this.callbacks = callbacks;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <h1>Mesh Controls</h1>
      
      <div class="control-group">
        <label for="model-file">Load OBJ File</label>
        <input type="file" id="model-file" accept=".obj" />
      </div>

      <div class="control-group">
        <label for="shading-select">Shading Mode</label>
        <select id="shading-select">
          <option value="flat" selected>Flat Shading</option>
          <option value="smooth">Smooth Shading</option>
          <option value="matcap">Normal / Matcap</option>
        </select>
      </div>

      <div class="control-row">
        <label for="wireframe-toggle">Show Wireframe</label>
        <input type="checkbox" id="wireframe-toggle" checked />
      </div>

      <div id="stats">
        <strong>Mesh Stats:</strong><br />
        <span id="stat-verts">Vertices: 0</span><br />
        <span id="stat-faces">Faces: 0</span><br />
        <span id="stat-edges">Half-Edges: 0</span><br />
        <span id="stat-valid">DCEL: Checking...</span>
      </div>
    `;

    // Hook listeners
    const fileInput = this.container.querySelector('#model-file');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (this.callbacks.onFileLoaded) {
          this.callbacks.onFileLoaded(event.target.result, file.name);
        }
      };
      reader.readAsText(file);
    });

    const shadingSelect = this.container.querySelector('#shading-select');
    shadingSelect.addEventListener('change', (e) => {
      if (this.callbacks.onShadingChange) {
        this.callbacks.onShadingChange(e.target.value);
      }
    });

    const wireframeToggle = this.container.querySelector('#wireframe-toggle');
    wireframeToggle.addEventListener('change', (e) => {
      if (this.callbacks.onWireframeToggle) {
        this.callbacks.onWireframeToggle(e.target.checked);
      }
    });
  }

  updateStats({ vertexCount, faceCount, halfEdgeCount, valid, errors }) {
    const statVerts = this.container.querySelector('#stat-verts');
    const statFaces = this.container.querySelector('#stat-faces');
    const statEdges = this.container.querySelector('#stat-edges');
    const statValid = this.container.querySelector('#stat-valid');

    if (statVerts) statVerts.textContent = `Vertices: ${vertexCount.toLocaleString()}`;
    if (statFaces) statFaces.textContent = `Faces: ${faceCount.toLocaleString()}`;
    if (statEdges) statEdges.textContent = `Half-Edges: ${halfEdgeCount.toLocaleString()}`;
    if (statValid) {
      if (valid) {
        statValid.innerHTML = `<span style="color: #4ade80;">DCEL: Valid & Verified</span>`;
      } else {
        statValid.innerHTML = `<span style="color: #f87171;">DCEL: Invalid (${errors.length} errors)</span>`;
      }
    }
  }
}
