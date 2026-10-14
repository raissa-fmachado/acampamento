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

  return { gui, opcoes };
}