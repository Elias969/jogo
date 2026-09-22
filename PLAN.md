# El Encuentro — Plano de implementação

## Escopo entregue
Jogo narrativo 2D top-down em pixel art com quatro cenas: título, Santiago, conexão e reencontro. Catalina é controlada por WASD/setas; E, Espaço, clique no botão e toque acionam a interação. Cada pergunta aceita tentativas ilimitadas; respostas corretas desbloqueiam a passagem e avançam para a próxima cena.

## Riscos e verificação
- **Movimento e transição:** limites de tela, troca de sprite por direção e avanço apenas após resposta correta.
- **Diálogo:** pergunta, três alternativas, feedback de erro e avanço temporizado no acerto.
- **Assets:** sprites Catalina recortados com alpha, aeroporto usado como textura de fundo e card usado no HUD.
- **Verificação:** `pnpm check`, `pnpm build`, screenshot do título e do diálogo no preview.

## Configuração pendente
O briefing forneceu placeholders para nome, data real, nome do namorado e comida da pergunta 3. Eles estão sinalizados diretamente em `client/src/game/scene.ts` e podem ser trocados sem alterar a arquitetura.
