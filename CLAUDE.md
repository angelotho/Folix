# Folix

Leitor e editor desktop de documentos Markdown para Windows 11, 100% offline. Electron 33 + React 18 + TypeScript + Vite 5 + Tailwind CSS 3, com pipeline `react-markdown`/remark/rehype e editor CodeMirror 6. Empacotado com `electron-builder` (NSIS, Windows x64).

Não há backend, banco de dados nem serviços remotos: tudo roda localmente na máquina do usuário.

## Skills do projeto

Antes de começar uma tarefa, verifique se alguma skill abaixo se aplica. Se sim, **leia o `SKILL.md` correspondente e siga as instruções dele**, mesmo que o usuário não peça a skill pelo nome.

| Skill                           | Arquivo                                               | Quando usar                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **commit-expert**               | `.claude/skills/commit-expert/SKILL.md`               | Usuário pede para commitar, "subir código" ou gerar versão. Sobe a versão no `package.json`/`package-lock.json`, atualiza versão, links e "Notas da Versão" do `README.md` e entrega os comandos git no chat (não executa). |
| **product-owner**               | `.claude/skills/product-owner/SKILL.md`               | Pedido de análise de regra de negócio, nova funcionalidade a especificar ou estudo de impacto. Gera especificação `.md` em `docs/PO/result/` e **para** — não implementa código. |
| **frontend-design**             | `.claude/skills/frontend-design/SKILL.md`             | Criar tela nova ou redesenhar uma existente: direção visual, tipografia, layout com identidade própria.                                                                          |
| **make-interfaces-feel-better** | `.claude/skills/make-interfaces-feel-better/SKILL.md` | Acabamento de UI: animações, hover, sombras, bordas, ícones, números tabulares, microinterações, "a tela parece estranha".                                                       |
| **web-design-guidelines**       | `.claude/skills/web-design-guidelines/SKILL.md`       | Revisar/auditar UI: acessibilidade, UX, boas práticas de interface.                                                                                                              |
| **search-ux**                   | `.claude/skills/search-ux/SKILL.md`                   | Busca e filtros: pesquisa interna no documento (`Ctrl+F`), filtro do sumário lateral, lista de documentos recentes, estado "sem resultados".                                     |
| **design-consultation**         | `.claude/skills/design-consultation/SKILL.md`         | Criar ou formalizar o design system / identidade visual do projeto (marca, tipografia, cores, espaçamento, motion). Pesquisa referências, gera preview HTML e escreve `DESIGN.md`. |
| **break-ui**                    | `.claude/skills/break-ui/SKILL.md`                    | Testar tela com dados extremos: documentos enormes, títulos/nomes de arquivo longos, tabelas largas, muitas abas, arquivo vazio, imagem ausente, estados de erro e carregamento. |
| **learn-taste**                 | `.claude/skills/learn-taste/SKILL.md`                 | Ao fim de uma sessão com correções de design do usuário: transformar as preferências em regras no `DESIGN.md`. |
| **pick-ui-library**             | `.claude/skills/pick-ui-library/SKILL.md`             | Antes de construir componente complexo (combobox, modal, toast, menu, popover): escolher biblioteca consolidada em vez de fazer na mão. Considere o peso no bundle e o funcionamento offline. |
| **ui-ux-pro-max**               | `.claude/skills/ui-ux-pro-max/SKILL.md`               | Consultar base local de design (estilos, paletas por tipo de produto, pares de fontes, 130 regras de UX, regras por stack React/Tailwind) ao desenhar, construir ou revisar telas. Requer Python 3 (`scripts/search.py`). |
| **impeccable**                  | `.claude/skills/impeccable/SKILL.md`                  | Projetar, redesenhar, criticar, auditar, polir ou animar frontend e design system (app UI, componentes, `DESIGN.md`). Subcomandos: `shape`, `audit`, `critique`, `polish`, `animate`, `typeset`, `colorize`, `layout`, `harden` etc. O launcher (`scripts/impeccable`) baixa um binário verificado por checksum na primeira execução. |

### Combinações comuns

- Tela ou painel novo → `frontend-design` + `make-interfaces-feel-better`
- Pesquisa no documento, filtro do sumário ou recentes → `search-ux` + `make-interfaces-feel-better`
- Criar/rever identidade visual → `design-consultation` (gera `DESIGN.md`), depois `frontend-design` para aplicar nas telas
- Revisão de tela pronta → `web-design-guidelines`
- Crítica de design ou auditoria visual mais profunda → `impeccable` (`critique` / `audit`), depois `impeccable polish` para o acabamento
- Escolher paleta/fontes/estilo ou checar regras de UX → `ui-ux-pro-max` (consulta), combinado com `design-consultation` ou `frontend-design`
- Funcionalidade grande → `product-owner` primeiro (especificar), implementar só após aprovação do usuário

## MCPs do projeto

Configurados em [.mcp.json](.mcp.json):

- **shadcn-ui** (`@jpisnice/shadcn-ui-mcp-server`, framework React): consulta de componentes, blocos e exemplos do shadcn/ui como referência de padrões de UI. O projeto **não** usa shadcn/ui nem Radix como dependência; ao aproveitar um padrão, adapte-o aos tokens `folix-*` e ao Tailwind do projeto em vez de instalar o pacote.

## Instalação de skills

Toda skill que for pedida para ser instalada deve ser adicionada **SOMENTE** em `.claude/skills/<nome>/`. Nunca crie nem use a pasta `.agents/` — ela não deve existir no projeto. Se um instalador (ex.: `npx skills add`) colocar a skill em outro lugar, mova para `.claude/skills/` e remova a pasta criada.

