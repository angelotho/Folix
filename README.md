<div align="center">

<img src="./public/icon.svg" alt="Emblema do Folix" width="88" height="88" />

# Folix

**Leitor e visualizador desktop profissional de documentos Markdown para Windows 11.**

![Versão](https://img.shields.io/badge/versão-1.1.5-4F46E5?style=flat-square)
[![Download v1.1.5](https://img.shields.io/badge/download-Folix--Setup--1.1.5.exe-4F46E5?style=flat-square&logo=windows)](https://github.com/angelotho/Folix/releases/download/v1.1.5/Folix-Setup-1.1.5.exe)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%2011%20x64-0EA5E9?style=flat-square)
![Offline](https://img.shields.io/badge/modo-100%25%20Offline-10B981?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-6366F1?style=flat-square)

</div>

---

## Visão Geral

O **Folix** foi criado para eliminar a necessidade de utilizar IDEs, editores de código, navegadores ou serviços online apenas para ler arquivos Markdown (`.md`, `.markdown`, `.mdown`, `.mkd`).

Em vez de exibir sintaxe bruta, o Folix interpreta o arquivo e entrega uma experiência de leitura editorial limpa, organizada e visualmente sofisticada — semelhante a relatórios técnicos, manuais e publicações profissionais — mantendo desempenho fluido e funcionamento **100% offline**.

---

## Download (Instalador Windows)

- **Download direto (v1.1.5 — x64)**: [Folix-Setup-1.1.5.exe](https://github.com/angelotho/Folix/releases/download/v1.1.5/Folix-Setup-1.1.5.exe)
- **Página da Release**: [Folix v1.1.5](https://github.com/angelotho/Folix/releases/tag/v1.1.5)

---

## Design System e Identidade Visual

O Folix utiliza um sistema visual próprio construído sob o conceito **Editorial Precision**:

| Tema | Paleta e Proposta |
| --- | --- |
| **Claro (*Alabaster Editorial*)** | Superfície de papel branco sobre fundo alabastro suave (`#F4F2ED`), tipografia de alto contraste (`#181816`) e acentos em Índigo Safira (`#4F46E5`). |
| **Escuro (*Obsidian Carbon*)** | Fundo profundo em carbono (`#0B0C10`), folha de leitura elevada (`#111319`), alto conforto noturno e realce de sintaxe balanceado. |
| **Sistema** | Sincroniza automaticamente com a preferência de tema claro/escuro do Windows 11. |

As famílias tipográficas (**Inter**, **Merriweather** e **JetBrains Mono**) são embarcadas localmente via `@fontsource`, garantindo consistência visual sem acesso à internet.

---

## Principais Recursos

### Leitura e Renderização Markdown
- **GitHub Flavored Markdown (GFM)**: títulos (`H1`–`H6`), parágrafos, negrito, itálico, tachado, listas numeradas e com marcadores, checklists, tabelas estilizadas, divisores e citações.
- **Alertas Editoriais**: renderização dedicada para callouts `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` e `[!CAUTION]`.
- **Blocos de Código Modernos**: realce de sintaxe automático (`highlight.js`), identificação da linguagem e botão de cópia rápida com confirmação visual.
- **Imagens Relativas e Lightbox**: carregamento seguro de imagens locais referenciadas relativamente ao documento (`folix-asset://`), com visualização ampliada ao clicar e fallback elegante caso a imagem esteja ausente.
- **Links Inteligentes**: navegação suave para âncoras internas (`#secao`), abertura de links relativos `.md` em novas abas e abertura segura de links externos (`http:`, `https:`, `mailto:`) no navegador padrão do Windows.

### Navegação, Produtividade e Exportação
- **Múltiplas Abas**: abra e alterne entre diversos arquivos simultaneamente, preservando a posição de rolagem em cada documento.
- **Sumário Lateral Inteligente**: gerado automaticamente pelos títulos do documento, com destaque automático da seção visível durante a leitura (*scroll-spy*), filtro rápido e painel recolhível.
- **Pesquisa Interna (`Ctrl+F`)**: busca com destaque visual em tempo real, opção de diferenciar maiúsculas/minúsculas e navegação entre ocorrências.
- **Personalização Persistente**: controle de tamanho do texto (`80%`–`160%`), troca de tipografia (*Moderna*, *Editorial* ou *Técnica*), largura da página (*Confortável*, *Ampla* ou *Expandida*) e **Modo Foco Imersivo (`F11`)**.
- **Exportação Vetorial para PDF e Impressão**: geração de PDF em formato A4 com tema claro editorial exclusivo (`@media print`), margens balanceadas, paginação no rodapé e prevenção de quebras de página dentro de tabelas, blocos de código e imagens.

### Segurança e Integração com Windows 11
- **Tratamento Seguro de Markdown**: sanitização de HTML com `rehype-sanitize` impedindo execução de scripts, iframes e manipuladores de eventos.
- **Isolamento de Processo**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` e acesso local restrito ao escopo dos documentos abertos.
- **Integração Nativa**: instância única ao abrir arquivos pelo Explorador de Arquivos, abertura por *drag & drop*, histórico de documentos recentes e mensagens de erro claras em português brasileiro.

---

## Atalhos de Teclado

| Atalho | Ação |
| --- | --- |
| `Ctrl + N` | Criar novo documento Markdown |
| `Ctrl + O` | Abrir documento(s) Markdown |
| `Ctrl + ,` | Abrir Configurações e Temas |
| `Ctrl + W` | Fechar aba atual |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Alternar entre abas abertas |
| `Ctrl + B` | Mostrar ou recolher o sumário lateral |
| `Ctrl + F` | Pesquisar no documento |
| `Ctrl + R` | Recarregar arquivo do disco |
| `Ctrl + +` / `Ctrl + -` / `Ctrl + 0` | Aumentar, diminuir ou restaurar tamanho do texto |
| `Ctrl + E` | Exportar para PDF |
| `Ctrl + P` | Imprimir no Windows |
| `F11` ou `Ctrl + Shift + F` | Alternar Modo Foco (leitura imersiva) |

---

## Arquitetura e Stack Técnica

- **Desktop & Empacotamento**: Electron 33 + `electron-builder` (NSIS para Windows x64)
- **Interface**: React 18, TypeScript, Tailwind CSS e ícones `lucide-react`
- **Pipeline Markdown**: `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize`, `rehype-slug`, `rehype-highlight` e `github-slugger`
- **Build Frontend**: Vite 5

```text
Folix/
├── build/                   # Ícones nativos do aplicativo (.ico e .png)
├── electron/
│   ├── main.ts              # Janela, instância única, IPC seguro, protocolo folix-asset:// e PDF
│   └── preload.ts           # ContextBridge expondo window.folixAPI
├── public/
│   └── icon.svg             # Emblema vetorial do Folix
├── scripts/
│   └── generate-icons.mjs   # Gerador programático dos ícones Windows multi-resolução
├── src/
│   ├── components/          # TitleBar, Toolbar, SidebarToc, MarkdownViewer, SearchBar, etc.
│   ├── styles/              # Tokens do Design System, tipografia prose e @media print
│   ├── types/               # Definições TypeScript compartilhadas
│   ├── utils/               # Extração de sumário/slugs, persistência local e formatação
│   ├── App.tsx              # Orquestração da aplicação, abas, atalhos e drag & drop
│   └── main.tsx             # Inicialização React e carregamento das fontes locais
├── electron-builder.yml     # Configuração do instalador NSIS e associação de arquivos .md
├── package.json             # Dependências e scripts de build/distribuição
└── README.md                # Documentação do projeto
```

---

## Desenvolvimento e Compilação

### Pré-requisitos (apenas para compilar o código-fonte)
- **Windows 10/11 (x64)**
- **Node.js 20+** e **npm**

> Usuários finais não precisam de Node.js ou ferramentas de programação: basta executar o instalador gerado (`Folix-Setup-1.1.5.exe`).

### Comandos

```powershell
# 1. Instalar dependências
npm.cmd install

# 2. Gerar ícones, compilar frontend (dist/) e processo Electron (dist-electron/)
npm.cmd run build

# 3. Gerar executável e instalador Windows (.exe) em release/
npm.cmd run dist
```

---

## Notas da Versão

### v1.1.5
- O Folix passa a avisar quando há uma versão nova: um aviso discreto no canto inferior direito permite **Atualizar** sem sair do aplicativo e, ao fim do download, escolher **Reiniciar** na hora ou instalar **Ao fechar**. Alterações não salvas continuam protegidas antes de reiniciar.
- Na versão portátil, o aviso traz o botão **Baixar**, que abre a página da nova versão.
- Nova opção nas Configurações: **Verificar atualizações ao iniciar** (ligada por padrão). A verificação consulta apenas o GitHub e não envia nenhum dado seu.
- A janela do Folix agora sempre abre maximizada, ocupando a tela toda.

### v1.1.4
- Tela inicial reorganizada: as ações **Abrir arquivo** e **Novo documento** ficam empilhadas, com a mesma largura, liberando mais espaço para o texto de apresentação.
- Cada versão passa a ser distribuída também como programa portátil (`Folix-<versão>.exe`), que roda sem instalação, além do instalador.

### v1.1.3
- Criação de novos documentos Markdown diretamente no Folix (`Ctrl + N`, botão **+** na barra de abas ou **Novo documento** na tela inicial), abrindo uma aba **Sem título** pronta para escrever, sem escolher nome ou pasta antes.
- Primeiro salvamento (`Ctrl + S`) pela janela nativa do Windows, com sugestão de nome a partir do primeiro título do documento e extensão `.md` garantida; os salvamentos seguintes gravam direto no arquivo escolhido.
- Suporte a vários documentos novos ao mesmo tempo, com proteção contra perda de alterações não salvas ao fechar abas ou o aplicativo.

### v1.1.2
- Sincronização estrutural bidirecional precisa entre os modos **Leitura** e **Edição** (e visualização **Dividida**) baseada no mapeamento linha-a-elemento da árvore Markdown (títulos, parágrafos, listas, tabelas, citações, imagens e blocos de código).
- Posicionamento convergente antes da pintura no CodeMirror 6, eliminando desvios causados por estimativas de altura de blocos fora do viewport (`.cm-gap`) em documentos Markdown extensos e evitando saltos ou piscadas visuais durante a alternância de modo.
- Preservação inteligente da posição ativa do cursor e sincronização contínua do sumário lateral durante a navegação e edição.

### v1.1.1
- Novo modo de **Edição Markdown** integrado (alternância rápida **Leitura | Edição** via barra de ferramentas ou `Ctrl + Shift + E`) baseado em CodeMirror 6, com preservação por aba do histórico de desfazer/refazer (`Ctrl + Z`, `Ctrl + Y`, `Ctrl + Shift + Z`), cursor e rolagem.
- Barra contextual discreta de formatação (títulos, negrito, itálico, tachado, código inline, bloco de código, listas, checklists, citações, links, tabelas e separadores) com atalhos convencionais e visualização **Dividida** opcional com prévia renderizada otimizada.
- Salvamento local seguro e atômico (`Ctrl + S`) e **Salvar como** (`Ctrl + Shift + S`) preservando codificação (`UTF-8`, `UTF-8 BOM`, `UTF-16LE`) e quebras de linha (`CRLF`/`LF`), com detecção de conflitos externos e modal de proteção contra perda de alterações não salvas.

### v1.1.0
- Otimização da transição entre os temas **Claro**, **Escuro** e **Sistema** via composição por GPU (`View Transitions API`), eliminando travamentos e recálculos pesados em documentos Markdown extensos.
- Eliminação de re-processamento completo do Markdown e de reconstrução de componentes durante a troca de tema, preservando exatamente a posição de leitura e o estado das abas, busca e sumário lateral.
- Suporte integral à preferência de acessibilidade de redução de movimento (`prefers-reduced-motion`) e persistência assíncrona no processo principal.

### v1.0.9
- Exibição estritamente contextual de atalhos de teclado na tela inicial (mantendo exclusivamente `Ctrl + O` para abrir arquivos e `Ctrl + ,` para configurações).
- Reorganização equilibrada e elegante dos atalhos na Home, preservando a disponibilidade integral de todos os atalhos durante a leitura de documentos.

### v1.0.8
- Novo indicador visual minimalista de abertura de documentos com o símbolo oficial, nome do arquivo e barra luminosa progressiva, seguido por revelação suave do conteúdo formatado.

### v1.0.6
- Integração da identidade visual oficial do **Folix** (composição completa para temas Claro/Escuro, símbolo isolado, ícone Windows `.ico` multi-resolução e emblema vetorial).
- Nova **Splash Screen** editorial animada integrada ao tema ativo e à prontidão real de inicialização da aplicação.

### v1.0.3
- Nova área de **Configurações** (`Ctrl + ,`) acessível em toda a aplicação, com cartões de prévia visual dos temas **Claro**, **Escuro** e **Sistema**.
- Acompanhamento em tempo real das alterações de tema do Windows 11, transição suave sincronizada e inicialização direta sem piscadas.

### v1.0.0
- Lançamento inicial do **Folix** para Windows 11 (x64) com leitor Markdown offline, sumário lateral, múltiplas abas, pesquisa interna, exportação vetorial para PDF, impressão nativa e instalador NSIS com associação de arquivos `.md`.
