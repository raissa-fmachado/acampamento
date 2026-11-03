
import * as THREE from 'three';
import './style.css';
import { criarNavegacao } from './navegacao.js';
import { carregarOBJ, carregarGLTF } from './modelos.js';
import { criarDiagnostico } from './diagnostico.js';

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
const luzAmbiente = new THREE.HemisphereLight(
  0xffd9b3,
  0x3a5a2a,
  1.0
);
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

// Cria três mapas: cor, relevo e rugosidade.
// As texturas são geradas pelo próprio JavaScript,
// sem precisar adicionar imagens externas ao projeto.

function criarMapasChao() {
  const tamanho = 256;

  const canvasCor = document.createElement('canvas');
  const canvasRelevo = document.createElement('canvas');
  const canvasRugosidade = document.createElement('canvas');

  canvasCor.width = tamanho;
  canvasCor.height = tamanho;

  canvasRelevo.width = tamanho;
  canvasRelevo.height = tamanho;

  canvasRugosidade.width = tamanho;
  canvasRugosidade.height = tamanho;

  const contextoCor = canvasCor.getContext('2d');
  const contextoRelevo = canvasRelevo.getContext('2d');
  const contextoRugosidade = canvasRugosidade.getContext('2d');

  const imagemCor = contextoCor.createImageData(tamanho, tamanho);
  const imagemRelevo = contextoRelevo.createImageData(tamanho, tamanho);
  const imagemRugosidade = contextoRugosidade.createImageData(tamanho, tamanho);

  // Gera pequenas variações de verde e marrom,
  // simulando grama misturada com terra.
  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const indice = (y * tamanho + x) * 4;

      const ruido = Math.random();
      const manchas = Math.sin(x * 0.12) * Math.cos(y * 0.10);

      let vermelho;
      let verde;
      let azul;

      if (ruido > 0.90) {
        // Pequenas áreas de terra
        vermelho = 91 + manchas * 8;
        verde = 75 + manchas * 8;
        azul = 43;
      } else {
        // Grama em diferentes tons de verde
        vermelho = 42 + ruido * 15;
        verde = 88 + ruido * 25 + manchas * 5;
        azul = 31 + ruido * 10;
      }

      imagemCor.data[indice] = vermelho;
      imagemCor.data[indice + 1] = verde;
      imagemCor.data[indice + 2] = azul;
      imagemCor.data[indice + 3] = 255;

      // Mapa de relevo em tons de cinza.
      // Diferenças de intensidade simulam irregularidades.
      const relevo = 100 + ruido * 100;

      imagemRelevo.data[indice] = relevo;
      imagemRelevo.data[indice + 1] = relevo;
      imagemRelevo.data[indice + 2] = relevo;
      imagemRelevo.data[indice + 3] = 255;

      // Mapa de rugosidade:
      // valores claros representam superfícies mais ásperas.
      const rugosidade = 190 + ruido * 65;

      imagemRugosidade.data[indice] = rugosidade;
      imagemRugosidade.data[indice + 1] = rugosidade;
      imagemRugosidade.data[indice + 2] = rugosidade;
      imagemRugosidade.data[indice + 3] = 255;
    }
  }

  contextoCor.putImageData(imagemCor, 0, 0);
  contextoRelevo.putImageData(imagemRelevo, 0, 0);
  contextoRugosidade.putImageData(imagemRugosidade, 0, 0);

  const texturaCor = new THREE.CanvasTexture(canvasCor);
  const texturaRelevo = new THREE.CanvasTexture(canvasRelevo);
  const texturaRugosidade = new THREE.CanvasTexture(canvasRugosidade);

  // Repete as texturas para cobrir o chão.
  // A repetição também utiliza as coordenadas UV do plano.
  [texturaCor, texturaRelevo, texturaRugosidade].forEach((textura) => {
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(8, 8);
    textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });

  // O mapa de cor é uma textura de cor.
  texturaCor.colorSpace = THREE.SRGBColorSpace;

  return {
    texturaCor,
    texturaRelevo,
    texturaRugosidade
  };
}

const mapasChao = criarMapasChao();

// ---------- Chão (M3) ----------

const geometriaChao = new THREE.PlaneGeometry(100, 100);

const materialChao = new THREE.MeshStandardMaterial({
  color: 0xffffff,

  // Textura de grama e terra
  map: mapasChao.texturaCor,

  // Mapa de relevo
  bumpMap: mapasChao.texturaRelevo,
  bumpScale: 0.06,

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

const chamas = new THREE.Group();

const geometriaChamaMaior = new THREE.ConeGeometry(0.18, 0.65, 6);
const materialChamaMaior = new THREE.MeshBasicMaterial({
  color: 0xff5a0a
});

const chamaMaior = new THREE.Mesh(
  geometriaChamaMaior,
  materialChamaMaior
);

chamaMaior.position.set(0, 0.35, 0);
chamas.add(chamaMaior);

const geometriaChamaMenor = new THREE.ConeGeometry(0.12, 0.42, 6);
const materialChamaMenor = new THREE.MeshBasicMaterial({
  color: 0xffc12e
});

const chamaMenor = new THREE.Mesh(
  geometriaChamaMenor,
  materialChamaMenor
);

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
