import * as THREE from 'three'; // NOVO: pra usar o MeshDepthMaterial
import GUI from 'lil-gui';

// ---------- Função auxiliar ----------
// percorre todos os objetos da cena (traverse = percorre o grafo de cena inteiro,
// incluindo os filhos dos modelos carregados) e aplica uma função em cada material.
// Alguns Mesh (como os do OBJ) podem ter um ARRAY de materiais, por isso o tratamento
function paraCadaMaterial(scene, funcao) {
  scene.traverse((objeto) => {
    if (!objeto.isMesh) return;
    const materiais = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
    materiais.forEach(funcao);
  });
}

// ---------- Modo diagnóstico ----------
// painel com lil-gui pra tornar visíveis etapas do pipeline de visualização
export function criarDiagnostico(scene) {
  const gui = new GUI({ title: 'Modo diagnóstico' });

  // valores que o painel controla
  const opcoes = {
    wireframe: false,
    profundidade: false, // NOVO
  };

  // 1. Wireframe
  // desenha só as arestas dos triângulos, sem preencher as faces.
  // Mostra como os modelos são, na verdade, malhas de triângulos
  // (e dá pra comparar a quantidade de detalhe de cada modelo)
  gui
    .add(opcoes, 'wireframe')
    .name('Wireframe')
    .onChange((ativo) => {
      paraCadaMaterial(scene, (material) => {
        material.wireframe = ativo;
      });
    });

  // NOVO: 2. Profundidade (z-buffer)
  // MeshDepthMaterial pinta cada pixel de acordo com a profundidade dele,
  // o mesmo valor que vai pro z-buffer: mais perto da câmera = mais claro,
  // mais longe = mais escuro.
  // scene.overrideMaterial faz TODOS os objetos da cena usarem esse material
  // no lugar do material original, sem precisar alterar objeto por objeto.
  //
  // Observação: a profundidade da câmera perspectiva NÃO é linear. Quase toda a
  // precisão fica concentrada perto do plano near, então com near = 0.1 e far = 200
  // a maior parte da cena aparece bem escura e só o que está muito perto fica claro.
  // Isso é justamente o que esse modo deixa observar.
  const materialProfundidade = new THREE.MeshDepthMaterial();
  const fundoOriginal = scene.background;
  const fundoProfundidade = new THREE.Color(0x000000); // fundo preto = "infinitamente longe"

  gui
    .add(opcoes, 'profundidade')
    .name('Profundidade (z-buffer)')
    .onChange((ativo) => {
      scene.overrideMaterial = ativo ? materialProfundidade : null;
      scene.background = ativo ? fundoProfundidade : fundoOriginal;
    });

  return { gui, opcoes };
}