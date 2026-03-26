# 001 — Uso de Konva.js em vez de Fabric.js no Editor Visual

**Status:** Aceito

## Contexto

O Editor Visual do RegCheck precisa renderizar páginas de PDF como imagem de fundo e permitir que o usuário posicione campos interativos (texto, imagem, assinatura, checkbox) sobre essas páginas. Os campos precisam suportar arrastar, redimensionar, selecionar múltiplos ao mesmo tempo e exibir uma prévia de replicação (ghost fields) sem degradar a performance.

A solução precisava se integrar naturalmente ao ecossistema React, já que toda a interface do `apps/web` é construída com Next.js. Também era necessário suporte a grupos de elementos (para tratar um campo como uma unidade composta de retângulo + rótulo), eventos de drag/drop nativos no canvas e controle fino sobre camadas (PDF de fundo, campos, ghosts, grid, rubber band).

## Decisão

Decidimos usar **Konva.js** via **`react-konva`** como biblioteca de canvas interativo no Editor Visual (`apps/web/src/components/editor/editor-canvas.tsx`).

O `react-konva` expõe os primitivos do Konva (`Stage`, `Layer`, `Group`, `Rect`, `Text`, `Image`, `Transformer`) como componentes React, permitindo descrever o canvas de forma declarativa e integrar com hooks e estado do Zustand sem sair do modelo mental do React.

## Alternativas Consideradas

- **Fabric.js** — biblioteca madura com suporte a texto editável inline e serialização JSON nativa. Descartada porque não possui integração oficial com React (wrappers de terceiros são instáveis), o modelo de objetos é imperativo e dificulta sincronização com estado React, e o bundle é significativamente maior.

- **Canvas nativo (`<canvas>` + API 2D)** — máximo controle e zero dependências. Descartado porque exigiria implementar manualmente toda a lógica de hit-testing, drag/drop, seleção múltipla, transformações e camadas — complexidade desproporcional ao escopo do projeto.

- **SVG overlay sobre o PDF** — posicionar elementos SVG absolutos sobre a imagem do PDF renderizada. Descartado porque SVG tem limitações de performance com muitos elementos, não oferece suporte nativo a drag/resize com transformações, e a integração com zoom/pan do canvas seria complexa de manter.

## Consequências

- **Positivo:** Integração declarativa com React via `react-konva` — campos são componentes React (`<Group>`, `<Rect>`, `<Text>`) e respondem a mudanças de estado do Zustand sem manipulação imperativa do DOM.
- **Positivo:** Suporte nativo a grupos (`<Group>`) permite tratar cada campo como uma unidade (retângulo de fundo + rótulo de texto) com drag e transform aplicados ao grupo inteiro.
- **Positivo:** Eventos de drag/drop nativos do Konva (`draggable`, `onDragEnd`) eliminam a necessidade de implementar lógica de arrastar do zero.
- **Positivo:** Sistema de camadas (`<Layer>`) permite separar PDF de fundo, campos, ghosts de replicação, grid e rubber band de seleção sem conflito de eventos.
- **Positivo:** `<Transformer>` nativo do Konva oferece handles de redimensionamento com suporte a múltiplos nós selecionados simultaneamente.
- **Negativo/Tradeoff:** Konva não suporta texto editável inline — campos do tipo `text` exibem apenas um rótulo no canvas; a edição de propriedades acontece no painel lateral (`field-properties.tsx`), não diretamente no canvas.
- **Negativo/Tradeoff:** O canvas Konva é um elemento `<canvas>` opaco para o DOM, o que impede uso de ferramentas de acessibilidade baseadas em HTML e requer atenção especial para suporte a teclado.
