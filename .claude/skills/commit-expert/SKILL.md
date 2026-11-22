---
name: Especialista em Commits (Commit Expert)
description: Especialista em preparar o repositório para commit. Sobe a versão no package.json/package-lock.json, atualiza versão, links de download e notas da versão no README.md e gera o bloco de comandos git no chat para o usuário rodar.
---

# Especialista em Commits

Você ativou a skill de **Especialista em Commits**. Seu objetivo não é executar os comandos de versionamento por conta própria, mas sim preparar o ambiente (versionamento) e entregar o código pronto para o usuário colar no terminal.

## Fluxo Obrigatório de Execução

Sempre que for solicitado a gerar um commit (ou o usuário disser "quero comittar", "subir código", "gerar versão" etc.), siga estritamente os passos abaixo:

### Passo 1: Atualizar a Versão (package.json e package-lock.json)
Modifique diretamente o campo `version` do `package.json`, incrementando a versão atual.
- **Regra de Versionamento:** Adicione 1 à numeração final. Por exemplo, de `1.0.0` vá para `1.0.1`.
- *Atenção à virada de dezena:* Se a versão atual terminar em `.9` (ex: `1.2.9`), a dezena sobe e a unidade zera, tornando-se `1.3.0`. Nunca gere `X.Y.10`.
- Atualize também a versão no `package-lock.json` (campo `version` da raiz **e** de `packages[""]`), para que os dois arquivos fiquem consistentes.

### Passo 1.1: README.md (versão, download e "Notas da Versão")
O `README.md` é o canal de release do Folix. Substitua a versão antiga pela nova em:
- Badge `![Versão](...versão-X.Y.Z-...)`.
- Badge e links de download: `Folix-Setup-X.Y.Z.exe` e `releases/download/vX.Y.Z/...`.
- Seção "Download (Instalador Windows)" (download direto e página da release `releases/tag/vX.Y.Z`).
- Menção ao instalador em "Desenvolvimento e Compilação".

Na seção **"Notas da Versão"**:
- Se a nova versão traz mudanças **visíveis para o usuário**, adicione um bloco `### vX.Y.Z` **no topo** da lista, com bullets curtos escritos na linguagem de quem usa o app, seguindo o estilo das entradas existentes.
- Se a versão for apenas técnica (sem impacto para o usuário), não crie entrada nas notas, mas atualize as versões dos links normalmente.
- Informe no chat se a versão terá ou não notas publicadas.

### Passo 2: Gerar os Comandos no Chat
Depois de salvar os arquivos, **gere um bloco de código no chat**.
**NUNCA execute esses comandos** no terminal. Você apenas entrega o texto.

A mensagem de commit segue o padrão Conventional Commits usado no histórico do projeto (em inglês), terminando com a versão. Exemplos: `fix(editor): sync reading and editing positions and release v1.1.2`, `chore(release): bump version to v1.0.9`.

```bash
git status
git add .
git commit -m "<tipo>(<escopo>): <resumo> and release v[NOVA_VERSAO]"
git push origin main
```

Lembre o usuário de que `npm.cmd run dist` gera o instalador (`release/Folix-Setup-[NOVA_VERSAO].exe`) e o programa portátil (`release/Folix-[NOVA_VERSAO].exe`), e que o instalador precisa ser anexado à release `v[NOVA_VERSAO]` no GitHub para que os links do README funcionem. Para a atualização automática funcionar, anexe também `release/latest.yml` e `release/Folix-Setup-[NOVA_VERSAO].exe.blockmap`, e publique a release como **Latest** (não como rascunho nem pré-release).

Seu trabalho finaliza ao exibir esse bloco, aguardando o usuário copiar e colar.
