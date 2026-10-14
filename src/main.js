import * as THREE from 'three';
import './style.css';
import { criarNavegacao } from './navegacao.js';
import { carregarOBJ, carregarGLTF } from './modelos.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// limita o pixel ratio em 2 pra não pesar em telas de alta densidade
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------- Cena ----------
const scene = new THREE.Scene();

// céu de fim de tarde
// por enquanto é só uma cor de fundo; depois dá pra trocar por skybox/HDRI
const corCeu = new THREE.Color(0xe8b48a);
scene.background = corCeu;

// neblina com a mesma cor do céu
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

// ---------- Luzes (versão básica) ----------
// essa é só a iluminação mínima pra enxergar os modelos no M1;
// as sombras e os ajustes finos de intensidade/cor ficam pro M2

// HemisphereLight: luz ambiente com duas cores, uma vindo de cima (céu)
// e outra de baixo (chão). Fica mais natural que uma AmbientLight de cor única
const luzAmbiente = new THREE.HemisphereLight(0xffd9b3, 0x3a5a2a, 0.8);
scene.add(luzAmbiente);

// DirectionalLight: simula o sol. Os raios são paralelos, então só a
// direção importa (da posição da luz até o alvo, que por padrão é a origem)
// posição baixa no eixo Y = sol perto do horizonte, como no fim da tarde
const sol = new THREE.DirectionalLight(0xffb36b, 1.5);
sol.position.set(-15, 8, -10);
scene.add(sol);

// ---------- Chão ----------
// PlaneGeometry nasce "em pé" no plano XY, então giramos -90° no eixo X
// pra ele ficar deitado no plano XZ (o chão)
// o chão é maior que a área navegável (40x40) pra borda ficar escondida na neblina
const geometriaChao = new THREE.PlaneGeometry(100, 100);
// MeshStandardMaterial reage à luz (modelo PBR). A textura entra no M3
const materialChao = new THREE.MeshStandardMaterial({
  color: 0x4f7a3a,
  roughness: 1.0, // grama/terra é bem fosca, não tem reflexo
});
const chao = new THREE.Mesh(geometriaChao, materialChao);
chao.rotation.x = -Math.PI / 2;
scene.add(chao);

// ---------- Modelos ----------
// Survival Kit (Kenney) - licença CC0 1.0
const PASTA_SURVIVAL = '/models/survival/';

// barraca um pouco à esquerda e ao fundo, virada pro centro da clareira
// no Survival Kit a barraca vem em duas partes: a armação (tent) e o pano (tent-canvas)
// carregamos as duas com a mesma posição/escala/rotação pra elas se encaixarem
const configBarraca = {
  posicao: new THREE.Vector3(-3, 0, -4),
  escala: 2.5,
  rotacaoY: Math.PI / 6, // 30°
};
carregarOBJ(scene, PASTA_SURVIVAL, 'tent', configBarraca);
carregarOBJ(scene, PASTA_SURVIVAL, 'tent-canvas', configBarraca);

// fogueira no centro da clareira, entre a barraca e o ponto de partida da câmera
carregarOBJ(scene, PASTA_SURVIVAL, 'campfire-pit', {
  posicao: new THREE.Vector3(0, 0, -1.5),
  escala: 2.5,
});

// tronco ao lado da fogueira, pra servir de "banco"
// Tree Stump 01 (Poly Haven, Rob Tuytel) - licença CC0 1.0
// os modelos do Poly Haven já vêm em escala real (1 unidade = 1 metro), então escala 1
carregarGLTF(scene, '/models/tronco/tree_stump_01_1k.gltf', {
  nome: 'tronco',
  posicao: new THREE.Vector3(2, 0, -1),
  escala: 1,
  rotacaoY: Math.PI / 4, // 45°
});

// NOVO: poste com lanterna ao lado da barraca
// Lantern (Khronos glTF Sample Assets, Microsoft) - licença CC0 1.0
// formato GLB: geometria, materiais e texturas empacotados num arquivo binário só
// o modelo original tem ~26 unidades de altura; com escala 0.1 fica com ~2,6 m
carregarGLTF(scene, '/models/lanterna/Lantern.glb', {
  nome: 'lanterna',
  posicao: new THREE.Vector3(-5.5, 0, -1.5),
  escala: 0.1,
  rotacaoY: -Math.PI / 4, // -45°, com a lanterna virada pro lado da fogueira
});

// ---------- Navegação ----------
const navegacao = criarNavegacao(camera, renderer.domElement);

// ---------- Timer ----------
// THREE.Timer mede o tempo entre um quadro e outro (delta, em segundos)
// connect(document) faz ele pausar quando a aba fica escondida,
// pra não vir um delta gigante quando a pessoa volta pra aba
const timer = new THREE.Timer();
timer.connect(document);

// ---------- Redimensionamento ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // recalcula a matriz de projeção com o novo aspect
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop de renderização ----------
// o setAnimationLoop passa o timestamp do quadro atual
renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp); // update() uma vez por quadro, ANTES do getDelta()
  const delta = timer.getDelta();

  navegacao.atualizar(delta);

  renderer.render(scene, camera);
});