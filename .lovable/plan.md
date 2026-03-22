

## Refatoracao Completa do Kivo Circles — Modelo Skool

### Problema
A implementacao atual tem uma sidebar pesada com espaços, right sidebar de contexto, e navegacao confusa. O Skool usa uma estrutura radicalmente simples: **header horizontal com 5 tabs** + **coluna central unica** + **nenhuma sidebar permanente**.

### Estrutura Skool (referencia real)

```text
┌──────────────────────────────────────────────────────┐
│  [Logo/Nome comunidade]              [🔔] [avatar]   │  ← Header fixo
├──────────────────────────────────────────────────────┤
│  Community │ Classroom │ Calendar │ Members │ Leaderb│  ← Tab bar horizontal
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ Coluna central (max ~700px, centrada) ─────────┐ │
│  │                                                  │ │
│  │  [Categorias: All | 💬 Geral | 📢 Anuncios...] │ │  ← Filtro de espaços inline
│  │                                                  │ │
│  │  ┌─ Write a post... ──────────────────────────┐ │ │  ← Composer trigger
│  │  └───────────────────────────────────────────── │ │
│  │                                                  │ │
│  │  ┌─ Post Card ────────────────────────────────┐ │ │
│  │  │ [avatar] Nome · Level · 2h ago             │ │ │
│  │  │ Titulo do post (bold, grande)              │ │ │
│  │  │ Preview do body (2-3 linhas)...            │ │ │
│  │  │ ❤️ 12  💬 5                                │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  │                                                  │ │
│  │  [Post Card 2...]                               │ │
│  │  [Post Card 3...]                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key Skool patterns:**
- NO left sidebar. Navigation is a **horizontal tab bar** under the header.
- Spaces/categories are **horizontal pills** at the top of the feed, not a sidebar list.
- Single central column, no right sidebar.
- Posts are clean, minimal cards. Title is prominent.
- Mobile: same 5 tabs at the **bottom**.

---

### Plan de Implementacao

#### 1. Reescrever CircleLayout.tsx — Eliminar sidebars

**Remove**: Left sidebar (220px), right sidebar (280px), `CircleRightSidebar` component.

**New structure**:
- **Header fixo**: Logo/nome da comunidade (esquerda) + notificacao bell + avatar do membro (direita) + botao voltar ao dashboard
- **Tab bar horizontal** abaixo do header: `Community` | `Classroom` | `Calendar` | `Members` | `Leaderboard` (+ `Admin` se owner/admin, discreto)
- **Conteudo central**: `max-w-[700px] mx-auto` sem sidebars
- **Mobile**: mesmos 5 tabs no bottom (ja existe, manter)
- Manter toda logica de access control (landing page, banned, pending, etc.) intacta

#### 2. Reescrever CircleFeed.tsx — Feed estilo Skool

**Remove**: Select dropdowns de filtro de espaco/tipo (pesados, nao-Skool).

**New structure**:
- **Espacos como pills horizontais** no topo do feed: `All` | `💬 Geral` | `📢 Anuncios` | `❓ Perguntas` | `🏆 Conquistas` — scrollable horizontalmente no mobile
- **Composer trigger simplificado**: "Write a post..." com avatar (como Skool — minimo, sem botao grande)
- **Filtros inline**: apenas "Recent" | "Top" como pills pequenos abaixo dos espacos
- **Post cards**: manter PostCard existente mas ajustar para remover o `ml-[52px]` offset, fazer titulo maior e mais proeminente

#### 3. Ajustar PostCard.tsx — Cards mais limpos

- Titulo mais proeminente (`text-base font-bold`)
- Remover view_count (Eye icon) do footer — Skool nao mostra isso
- Footer mais simples: apenas ❤️ count + 💬 count
- Remover borda colorida por tipo (sutil demais, poluicao visual)
- Manter badges de tipo mas menores

#### 4. Eliminar CircleRightSidebar.tsx do layout

- O conteudo do right sidebar (about, leaderboard mini, proximo evento) vai para:
  - **About**: visivel na landing page (ja existe) e na pagina de Members
  - **Leaderboard mini**: removido (ja tem tab dedicada)
  - **Proximo evento**: removido (ja tem tab Calendar)
  - **Seus dados**: mover para o header (nivel/pontos ao lado do avatar)

#### 5. Ajustar rotas — `/circle/spaces/:slug` integrado ao feed

- Ao clicar num espaco nas pills, nao navega para `/circle/spaces/:slug`. Apenas filtra o feed in-place via state.
- Manter a rota `/circle/spaces/:slug` como fallback mas redirecionar para `/circle/feed` com filtro ativo.
- Remover a rota `/circle/spaces` (lista de espacos) do tab bar — espacos sao acessiveis via pills no feed.

#### 6. Renomear tabs para ingles (como Skool)

- "Feed" → "Community"
- "Classroom" (manter)
- "Eventos" → "Calendar"
- "Membros" → "Members"
- "Leaderboard" (manter)

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `src/components/circle/CircleLayout.tsx` | Reescrever: remover sidebars, header horizontal + tab bar |
| `src/pages/circle/CircleFeed.tsx` | Reescrever: espacos como pills, filtros simples |
| `src/components/circle/PostCard.tsx` | Ajustar: titulo maior, footer simples |
| `src/components/circle/CircleRightSidebar.tsx` | Remover uso no layout (pode manter arquivo) |
| `src/App.tsx` | Ajustar rotas se necessario |

### O que NAO muda
- Logica de access control (landing page, banned, pending, entitlement)
- PostComposer, CommentSection, SpaceFormModal
- Paginas de Leaderboard, Events, Members, Admin
- Banco de dados, queries, mutations
- NotificationPanel

