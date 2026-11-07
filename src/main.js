import * as THREE from 'three';
import './style.css';
import { criarNavegacao } from './navegacao.js';
import { carregarOBJ, carregarGLTF } from './modelos.js';
import { criarDiagnostico } from './diagnostico.js';
import { criarMapasChao } from './texturas.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// M2: habilita o cálculo de sombras
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// ---------- Cena ----------
const scene = new THREE.Scene();

const corCeu = new THREE.Color(0xe8b48a);
scene.background = corCeu;
scene.fog = new THREE.Fog(corCeu, 15, 60);

// ---------- Câmera ----------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.7, 5);

// ---------- Luzes (M2) ----------

// Iluminação geral do céu e do chão
const luzAmbiente = new THREE.HemisphereLight(0xffd9b3, 0x3a5a2a, 1.0);
scene.add(luzAmbiente);

// Sol de fim de tarde
const sol = new THREE.DirectionalLight(0xffb36b, 1.5);
sol.position.set(-15, 8, -10);
sol.castShadow = true;

sol.shadow.mapSize.set(2048, 2048);
sol.shadow.camera.left = -15;
sol.shadow.camera.right = 15;
sol.shadow.camera.top = 15;
sol.shadow.camera.bottom = -15;
sol.shadow.camera.near = 0.5;
sol.shadow.camera.far = 50;
sol.shadow.bias = -0.0005;

scene.add(sol);

// Luz pontual da fogueira
const luzFogueira = new THREE.PointLight(0xff7626, 4, 10);
luzFogueira.position.set(0, 1.5, -1.5);
scene.add(luzFogueira);

// ---------- Texturas procedurais do chão (M3) ----------
// A geração dos mapas fica em texturas.js

const mapasChao = criarMapasChao(renderer.capabilities.getMaxAnisotropy());

// ---------- Chão (M3) ----------

const geometriaChao = new THREE.PlaneGeometry(100, 100);

const materialChao = new THREE.MeshStandardMaterial({
  color: 0xffffff,

  // Textura de grama e terra
  map: mapasChao.texturaCor,

  // Mapa de relevo.
  // bumpScale baixo (ex.: 0.06) quase não aparece nas versões atuais
  // do Three.js; 2.0 deixa o relevo visível. Ajuste entre 1 e 3.
  bumpMap: mapasChao.texturaRelevo,
  bumpScale: 2.0,

  // Mapa de rugosidade
  roughnessMap: mapasChao.texturaRugosidade,
  roughness: 1.0,

  metalness: 0.0
});

const chao = new THREE.Mesh(geometriaChao, materialChao);
chao.rotation.x = -Math.PI / 2;
chao.receiveShadow = true;

scene.add(chao);

// ---------- Modelos ----------

const PASTA_SURVIVAL = '/models/survival/';

// Barraca: utiliza os materiais e a textura do arquivo MTL.
const configBarraca = {
  posicao: new THREE.Vector3(-3, 0, -4),
  escala: 2.5,
  rotacaoY: Math.PI / 6
};

carregarOBJ(scene, PASTA_SURVIVAL, 'tent', configBarraca);
carregarOBJ(scene, PASTA_SURVIVAL, 'tent-canvas', configBarraca);

// Fogueira
carregarOBJ(scene, PASTA_SURVIVAL, 'campfire-pit', {
  posicao: new THREE.Vector3(0, 0, -1.5),
  escala: 2.5
});

// ---------- Chamas da fogueira ----------
// Materiais emissivos: a chama "brilha" por conta própria,
// combinando com a luz laranja da PointLight da fogueira.

const chamas = new THREE.Group();

const geometriaChamaMaior = new THREE.ConeGeometry(0.18, 0.65, 6);
const materialChamaMaior = new THREE.MeshStandardMaterial({
  color: 0xff5a0a,
  emissive: 0xff4500,
  emissiveIntensity: 2.0,
  roughness: 0.6
});

const chamaMaior = new THREE.Mesh(geometriaChamaMaior, materialChamaMaior);
chamaMaior.position.set(0, 0.35, 0);
chamas.add(chamaMaior);

const geometriaChamaMenor = new THREE.ConeGeometry(0.12, 0.42, 6);
const materialChamaMenor = new THREE.MeshStandardMaterial({
  color: 0xffc12e,
  emissive: 0xffaa00,
  emissiveIntensity: 2.5,
  roughness: 0.6
});

const chamaMenor = new THREE.Mesh(geometriaChamaMenor, materialChamaMenor);
chamaMenor.position.set(0.08, 0.25, 0.03);
chamas.add(chamaMenor);

chamas.position.set(0, 0.25, -1.5);
scene.add(chamas);

// Tronco: utiliza os materiais PBR e mapas do glTF.
carregarGLTF(scene, '/models/tronco/tree_stump_01_1k.gltf', {
  nome: 'tronco',
  posicao: new THREE.Vector3(2, 0, -1),
  escala: 1,
  rotacaoY: Math.PI / 4
});

// Lanterna: utiliza os materiais e texturas do GLB.
carregarGLTF(scene, '/models/lanterna/Lantern.glb', {
  nome: 'lanterna',
  posicao: new THREE.Vector3(-5.5, 0, -1.5),
  escala: 0.1,
  rotacaoY: -Math.PI / 4
});

// ---------- Navegação ----------
const navegacao = criarNavegacao(camera, renderer.domElement);

// ---------- Modo diagnóstico ----------
const diagnostico = criarDiagnostico(scene, camera);

// ---------- Timer ----------
const timer = new THREE.Timer();
timer.connect(document);

// ---------- Redimensionamento ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop de renderização ----------
renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const delta = timer.getDelta();

  navegacao.atualizar(delta);

  // Movimento das chamas
  chamas.rotation.y += delta * 1.5;

  diagnostico.renderizar(renderer);
});