# Arquitetura modular — El Encuentro

O runtime é separado em classes independentes e tipadas dentro de `client/src/game/`.

| Módulo | Responsabilidade |
|---|---|
| `types.ts` | Interfaces `GameObject`, `Player`, `Vector2D`, `Collider`, `Quest`, `Rect` e constantes do mapa. |
| `input-manager.ts` | Captura WASD/setas e expõe um vetor direcional. |
| `game-loop.ts` | `requestAnimationFrame`, cálculo de `deltaTime`, pausa e retomada. |
| `camera.ts` | Viewport, offset seguindo o Player e clamp nos limites do mapa 2000x2000. |
| `collision.ts` | Intersecção AABB, resolução de movimento e distância para triggers. |
| `renderer.ts` | Culling pela intersecção com viewport, lista dinâmica de visíveis e Y-Sorting por `y + height`. |
| `quest-system.ts` | Trigger zones de NPC, respostas, progresso e liberação lógica dos colliders de portão. |
| `scene.ts` | Composição Babylon, entidades, materiais, assets e orquestração. |
| `components/GameCanvas.tsx` | Canvas Babylon e UI DOM sobreposta para HUD, perfil e perguntas. |

O mapa usa coordenadas virtuais em pixels, maiores que o viewport. A Camera transforma coordenadas de mundo em tela, o Renderer atualiza somente objetos visíveis e ordena a camada 2.5D a cada frame. O Player movimenta-se com `velocidade * deltaTime`; o sistema AABB impede atravessar paredes e portões. Ao pressionar `E` dentro do trigger do NPC, o `GameLoop` pausa e o React exibe o pop-up DOM. Uma resposta correta marca a quest, libera o collider do portão e retoma o loop.

O estado de UI flui por `el-encuentro:state`, `el-encuentro:interact` e `el-encuentro:answer`, mantendo a lógica do jogo desacoplada da árvore React.
