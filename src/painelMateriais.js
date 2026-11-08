// ---------- Painel de materiais (M3) ----------
// Pasta extra no mesmo lil-gui do modo diagnóstico, pra ajustar ao vivo
// os parâmetros dos materiais PBR e ver o efeito de cada mapa.
//
// Lembrando o que cada parâmetro faz no MeshStandardMaterial:
//  - roughness: multiplica o roughnessMap. 0 = espelho, 1 = totalmente fosco
//  - bumpScale: "força" do bumpMap (quanto a normal é inclinada)

// guarda os mapas originais pra poder desligar e religar
function alternarMapa(materiais, propriedade, ativo) {
  materiais.forEach((material) => {
    if (!material.userData.mapasOriginais) material.userData.mapasOriginais = {};
    const originais = material.userData.mapasOriginais;

    if (!(propriedade in originais)) originais[propriedade] = material[propriedade];
    material[propriedade] = ativo ? originais[propriedade] : null;

    // ligar/desligar um mapa muda o shader gerado, então precisa recompilar
    material.needsUpdate = true;
  });
}

export function criarPainelMateriais(gui, scene, { chao, pedra, madeira }) {
  const pasta = gui.addFolder('Materiais (M3)');

  const opcoes = {
    relevo: true,
    rugosidade: true
  };

  // materiais dos modelos glTF (tronco e lanterna), que vêm com normalMap.
  // São buscados na hora do clique porque os modelos carregam de forma assíncrona.
  function materiaisGLTF() {
    const lista = [];
    ['tronco', 'lanterna'].forEach((nome) => {
      const modelo = scene.getObjectByName(nome);
      if (!modelo) return;
      modelo.traverse((filho) => {
        if (filho.isMesh) lista.push(filho.material);
      });
    });
    return lista;
  }

  const procedurais = [chao, pedra, madeira];

  // Liga/desliga TODOS os mapas de relevo: bumpMap nos materiais procedurais
  // e normalMap nos glTF. Desligado, as superfícies ficam "lisas" e dá pra
  // ver quanto do detalhe vinha só da iluminação por pixel, e não da geometria.
  pasta
    .add(opcoes, 'relevo')
    .name('Mapas de relevo')
    .onChange((ativo) => {
      alternarMapa(procedurais, 'bumpMap', ativo);
      alternarMapa(materiaisGLTF(), 'normalMap', ativo);
    });

  // Sem o roughnessMap, a rugosidade fica constante (só o valor "roughness")
  pasta
    .add(opcoes, 'rugosidade')
    .name('Mapas de rugosidade')
    .onChange((ativo) => {
      alternarMapa(procedurais, 'roughnessMap', ativo);
    });

  const pastaChao = pasta.addFolder('Chão (grama/terra)');
  pastaChao.add(chao, 'bumpScale', 0, 5, 0.1).name('bumpScale');
  pastaChao.add(chao, 'roughness', 0, 1, 0.01).name('roughness');

  const pastaPedra = pasta.addFolder('Pedra');
  pastaPedra.add(pedra, 'bumpScale', 0, 8, 0.1).name('bumpScale');
  pastaPedra.add(pedra, 'roughness', 0, 1, 0.01).name('roughness');

  const pastaMadeira = pasta.addFolder('Madeira (toras)');
  pastaMadeira.add(madeira, 'bumpScale', 0, 8, 0.1).name('bumpScale');
  pastaMadeira.add(madeira, 'roughness', 0, 1, 0.01).name('roughness');

  // começa fechado pra não cobrir a tela
  pasta.close();

  return pasta;
}