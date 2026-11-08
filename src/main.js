import * as THREE from 'three';
import './style.css';
import { criarNavegacao } from './navegacao.js';
import { carregarOBJ, carregarGLTF } from './modelos.js';
import { criarDiagnostico } from './diagnostico.js';
import { criarMapasChao, criarMapasPedra, criarMapasMadeira } from './texturas.js';
import { aplicarUVCaixa } from './uv.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// M2: habilita o cálculo de sombras
renderer.shadowMap.enabled = true;
// PCFShadowMap: filtra a borda da sombra (sombra suave).
// O PCFSoftShadowMap foi removido nas versões novas do Three.js
// (gerava um aviso no console e já caía no PCFShadowMap).
renderer.shadowMap.type = THREE.PCFShadowMap;

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
// M3: o tecido da barraca passa a usar material PBR
// (MeshStandardMaterial) em vez do Phong do MTLLoader,
// reaproveitando o mapa de cor original e com rugosidade alta (tecido fosco).
carregarOBJ(scene, PASTA_SURVIVAL, 'tent-canvas', {
  ...configBarraca,
  prepararMalha: (malha) => {
    malha.material = new THREE.MeshStandardMaterial({
      map: malha.material.map,
      roughness: 0.95,
      metalness: 0.0
    });
  }
});

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

// ---------- Pedras (M3) ----------
// Material de pedra: PBR com os três mapas procedurais.
// roughness = 1 multiplica o roughnessMap (o valor final vem do mapa).
// metalness = 0: pedra é um dielétrico (não metal).
const mapasPedra = criarMapasPedra(renderer.capabilities.getMaxAnisotropy());

const materialPedra = new THREE.MeshStandardMaterial({
  map: mapasPedra.texturaCor,
  bumpMap: mapasPedra.texturaRelevo,
  bumpScale: 3.0,
  roughnessMap: mapasPedra.texturaRugosidade,
  roughness: 1.0,
  metalness: 0.0
});

// As pedras usam a geometria da Kenney, mas com UVs novas (projeção em caixa)
// e o material de pedra no lugar da paleta de cores original.
function prepararPedra(malha) {
  malha.geometry = aplicarUVCaixa(malha.geometry, 2);
  malha.material = materialPedra;
}

const pedras = [
  { nome: 'rock-a', posicao: [-6, 0, -6], escala: 3, rotacaoY: 0.4 },
  { nome: 'rock-b', posicao: [5, 0, -6], escala: 4, rotacaoY: 1.2 },
  { nome: 'rock-c', posicao: [6.5, 0, 2], escala: 2.5, rotacaoY: 2.1 },
  { nome: 'rock-a', posicao: [-7, 0, 3], escala: 2, rotacaoY: 3.0 },
  { nome: 'rock-b', posicao: [1.5, 0, -7], escala: 2, rotacaoY: 0.8 }
];

pedras.forEach(({ nome, posicao, escala, rotacaoY }) => {
  carregarOBJ(scene, PASTA_SURVIVAL, nome, {
    posicao: new THREE.Vector3(...posicao),
    escala,
    rotacaoY,
    prepararMalha: prepararPedra
  });
});

// ---------- Toras de madeira (bancos da fogueira) (M3) ----------
// Mesma ideia das pedras: geometria da Kenney + UVs em caixa + mapas procedurais.
// bumpScale maior que o da pedra porque os sulcos da casca são mais marcados.
const mapasMadeira = criarMapasMadeira(renderer.capabilities.getMaxAnisotropy());

const materialMadeira = new THREE.MeshStandardMaterial({
  map: mapasMadeira.texturaCor,
  bumpMap: mapasMadeira.texturaRelevo,
  bumpScale: 4.0,
  roughnessMap: mapasMadeira.texturaRugosidade,
  roughness: 1.0,
  metalness: 0.0
});

function prepararMadeira(malha) {
  malha.geometry = aplicarUVCaixa(malha.geometry, 2);
  malha.material = materialMadeira;
}

// Duas toras em volta da fogueira (que fica em x = 0, z = -1.5)
const toras = [
  { posicao: [-1.9, 0, -1.4], rotacaoY: 0.1 },
  { posicao: [0.3, 0, -3.4], rotacaoY: Math.PI / 2 + 0.3 }
];

toras.forEach(({ posicao, rotacaoY }) => {
  carregarOBJ(scene, PASTA_SURVIVAL, 'tree-log', {
    posicao: new THREE.Vector3(...posicao),
    escala: 2.5,
    rotacaoY,
    prepararMalha: prepararMadeira
  });
});

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

// ---------- Floresta em volta da clareira (M3: ambiente coerente) ----------
// As árvores ficam num anel FORA do limite de caminhada (LIMITE = 19 em
// navegacao.js), formando a borda da clareira. A neblina (far = 60) esconde
// o fim do chão, então o jogador vê "floresta" em todas as direções.
// Aqui as árvores mantêm o material original do MTL (paleta da Kenney):
// são objetos de fundo, e o estilo low poly combina com a barraca.
//
// Gerador pseudoaleatório com semente fixa: as árvores ficam sempre no mesmo
// lugar a cada recarga (Math.random() mudaria tudo a cada F5).
let semente = 42;
function aleatorio() {
  semente = (semente * 16807) % 2147483647;
  return (semente - 1) / 2147483646;
}

const tiposArvore = ['tree', 'tree-tall', 'tree-autumn', 'tree-autumn-tall'];
const QUANTIDADE_ARVORES = 60;

for (let i = 0; i < QUANTIDADE_ARVORES; i++) {
  // ângulo em volta do centro + pequena variação, raio entre 21 e 33
  const angulo = (i / QUANTIDADE_ARVORES) * Math.PI * 2 + aleatorio() * 0.1;
  const raio = 21 + aleatorio() * 12;

  carregarOBJ(scene, PASTA_SURVIVAL, tiposArvore[Math.floor(aleatorio() * tiposArvore.length)], {
    posicao: new THREE.Vector3(Math.cos(angulo) * raio, 0, Math.sin(angulo) * raio),
    escala: 5 + aleatorio() * 3,
    rotacaoY: aleatorio() * Math.PI * 2
  });
}

// Tufos de grama espalhados dentro da clareira, longe da fogueira
for (let i = 0; i < 40; i++) {
  const angulo = aleatorio() * Math.PI * 2;
  const raio = 4 + aleatorio() * 14;

  carregarOBJ(scene, PASTA_SURVIVAL, 'grass-large', {
    posicao: new THREE.Vector3(Math.cos(angulo) * raio, 0, Math.sin(angulo) * raio - 1.5),
    escala: 1.2 + aleatorio() * 0.8,
    rotacaoY: aleatorio() * Math.PI * 2
  });
}

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