Após instalar uma skill, **sempre** adicione uma linha para ela na tabela "Skills do projeto" acima (nome, caminho `.claude/skills/<nome>/SKILL.md` e quando usar, com base na `description` do `SKILL.md`). Se fizer sentido, inclua-a também em "Combinações comuns". Ao remover uma skill, remova a linha correspondente.

## Comandos

Use sempre `npm.cmd` (PowerShell no Windows bloqueia `npm.ps1`).

- `npm.cmd run dev` — servidor Vite do renderer. O processo Electron usa `VITE_DEV_SERVER_URL` quando definida; caso contrário carrega `dist/index.html`.
- `npm.cmd run build` — gera ícones, compila o renderer (`dist/`) e o processo principal (`dist-electron/`, via `tsconfig.node.json`).
- `npm.cmd run dist` — build completo + `release/Folix-Setup-<versão>.exe` (instalador NSIS) **e** `release/Folix-<versão>.exe` (programa portátil, roda sem instalar). Sempre entregue os dois ao gerar uma versão.

Não há suíte de testes nem lint configurados. Para validar mudanças, rode `npm.cmd run build` (o `tsc` do processo principal e o build do Vite precisam passar sem erros).

## Arquitetura

- [electron/main.ts](electron/main.ts) — janela, instância única, handlers IPC (`ipcMain.handle`), protocolo `folix-asset://`, leitura/salvamento de arquivos, PDF, impressão e tema do sistema.
- [electron/preload.ts](electron/preload.ts) — expõe `window.folixAPI` via `contextBridge`. É a **única** ponte entre renderer e Node.
- [src/App.tsx](src/App.tsx) — orquestra abas, atalhos, modos Leitura/Edição/Dividido, drag & drop e configurações.
- [src/components/](src/components/) — UI (TitleBar, Toolbar, SidebarToc, MarkdownViewer, MarkdownEditor, SearchBar, modais etc.).
- [src/utils/](src/utils/) — slugs/sumário, `scrollSync` (mapeamento linha↔elemento entre leitor e editor), comandos de formatação Markdown, persistência e transição de tema.
- [src/types/folix.ts](src/types/folix.ts) — tipos compartilhados, incluindo a interface de `window.folixAPI`.

### Adicionando uma capacidade nativa

Toda funcionalidade que precise de Node/Electron segue o mesmo caminho: handler em `ipcMain.handle('<area>:<acao>')` no `main.ts` → método correspondente em `preload.ts` → tipo em `src/types/folix.ts` → uso via `window.folixAPI` no renderer. Nunca importe módulos Node ou `electron` no código de `src/`.

## Segurança (obrigatório)

- Mantenha `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`. Não os relaxe para resolver problemas.
- Navegação e novas janelas ficam bloqueadas (`setWindowOpenHandler` → `deny`, `will-navigate`). Links externos passam por `shell:open-external`, que aceita apenas `http:`, `https:` e `mailto:`.
- O HTML do Markdown é sempre sanitizado com `rehype-sanitize`. Ao permitir uma nova tag/atributo no schema, garanta que não habilita scripts, iframes ou manipuladores de evento.
- Imagens locais são servidas pelo protocolo `folix-asset://`, restrito ao escopo dos documentos abertos. Não use `file://` direto no renderer.
- Valide no processo principal todo caminho e dado recebido via IPC; não confie no renderer.

## Arquivos e edição

- O salvamento é atômico e preserva codificação (`UTF-8`, `UTF-8 BOM`, `UTF-16LE`) e quebras de linha (`CRLF`/`LF`) originais. Qualquer mudança no fluxo de leitura/escrita deve manter esse comportamento e a detecção de conflitos externos.
- Alterações não salvas são protegidas pelo `UnsavedChangesModal` ao fechar aba ou janela (`window:request-close` / `window:confirm-close`).
- Cada aba preserva histórico de desfazer/refazer, cursor e rolagem. Ao mexer no editor, no viewer ou em `scrollSync.ts`, verifique a alternância entre Leitura, Edição e Dividido em documentos longos.

## Design system

- Tokens de cor, sombra e superfície ficam em CSS variables `--folix-*` em [src/styles/globals.css](src/styles/globals.css), com temas claro (*Alabaster Editorial*) e escuro (*Obsidian Carbon*) via `[data-theme]`. No Tailwind, use as classes `folix-*` (`bg-folix-surface`, `text-folix-text-secondary`, `shadow-folix-md` etc.) em vez de cores fixas.
- Fontes (**Inter**, **Merriweather**, **JetBrains Mono**) são embarcadas via `@fontsource`. O app é offline: **nunca** carregue fontes, scripts, estilos ou imagens de CDN/URL remota.
- Ícones: `lucide-react`. Classes condicionais: `clsx` + `tailwind-merge`.
- A troca de tema usa View Transitions API ([src/utils/themeTransition.ts](src/utils/themeTransition.ts)) e não deve reprocessar o Markdown nem remontar componentes. Respeite `prefers-reduced-motion` em toda animação.
- O PDF/impressão usa tema claro próprio em `@media print`. Ao alterar a tipografia do documento, confira também a saída impressa.

## Idioma

Toda a interface, mensagens de erro e notas da versão são em **português brasileiro**. Mensagens de commit seguem Conventional Commits em inglês (ver `commit-expert`).

## Versionamento

Após `X.Y.9` vem `X.(Y+1).0` — nunca `X.Y.10`. A versão aparece no `package.json`, no `package-lock.json` e em vários pontos do `README.md` (badges, links de download e "Notas da Versão"); mantenha todos sincronizados.
