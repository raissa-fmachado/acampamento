# Acampamento na Floresta

Projeto da disciplina de Computação Gráfica (IFSP São João da Boa Vista, 2026), feito com Three.js e Vite.

**Vídeo:** [link aqui]

## Descrição

Uma clareira na floresta ao entardecer, com barraca, fogueira, toras, pedras, um tronco cortado e uma lanterna.
O jogador explora a cena em primeira pessoa.

## Como executar

```bash
npm install
npm run dev
```

## Controles

- **Clique na tela:** começar
- **WASD:** andar
- **Mouse:** olhar
- **← →:** girar
- **Esc:** soltar o mouse (para usar o painel)
- **Painel lil-gui:** modo diagnóstico e materiais

## Decisões técnicas

**Câmera:** `PerspectiveCamera` com FOV 75, near 0.1 e far 200, na altura dos olhos (1.7).
O near pequeno deixa chegar perto dos objetos, e o far cobre a clareira toda.

**Navegação:** as velocidades são em unidades por segundo e multiplicadas pelo delta do `THREE.Timer`.
Assim o movimento é igual em qualquer FPS.

**Luzes:**
- `HemisphereLight`: luz geral do céu e do chão.
- `DirectionalLight`: sol de fim de tarde, laranja. É a única que projeta sombra, porque só precisa de um shadow map.
- `PointLight`: luz da fogueira.

**Sombras:** shadow map de 2048, câmera de sombra cobrindo só a área do acampamento e `bias` para evitar
o shadow acne.

**Materiais:** todos usam `MeshStandardMaterial` (PBR).
- Chão, pedra e madeira: texturas procedurais com cor, bumpMap e roughnessMap.
- Barraca: textura original com roughness alta (tecido fosco).
- Tronco e lanterna: materiais do próprio arquivo, com normalMap.

Os modelos da Kenney usam UVs de paleta, então criamos UVs novas por projeção em caixa (`uv.js`).

**Modelos:** OBJ (Kenney), glTF (tronco) e GLB (lanterna).

## Caso de diagnóstico

Ao ligar a visão de profundidade, quase toda a cena aparecia preta e não dava para distinguir o que estava perto do que estava longe. Isso acontece porque a profundidade na câmera perspectiva não é linear: quase toda a precisão fica perto do near. Com o near em 1, a profundidade ficou mais bem distribuída e dá para ver a diferença entre os objetos. Mesmo assim, mantivemos o near em 0.1, porque com 1 os objetos eram cortados quando chegávamos perto deles.

| Antes | Depois |
|---|---|
| ![antes](docs/img/antes.png) | ![depois](docs/img/depois.png) |

## Créditos

- Survival Kit: [Kenney](https://kenney.nl/assets/survival-kit) (CC0)
- Tree Stump 01: Rob Tuytel, [Poly Haven](https://polyhaven.com/a/tree_stump_01) (CC0)
- Lantern: Microsoft, [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Lantern) (CC0)
- Texturas do chão, pedra e madeira: feitas pela equipe (procedurais)
- Bibliotecas: three.js, lil-gui, Vite (MIT)

## Divisão do trabalho

Equipe: **Ana Julia Romera de Carvalho** e **Raissa Figueiredo Machado**.

- **Raissa:** montagem da cena (chão, céu, carregamento dos modelos OBJ e glTF/GLB), navegação em primeira pessoa com `THREE.Timer` e painel do modo diagnóstico no lil-gui (wireframe, profundidade, back-face culling, CameraHelper e renderer.info).
- **Ana Julia:** iluminação (tipos de luz, shadow map e bias), materiais e texturas, ajuste da câmera (near/far) e README.
- **As duas:** gravação do vídeo, revisão final e revisão do código uma da outra.

## Uso de IA

- **O que pedimos:** ajuda para definir a ideia e o escopo do projeto (proposta do M0) e rascunho do README.
- **O que validamos ou mudamos:**simplificamos o README e conferimos o caso de diagnóstico com nossos próprios prints.
- **O que descartamos:** Da proposta inicial, feita com ajuda da IA:
° PointLight na lanterna: ficou só a luz da fogueira, e a lanterna brilha pelo material emissivo do próprio GLB.
° Árvores e pedras feitas com geometrias do Three.js: trocamos pelos modelos da Kenney, que combinam com o estilo low poly da barraca e da fogueira.
° Tronco cortado como assento: usamos toras de madeira em volta da fogueira, e o tronco ficou como decoração.