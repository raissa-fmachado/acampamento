
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- Carregar modelo OBJ ----------
// O OBJ contém geometria e coordenadas UV.
// O MTL contém as definições dos materiais e referências às texturas.
// O MTLLoader carrega os materiais antes de o OBJLoader carregar a geometria.

export function carregarOBJ(
  scene,
  pasta,
  nome,
  {
    posicao = new THREE.Vector3(),
    escala = 1,
    rotacaoY = 0
  } = {}
) {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath(pasta);

  mtlLoader.load(
    `${nome}.mtl`,
    (materiais) => {
      materiais.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materiais);
      objLoader.setPath(pasta);

      objLoader.load(
        `${nome}.obj`,
        (objeto) => {
          objeto.name = nome;
          objeto.position.copy(posicao);
          objeto.scale.setScalar(escala);
          objeto.rotation.y = rotacaoY;

          objeto.traverse((filho) => {
            if (filho.isMesh) {
              // M2: configura sombras
              filho.castShadow = true;
              filho.receiveShadow = true;

              // M3: verifica se a geometria possui coordenadas UV.
              if (!filho.geometry.attributes.uv) {
                console.warn(
                  `O modelo ${nome} possui uma malha sem coordenadas UV.`
                );
              }
            }
          });

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

// ---------- Carregar modelo glTF / GLB ----------
// Os formatos glTF e GLB podem armazenar geometria, materiais PBR,
// texturas e coordenadas UV.
// O GLTFLoader interpreta essas informações e aplica os materiais.

const gltfLoader = new GLTFLoader();

export function carregarGLTF(
  scene,
  caminho,
  {
    nome = '',
    posicao = new THREE.Vector3(),
    escala = 1,
    rotacaoY = 0
  } = {}
) {
  gltfLoader.load(
    caminho,
    (gltf) => {
      const modelo = gltf.scene;

      modelo.name = nome;
      modelo.position.copy(posicao);
      modelo.scale.setScalar(escala);
      modelo.rotation.y = rotacaoY;

      modelo.traverse((filho) => {
        if (filho.isMesh) {
          // M2: configura sombras
          filho.castShadow = true;
          filho.receiveShadow = true;

          // M3: verifica se a geometria possui coordenadas UV.
          if (!filho.geometry.attributes.uv) {
            console.warn(
              `O modelo ${nome} possui uma malha sem coordenadas UV.`
            );
          }
        }
      });

      scene.add(modelo);
    },
    undefined,
    (erro) => console.error(`Erro ao carregar ${caminho}`, erro)
  );
}
