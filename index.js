import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 10;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth orbit control

// Earth setup
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/8081_earthmap10k.jpg"),
  specularMap: loader.load("./textures/8081_earthspec10k.jpg"),
  bumpMap: loader.load("./textures/8081_earthbump10k.jpg"),
  bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/8081_earthlights10k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

// Moon setup
const moongeometry = new THREE.SphereGeometry(0.1, 32, 32);
const moonMaterial = new THREE.MeshPhongMaterial({
  roughness: 5,
  metalness: 0,
  map: loader.load("textures/moonmap4k.jpg"),
  bumpMap: loader.load("textures/moonbump4k.jpg"),
  bumpScale: 0.02,
});
const moonMesh = new THREE.Mesh(moongeometry, moonMaterial);
moonMesh.receiveShadow = true;
moonMesh.castShadow = true;
moonMesh.position.x = 2;

const moonPivot = new THREE.Object3D();
earthMesh.add(moonPivot);
moonPivot.add(moonMesh);

// Stars setup
const stars = getStarfield({ numStars: 2000 });
scene.add(stars);

// Sun object
const sunColor = new THREE.Color("#FDB813");
const sunGeometry = new THREE.IcosahedronGeometry(1, 15);
const sunMaterial = new THREE.MeshBasicMaterial({ color: sunColor });
const sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
sunSphere.position.set(-50, 20, -60);
scene.add(sunSphere);

// Sun Light setup
const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);  // Increased intensity
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

// Load the satellite model (Jason_3.glb)
const gltfLoader = new GLTFLoader();
gltfLoader.load('./Jason_3.glb', (gltf) => {
  const satellite = gltf.scene;

  // Scale down the satellite model
  satellite.scale.set(0.05, 0.05, 0.05);  // Adjust as needed for size

  // Create a pivot for the satellite
  const satellitePivot = new THREE.Object3D();
  earthGroup.add(satellitePivot); // Add satellitePivot to the Earth group

  // Position the satellite at a distance
  satellite.position.set(2, 0, 0);  // Position it at 2 units away on the x-axis
  satellitePivot.add(satellite); // Add the satellite to the pivot

  // Set the desired speed for the satellite
  const speed = 0.005; // Adjust this value to change the speed of orbit

  // Create a geometry and material for the red trail
  const trailLength = 100;  // Number of points for the trail
  const trailPositions = new Float32Array(trailLength * 3); // 3 coordinates per point (x, y, z)
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const trailLine = new THREE.Line(trailGeometry, trailMaterial);
  scene.add(trailLine);

  // Function to update the trail with the satellite's position
  function updateTrail() {
    // Get the satellite's current position
    const satellitePosition = new THREE.Vector3();
    satellite.getWorldPosition(satellitePosition);

    // Shift the trail positions
    for (let i = trailLength - 1; i > 0; i--) {
      trailPositions[i * 3] = trailPositions[(i - 1) * 3];
      trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
      trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
    }

    // Update the first position with the satellite's current position
    trailPositions[0] = satellitePosition.x;
    trailPositions[1] = satellitePosition.y;
    trailPositions[2] = satellitePosition.z;

    // Update the trail's geometry
    trailGeometry.attributes.position.needsUpdate = true;
  }

  // Animation for the satellite (orbit around Earth)
  function rotateSatellite() {
    satellitePivot.rotation.y += speed; // Rotate the pivot to orbit around Earth
    updateTrail(); // Update the trail with the satellite's position
  }

  // Include satellite rotation in animation loop
  function animate() {
    requestAnimationFrame(animate);

    earthMesh.rotation.y += 0.002;
    lightsMesh.rotation.y += 0.002;
    cloudsMesh.rotation.y += 0.0023;
    glowMesh.rotation.y += 0.002;
    stars.rotation.y -= 0.0002;

    // Moon rotation
    moonPivot.rotation.y -= 0.005;  // Moon rotation
    moonPivot.rotation.x = 0.5;     // Tilt the Moon's rotation

    // Rotate the satellite
    rotateSatellite();

    // Render scene
    renderer.render(scene, camera);

    controls.update(); // Smooth orbit control
  }

  // Start animation loop
  animate();
});

// Handle window resize
function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
