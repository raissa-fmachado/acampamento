import * as THREE from 'three';

// ---------- Texturas procedurais do chão (M3) ----------
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

// Cria três mapas: cor, relevo e rugosidade.
// As texturas são geradas pelo próprio JavaScript,
// sem precisar adicionar imagens externas ao projeto.
export function criarMapasChao(anisotropia = 1) {
  const tamanho = 512;

  const criarCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = tamanho;
    canvas.height = tamanho;
    return canvas;
  };

  const canvasCor = criarCanvas();
  const canvasRelevo = criarCanvas();
  const canvasRugosidade = criarCanvas();

  const contextoCor = canvasCor.getContext('2d');
  const contextoRelevo = canvasRelevo.getContext('2d');
  const contextoRugosidade = canvasRugosidade.getContext('2d');

  const imagemCor = contextoCor.createImageData(tamanho, tamanho);
  const imagemRelevo = contextoRelevo.createImageData(tamanho, tamanho);
  const imagemRugosidade = contextoRugosidade.createImageData(tamanho, tamanho);

  // Três escalas de ruído: manchas grandes, médias e finas (fibras de grama)
  const ruidoGrande = criarRuido(tamanho, 128);
  const ruidoMedio = criarRuido(tamanho, 32);
  const ruidoFino = criarRuido(tamanho, 4);

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const indice = (y * tamanho + x) * 4;

      const g = ruidoGrande(x, y);
      const m = ruidoMedio(x, y);
      const f = ruidoFino(x, y);

      // Altura combinada (0 a 1), usada na cor e no relevo
      const altura = g * 0.4 + m * 0.35 + f * 0.25;

      // Manchas de terra onde o ruído grande é alto
      const terra = Math.min(1, Math.max(0, (g - 0.62) * 3));

      // Cor da grama
      const verdeR = 38 + altura * 30;
      const verdeG = 80 + altura * 55;
      const verdeB = 28 + altura * 20;

      // Cor da terra
      const terraR = 96 + f * 20;
      const terraG = 76 + f * 18;
      const terraB = 46 + f * 12;

      // Mistura grama e terra
      imagemCor.data[indice] = verdeR * (1 - terra) + terraR * terra;
      imagemCor.data[indice + 1] = verdeG * (1 - terra) + terraG * terra;
      imagemCor.data[indice + 2] = verdeB * (1 - terra) + terraB * terra;
      imagemCor.data[indice + 3] = 255;

      // Mapa de relevo em tons de cinza (claro = alto, escuro = baixo)
      const relevo = altura * 255;
      imagemRelevo.data[indice] = relevo;
      imagemRelevo.data[indice + 1] = relevo;
      imagemRelevo.data[indice + 2] = relevo;
      imagemRelevo.data[indice + 3] = 255;

      // Mapa de rugosidade: claro = mais áspero.
      // A terra é um pouco menos áspera que a grama.
      const rugosidade = 215 + f * 40 - terra * 35;
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
    textura.repeat.set(10, 10);
    textura.anisotropy = anisotropia;
  });

  // O mapa de cor é uma textura de cor (sRGB).
  texturaCor.colorSpace = THREE.SRGBColorSpace;

  return {
    texturaCor,
    texturaRelevo,
    texturaRugosidade
  };
}