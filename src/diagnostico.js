import * as THREE from 'three';
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
// NOVO: agora recebe também a câmera principal (pra desenhar o frustum dela)
export function criarDiagnostico(scene, camera) {
  const gui = new GUI({ title: 'Modo diagnóstico' });

  // valores que o painel controla
  const opcoes = {
    wireframe: false,
    profundidade: false,
    backfaceCulling: true, // começa ligado, que é o padrão do Three.js
    visaoDeCima: false, // NOVO
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

  // 2. Profundidade (z-buffer)
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

  // 3. Back-face culling
  // Cada triângulo tem uma frente e um verso, definidos pela ordem dos vértices
  // (sentido anti-horário visto da câmera = frente). Com o culling ligado
  // (side = FrontSide), a GPU descarta os triângulos que estão de costas pra câmera
  // antes de rasterizar, já que normalmente eles ficam escondidos atrás da parte
  // da frente do objeto. Isso economiza processamento.
  // Com o culling desligado (side = DoubleSide), os dois lados são desenhados.
  //
  // Onde dá pra ver a diferença:
  //  - olhando o chão por baixo (com culling ele some, porque só a face de cima existe)
  //  - com o wireframe ligado: sem culling aparecem também as arestas de trás dos modelos
  gui
    .add(opcoes, 'backfaceCulling')
    .name('Back-face culling')
    .onChange((ativo) => {
      const lado = ativo ? THREE.FrontSide : THREE.DoubleSide;
      paraCadaMaterial(scene, (material) => {
        material.side = lado;
        // mudar o side altera o shader que o Three.js gera pro material,
        // então avisamos que ele precisa ser recompilado
        material.needsUpdate = true;
      });
      // o material de profundidade também respeita a mesma configuração
      materialProfundidade.side = lado;
      materialProfundidade.needsUpdate = true;
    });

  // NOVO: 4. Visão de cima com o frustum da câmera principal
  // Uma SEGUNDA câmera fica parada lá em cima olhando pra baixo.
  // Usamos uma OrthographicCamera (projeção ortográfica, sem perspectiva),
  // que funciona como um "mapa": as distâncias não encolhem com a profundidade.
  // left/right/top/bottom = -25..25 cobre a clareira (40x40) com folga.
  const cameraCima = new THREE.OrthographicCamera(-25, 25, 25, -25, 0.1, 100);
  cameraCima.position.set(0, 50, 0);
  // olhando reto pra baixo, o "up" padrão (eixo Y) fica paralelo à direção de visão,
  // então definimos o -Z como "pra cima" na tela da visão de cima
  cameraCima.up.set(0, 0, -1);
  cameraCima.lookAt(0, 0, 0);

  // CameraHelper desenha o frustum (a "pirâmide cortada" que a câmera enxerga):
  // o plano near, o plano far e as linhas que ligam os dois.
  // Tudo que fica fora desse volume é descartado no recorte (clipping).
  const helper = new THREE.CameraHelper(camera);
  helper.visible = false;
  scene.add(helper);

  gui.add(opcoes, 'visaoDeCima').name('Visão de cima (frustum)');

  // ---------- NOVO: Renderização ----------
  // substitui o renderer.render() do loop: desenha a visão normal na tela inteira e,
  // se a opção estiver ligada, desenha a visão de cima num quadro no canto inferior esquerdo
  function renderizar(renderer) {
    const largura = window.innerWidth;
    const altura = window.innerHeight;

    // visão principal (tela inteira)
    // o helper fica escondido aqui, senão as linhas do frustum apareceriam
    // na frente da própria câmera
    helper.visible = false;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, largura, altura);
    renderer.render(scene, camera);

    if (!opcoes.visaoDeCima) return;

    // visão de cima (quadro no canto)
    // viewport = região do canvas onde a imagem é desenhada
    // scissor  = região que o renderer pode limpar/pintar (senão ele apagaria a tela toda)
    const tamanho = Math.floor(Math.min(largura, altura) * 0.4);
    const margem = 16;

    helper.visible = true;
    helper.update(); // atualiza o desenho do frustum se a projeção da câmera mudar

    // a neblina é desligada só nesse quadro: a câmera de cima está a 50 unidades
    // do chão, e com a neblina (far = 60) a cena ficaria quase toda coberta
    const neblina = scene.fog;
    scene.fog = null;

    renderer.setScissorTest(true);
    renderer.setViewport(margem, margem, tamanho, tamanho);
    renderer.setScissor(margem, margem, tamanho, tamanho);
    renderer.render(scene, cameraCima);
    renderer.setScissorTest(false);

    scene.fog = neblina;
  }

  return { gui, opcoes, renderizar };
}