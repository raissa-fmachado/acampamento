import * as THREE from 'three';

// ---------- Texturas procedurais (M3) ----------
// Todas as texturas deste arquivo são geradas pelo próprio JavaScript
// (desenhadas pixel a pixel num <canvas>), sem imagens externas.
// Cada material recebe três mapas:
//  - cor (map): a cor base da superfície
//  - relevo (bumpMap): tons de cinza, claro = alto, escuro = baixo.
//    O shader usa a variação desse valor pra "entortar" a normal de cada pixel,
//    simulando relevo sem mudar a geometria
//  - rugosidade (roughnessMap): claro = áspero (reflexo espalhado),
//    escuro = liso (reflexo mais concentrado)
//
// "anisotropia" vem de renderer.capabilities.getMaxAnisotropy() no main.js.
// Ela melhora a nitidez da textura quando vista em ângulo rasante (o chão).

// Ruído de valor suavizado (value noise), repetível (tileable).
// "celula" define o tamanho das manchas: célula grande = manchas grandes.
export function criarRuido(tamanho, celula) {
  const n = tamanho / celula;
  const grade = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Math.random())
  );

  // Suavização (smoothstep) para evitar bordas duras entre células
  const suave = (t) => t * t * (3 - 2 * t);

  return (x, y) => {
    const gx = x / celula;
    const gy = y / celula;

    const x0 = Math.floor(gx) % n;
    const y0 = Math.floor(gy) % n;
    const x1 = (x0 + 1) % n;
    const y1 = (y0 + 1) % n;

    const tx = suave(gx - Math.floor(gx));
    const ty = suave(gy - Math.floor(gy));

    const a = grade[y0][x0] * (1 - tx) + grade[y0][x1] * tx;
    const b = grade[y1][x0] * (1 - tx) + grade[y1][x1] * tx;

    return a * (1 - ty) + b * ty;
  };
}

// ---------- Gerador genérico de mapas ----------
// Percorre todos os pixels e chama "pixel(x, y)", que devolve
// { cor: [r, g, b], relevo, rugosidade } (valores de 0 a 255).
// Assim cada material só precisa descrever a "receita" de um pixel.
function criarMapas(tamanho, pixel, { repeticao = 1, anisotropia = 1 } = {}) {
  const canvas = {};
  const contexto = {};
  const imagem = {};

  ['cor', 'relevo', 'rugosidade'].forEach((tipo) => {
    canvas[tipo] = document.createElement('canvas');
    canvas[tipo].width = tamanho;
    canvas[tipo].height = tamanho;
    contexto[tipo] = canvas[tipo].getContext('2d');
    imagem[tipo] = contexto[tipo].createImageData(tamanho, tamanho);
  });

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const indice = (y * tamanho + x) * 4;
      const { cor, relevo, rugosidade } = pixel(x, y);

      imagem.cor.data.set([cor[0], cor[1], cor[2], 255], indice);
      imagem.relevo.data.set([relevo, relevo, relevo, 255], indice);
      imagem.rugosidade.data.set([rugosidade, rugosidade, rugosidade, 255], indice);
    }
  }

  const texturas = {};
  ['cor', 'relevo', 'rugosidade'].forEach((tipo) => {
    contexto[tipo].putImageData(imagem[tipo], 0, 0);

    const textura = new THREE.CanvasTexture(canvas[tipo]);
    // RepeatWrapping: quando a coordenada UV passa de 1, a textura se repete
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(repeticao, repeticao);
    textura.anisotropy = anisotropia;
    texturas[tipo] = textura;
  });

  // Só o mapa de cor é sRGB. Relevo e rugosidade são DADOS (números),
  // então ficam no espaço linear, sem conversão de cor.
  texturas.cor.colorSpace = THREE.SRGBColorSpace;

  return {
    texturaCor: texturas.cor,
    texturaRelevo: texturas.relevo,
    texturaRugosidade: texturas.rugosidade
  };
}

// ---------- Chão: grama com manchas de terra ----------
export function criarMapasChao(anisotropia = 1) {
  const tamanho = 512;

  // Três escalas de ruído: manchas grandes, médias e finas (fibras de grama)
  const ruidoGrande = criarRuido(tamanho, 128);
  const ruidoMedio = criarRuido(tamanho, 32);
  const ruidoFino = criarRuido(tamanho, 4);

  return criarMapas(
    tamanho,
    (x, y) => {
      const g = ruidoGrande(x, y);
      const m = ruidoMedio(x, y);
      const f = ruidoFino(x, y);

      // Altura combinada (0 a 1), usada na cor e no relevo
      const altura = g * 0.4 + m * 0.35 + f * 0.25;

      // Manchas de terra onde o ruído grande é alto
      const terra = Math.min(1, Math.max(0, (g - 0.62) * 3));

      // Cor da grama e da terra, misturadas pela máscara "terra"
      const verde = [38 + altura * 30, 80 + altura * 55, 28 + altura * 20];
      const marrom = [96 + f * 20, 76 + f * 18, 46 + f * 12];
      const cor = verde.map((v, i) => v * (1 - terra) + marrom[i] * terra);

      return {
        cor,
        relevo: altura * 255,
        // A terra é um pouco menos áspera que a grama
        rugosidade: 215 + f * 40 - terra * 35
      };
    },
    // Repete 10x para cobrir o chão de 100x100
    { repeticao: 10, anisotropia }
  );
}


// ---------- Pedra: cinza, com rachaduras e manchas de líquen ----------
export function criarMapasPedra(anisotropia = 1) {
  const tamanho = 256;

  const ruidoGrande = criarRuido(tamanho, 64);
  const ruidoMedio = criarRuido(tamanho, 16);
  const ruidoFino = criarRuido(tamanho, 2);
  const ruidoRachadura = criarRuido(tamanho, 32);

  return criarMapas(
    tamanho,
    (x, y) => {
      const g = ruidoGrande(x, y);
      const m = ruidoMedio(x, y);
      const f = ruidoFino(x, y);

      // Rachaduras: onde o ruído passa perto de 0.5, |r - 0.5| fica perto de 0.
      // Isso forma "linhas" finas e irregulares, que viram sulcos escuros.
      const r = Math.abs(ruidoRachadura(x, y) - 0.5);
      const rachadura = Math.max(0, 1 - r * 25); // 1 = dentro da rachadura

      // Líquen esverdeado só onde o ruído grande é bem alto
      const liquen = Math.min(1, Math.max(0, (g - 0.7) * 4)) * m;

      const cinza = 95 + g * 45 + m * 25 + f * 20 - rachadura * 55;
      const cor = [
        cinza * (1 - liquen) + 90 * liquen,
        cinza * (1 - liquen) + 105 * liquen,
        cinza * (1 - liquen) + 60 * liquen
      ];

      // Altura: superfície irregular, mais funda nas rachaduras
      const altura = g * 0.35 + m * 0.4 + f * 0.25 - rachadura * 0.5;

      return {
        cor,
        relevo: Math.max(0, altura) * 255,
        // Pedra é áspera; as partes mais altas (expostas, gastas) são
        // um pouco mais lisas que o fundo das rachaduras
        rugosidade: 200 + f * 30 - m * 25 + rachadura * 40
      };
    },
    { repeticao: 1, anisotropia }
  );
}