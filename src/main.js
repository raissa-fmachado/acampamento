import * as THREE from 'three';
import './style.css';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// limita o pixel ratio em 2 pra não pesar em telas de alta densidade
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Cena ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a8c9);

// ---------- Câmera ----------
// FOV de 75° (parecido com a visão humana)
// near = 0.1 e far = 200: a clareira tem ~40x40 unidades, então 200 cobre a cena
// com folga, sem desperdiçar precisão do z-buffer com um far muito grande
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.7, 5); // 1.7 = altura aproximada dos olhos de uma pessoa

// ---------- Cubo de teste ----------
// só pra confirmar que o pipeline está funcionando; vai sair nos próximos commits
const cubo = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial()
);
cubo.position.set(0, 0.5, 0);
scene.add(cubo);

// ---------- Redimensionamento ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // recalcula a matriz de projeção com o novo aspect
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop de renderização ----------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});