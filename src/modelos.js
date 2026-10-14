import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// ---------- Carregar modelo OBJ ----------
// O formato OBJ guarda só a geometria (vértices, normais, coordenadas UV).
// Os materiais e as texturas ficam num arquivo separado, o .mtl.
// Por isso carregamos primeiro o .mtl (MTLLoader) e depois o .obj (OBJLoader)
// já com esses materiais aplicados.
//
// pasta: caminho dentro de /public (o Vite serve essa pasta na raiz do site)
// nome:  nome do arquivo sem extensão (ex.: 'tent' -> tent.obj + tent.mtl)
export function carregarOBJ(scene, pasta, nome, { posicao = new THREE.Vector3(), escala = 1, rotacaoY = 0 } = {}) {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath(pasta); // a textura citada no .mtl também é buscada a partir daqui

  mtlLoader.load(
    `${nome}.mtl`,
    (materiais) => {
      materiais.preload(); // cria os materiais (e carrega as texturas) antes de usar

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materiais);
      objLoader.setPath(pasta);

      objLoader.load(
        `${nome}.obj`,
        (objeto) => {
          // o OBJLoader devolve um Group com um ou mais Mesh dentro;
          // transformando o Group, todos os filhos acompanham (grafo de cena)
          objeto.name = nome;
          objeto.position.copy(posicao);
          objeto.scale.setScalar(escala);
          objeto.rotation.y = rotacaoY;
          scene.add(objeto);
        },
        undefined,
        (erro) => console.error(`Erro ao carregar ${nome}.obj`, erro)
      );
    },
    undefined,
    (erro) => console.error(`Erro ao carregar ${nome}.mtl`, erro)
  );
}