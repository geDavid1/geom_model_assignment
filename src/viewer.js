import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x18181b);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      1000
    );
    this.camera.position.set(3, 3, 4);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Lighting
    this.setupLighting();

    // Subtle grid helper
    this.grid = new THREE.GridHelper(10, 20, 0x444444, 0x282828);
    this.grid.position.y = -1;
    this.scene.add(this.grid);

    // Mesh state
    this.currentGeometry = null;
    this.solidMesh = null;
    this.wireframeMesh = null;
    this.shadingMode = 'flat';
    this.wireframeVisible = true;

    // Event listeners
    window.addEventListener('resize', () => this.onResize());

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x90b0e0, 0.4);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
  }

  createMaterial(mode) {
    if (mode === 'matcap') {
      return new THREE.MeshNormalMaterial({
        wireframe: false
      });
    }

    return new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: mode === 'flat',
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
  }

  setMesh(geometry, fitCamera = true) {
    this.currentGeometry = geometry;

    if (this.solidMesh) {
      this.scene.remove(this.solidMesh);
      if (this.solidMesh.material) this.solidMesh.material.dispose();
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      if (this.wireframeMesh.geometry) this.wireframeMesh.geometry.dispose();
      if (this.wireframeMesh.material) this.wireframeMesh.material.dispose();
      this.wireframeMesh = null;
    }

    const material = this.createMaterial(this.shadingMode);
    this.solidMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.solidMesh);

    // Wireframe overlay
    const wireGeo = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      linewidth: 1
    });
    this.wireframeMesh = new THREE.LineSegments(wireGeo, wireMat);
    this.wireframeMesh.visible = this.wireframeVisible;
    this.scene.add(this.wireframeMesh);

    if (fitCamera && geometry.boundingSphere) {
      this.fitCameraToSphere(geometry.boundingSphere);
    }
  }

  fitCameraToSphere(sphere) {
    const radius = sphere.radius || 1;
    const center = sphere.center || new THREE.Vector3(0, 0, 0);

    // Center scene grid slightly below model
    this.grid.position.y = center.y - radius;

    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(radius / Math.sin(fov / 2)) * 1.5;

    this.camera.position.set(center.x + distance * 0.7, center.y + distance * 0.5, center.z + distance * 0.7);
    this.controls.target.copy(center);
    this.camera.lookAt(center);
    this.controls.update();
  }

  setShading(mode) {
    this.shadingMode = mode;
    if (this.solidMesh) {
      const oldMat = this.solidMesh.material;
      this.solidMesh.material = this.createMaterial(mode);
      if (oldMat) oldMat.dispose();
    }
  }

  setWireframe(visible) {
    this.wireframeVisible = visible;
    if (this.wireframeMesh) {
      this.wireframeMesh.visible = visible;
    }
  }

  onResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.onResize();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
