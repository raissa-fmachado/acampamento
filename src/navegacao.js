import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------- Configurações ----------
// velocidades em UNIDADES POR SEGUNDO (e radianos por segundo no giro),
// multiplicadas pelo delta de cada quadro. Assim o movimento é o mesmo
// em 30 FPS ou em 144 FPS (independente de frame rate)
const VELOCIDADE_ANDAR = 4; // ~ passo de caminhada
const VELOCIDADE_GIRO = Math.PI / 2; // 90° por segundo com as setas
const LIMITE = 19; // metade da clareira (40x40) menos uma margem

const EIXO_Y = new THREE.Vector3(0, 1, 0);

export function criarNavegacao(camera, canvas) {
  // PointerLockControls: esconde o cursor e usa o movimento do mouse
  // pra girar a câmera (olhar pros lados e pra cima/baixo)
  const controles = new PointerLockControls(camera, canvas);

  const instrucoes = document.getElementById('instrucoes');

  // clicar no canvas "trava" o mouse; Esc destrava
  canvas.addEventListener('click', () => controles.lock());
  controles.addEventListener('lock', () => (instrucoes.style.display = 'none'));
  controles.addEventListener('unlock', () => (instrucoes.style.display = 'block'));

  // guarda quais teclas estão pressionadas no momento
  // (event.code usa a posição física da tecla, então funciona em qualquer layout de teclado)
  const teclas = {};
  window.addEventListener('keydown', (e) => (teclas[e.code] = true));
  window.addEventListener('keyup', (e) => (teclas[e.code] = false));

  const direcao = new THREE.Vector2();

  // chamada uma vez por quadro no loop, recebendo o delta (em segundos)
  function atualizar(delta) {
    if (!controles.isLocked) return;

    // x = lado (D - A), y = frente (W - S)
    direcao.set(
      Number(!!teclas.KeyD) - Number(!!teclas.KeyA),
      Number(!!teclas.KeyW) - Number(!!teclas.KeyS)
    );
    // normaliza pra andar na diagonal não ficar mais rápido que em linha reta
    if (direcao.lengthSq() > 0) direcao.normalize();

    const distancia = VELOCIDADE_ANDAR * delta;
    // moveForward/moveRight andam no plano XZ, então a altura dos olhos não muda
    controles.moveRight(direcao.x * distancia);
    controles.moveForward(direcao.y * distancia);

    // giro pelas setas, em radianos por segundo
    const giro = Number(!!teclas.ArrowLeft) - Number(!!teclas.ArrowRight);
    if (giro !== 0) camera.rotateOnWorldAxis(EIXO_Y, giro * VELOCIDADE_GIRO * delta);

    // impede de sair da clareira (não é colisão, só um limite de área)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -LIMITE, LIMITE);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -LIMITE, LIMITE);
  }

  return { atualizar };
}