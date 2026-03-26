# 002 — Uso de Coordenadas Relativas (0–1) em FieldPosition

**Status:** Aceito

## Contexto

O RegCheck permite que o usuário posicione campos sobre páginas de um PDF base no Editor Visual. Cada campo precisa ter sua posição e dimensão armazenadas no banco de dados para que o `@regcheck/pdf-engine` possa reproduzir o overlay exatamente na hora de gerar o PDF preenchido.

PDFs têm dimensões variáveis: uma página A4 em retrato tem 595 × 842 pontos, mas o mesmo template pode ser aplicado a um PDF com páginas de tamanho diferente (carta, ofício, paisagem). Além disso, o editor renderiza o PDF em tela com zoom variável — a resolução de exibição em pixels não corresponde às dimensões reais do documento em pontos PDF.

Se as coordenadas fossem armazenadas em pontos PDF absolutos ou em pixels de tela, qualquer troca do PDF base ou mudança de zoom no editor quebraria o posicionamento de todos os campos do template.

## Decisão

Decidimos armazenar as coordenadas de cada campo como **frações da dimensão da página**, no intervalo `[0, 1]`, usando o tipo `FieldPosition`:

```ts
interface FieldPosition {
  x: number;      // fração da largura da página (0 = esquerda, 1 = direita)
  y: number;      // fração da altura da página (0 = topo, 1 = base)
  width: number;  // fração da largura da página
  height: number; // fração da altura da página
}
```

Essa representação é independente de resolução, zoom e tamanho físico da página. O valor `x: 0.1, y: 0.05, width: 0.4, height: 0.03` significa sempre "10% da largura a partir da esquerda, 5% da altura a partir do topo, ocupando 40% de largura e 3% de altura" — independentemente do PDF usado.

## Alternativas Consideradas

- **Coordenadas absolutas em pontos PDF** — armazenar `x`, `y`, `width`, `height` diretamente em pontos PDF (unidade nativa do pdf-lib). Descartado porque as coordenadas seriam válidas apenas para o PDF base original; trocar o PDF base ou usar templates em PDFs de tamanho diferente quebraria todos os campos. Também exigiria que o editor conhecesse as dimensões exatas do PDF em pontos na hora de salvar.

- **Coordenadas em pixels da tela** — armazenar as posições em pixels conforme renderizadas pelo `pdfjs-dist` no canvas do editor. Descartado porque os pixels dependem do nível de zoom atual e da resolução do dispositivo (DPI), tornando as coordenadas não portáveis entre sessões, dispositivos e tamanhos de janela.

## Consequências

- **Positivo:** Coordenadas são independentes de resolução, zoom e tamanho físico da página — o mesmo `FieldPosition` funciona em qualquer PDF base.
- **Positivo:** Troca do PDF base de um template não invalida as posições dos campos existentes.
- **Positivo:** O editor pode renderizar o PDF em qualquer zoom e converter as coordenadas relativas para pixels de tela multiplicando pelas dimensões do canvas renderizado.
- **Negativo/Tradeoff:** O `@regcheck/pdf-engine` precisa converter as coordenadas relativas para pontos PDF absolutos na hora de gerar o overlay. A fórmula de conversão é:

```ts
const absX = pos.x * pageWidth;
const absY = pageHeight - (pos.y * pageHeight) - (pos.height * pageHeight);
const absWidth = pos.width * pageWidth;
const absHeight = pos.height * pageHeight;
```

> **Nota:** O eixo Y é invertido porque o pdf-lib usa origem no canto inferior esquerdo, enquanto o editor usa origem no canto superior esquerdo (convenção de tela).

- **Negativo/Tradeoff:** O editor (`apps/web/src/components/editor/editor-canvas.tsx`) precisa converter as coordenadas relativas para pixels ao renderizar os campos sobre o canvas Konva, e converter de volta para relativas ao salvar via autosave.
- **Negativo/Tradeoff:** Valores fora do intervalo `[0, 1]` indicam campos posicionados fora da página — o editor deve validar e restringir o drag/resize para evitar esse estado inválido.

Veja também: [`docs/architecture.md`](../architecture.md) — seção "Sistema de Coordenadas Relativas".
