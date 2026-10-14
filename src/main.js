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

// NOVO: céu de fim de tarde
// por enquanto é só uma cor de fundo; depois dá pra trocar por skybox/HDRI
const corCeu = new THREE.Color(0xe8b48a);
scene.background = corCeu;

// NOVO: neblina com a mesma cor do céu
// os objetos mais longe vão "sumindo" no céu, o que esconde a borda do chão
// Fog(cor, near, far): começa a aparecer a 15 unidades e cobre tudo a 60
scene.fog = new THREE.Fog(corCeu, 15, 60);

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

// ---------- NOVO: Chão ----------
// PlaneGeometry nasce "em pé" no plano XY, então giramos -90° no eixo X
// pra ele ficar deitado no plano XZ (o chão)
const geometriaChao = new THREE.PlaneGeometry(40, 40);
// MeshBasicMaterial não depende de luz; vai virar MeshStandardMaterial
// quando a iluminação entrar (e ganhar textura no M3)
const materialChao = new THREE.MeshBasicMaterial({ color: 0x4f7a3a });
const chao = new THREE.Mesh(geometriaChao, materialChao);
chao.rotation.x = -Math.PI / 2;
scene.add(chao);

// ---------- Cubo de teste ----------
// só pra confirmar que o pipeline está funcionando; vai sair quando os modelos entrarem
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