import * as THREE from 'three';

// ---------- Projeção UV em caixa (box mapping) (M3) ----------
// Os modelos da Kenney vêm com coordenadas UV que apontam pra uma PALETA:
// cada face usa um pontinho de cor da imagem colormap.png. Se aplicarmos uma
// textura de pedra ou madeira com essas UVs, cada face mostraria só um pixel
// da textura (uma cor chapada), e o relevo não apareceria.
//
// Por isso geramos UVs novas, projetando a textura como se ela viesse de
// três "projetores" alinhados aos eixos X, Y e Z (como uma caixa em volta do
// objeto). Para cada triângulo:
//  1. calcula a normal da face
//  2. vê qual eixo a normal mais aponta (maior componente em módulo)
//  3. usa as outras duas coordenadas da posição como (u, v)
// Ex.: face virada pra cima (normal ≈ +Y) recebe u = x, v = z.
// Assim a textura nunca fica muito esticada em nenhuma face.
//
// "escala" = quantas repetições da textura por unidade do modelo.

export function aplicarUVCaixa(geometria, escala = 1) {
  // A projeção é feita por triângulo, então cada triângulo precisa ter os
  // próprios vértices (geometria não indexada). O OBJLoader já gera assim.
  const geo = geometria.index ? geometria.toNonIndexed() : geometria;

  const posicoes = geo.attributes.position;
  const uvs = new Float32Array(posicoes.count * 2);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  for (let i = 0; i < posicoes.count; i += 3) {
    a.fromBufferAttribute(posicoes, i);
    b.fromBufferAttribute(posicoes, i + 1);
    c.fromBufferAttribute(posicoes, i + 2);

    // normal da face = produto vetorial de duas arestas
    normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const nx = Math.abs(normal.x);
    const ny = Math.abs(normal.y);
    const nz = Math.abs(normal.z);

    [a, b, c].forEach((p, j) => {
      let u;
      let v;
      if (nx >= ny && nx >= nz) {
        u = p.z; v = p.y; // face virada pra X
      } else if (ny >= nz) {
        u = p.x; v = p.z; // face virada pra Y
      } else {
        u = p.x; v = p.y; // face virada pra Z
      }
      uvs[(i + j) * 2] = u * escala;
      uvs[(i + j) * 2 + 1] = v * escala;
    });
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}