# Creator Board

Dashboard local para organizar vídeos do YouTube com React, TypeScript, Vite e Tailwind.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra a URL mostrada pelo Vite, normalmente `http://127.0.0.1:5173`.

## Como publicar como Web App

O projeto ja esta preparado para Vercel e Netlify.

1. Crie um repositorio no GitHub e envie os arquivos do projeto.
2. Na Vercel ou Netlify, importe esse repositorio.
3. Use o comando de build `npm run build`.
4. Use a pasta de saida `dist`.
5. Crie a variavel de ambiente:

```bash
VITE_YOUTUBE_CLIENT_ID=238276840626-5h0b0d1k0l6fpgbj0uifm3rb930odkmp.apps.googleusercontent.com
```

Depois de publicar, copie o dominio final do app, por exemplo `https://creator-board.vercel.app`, e adicione esse dominio no Google Cloud em:

- APIs e servicos
- Credenciais
- Seu OAuth Client ID
- Origens JavaScript autorizadas

Mantenha tambem `http://127.0.0.1:5173` autorizado para continuar usando a versao local.

Importante: nesta fase, os dados continuam salvos no navegador via `localStorage`. Isso significa que cada navegador/dispositivo tera seus proprios dados. Para sincronizar tudo entre PCs, a proxima etapa e adicionar um banco online.

## Como abrir como programa no Windows

Depois de instalar as dependencias uma vez:

```bash
npm install
npm run desktop
```

Isso abre o Creator Board em uma janela propria, sem precisar abrir o navegador manualmente.

Para gerar uma pasta de programa, sem instalador:

```bash
npm run dist:desktop
```

O programa fica em `release/win-unpacked/Creator Board.exe`. Voce pode abrir esse `.exe` direto e fixar na barra de tarefas.

Para gerar uma versao portatil em um unico `.exe`:

```bash
npm run dist:desktop:portable
```

Para gerar um instalador tradicional:

```bash
npm run dist:desktop:installer
```

Se o Windows mostrar erro sobre "symbolic link" ou acesso negado ao criar instalador/portable, rode o terminal como administrador ou ative o Modo de Desenvolvedor do Windows. A pasta `win-unpacked` costuma evitar esse bloqueio.

Importante: a conexao com Google/YouTube continua usando `http://127.0.0.1:5173`, entao mantenha esse endereco autorizado no Google Cloud.

## Como instalar pelo navegador

Tambem existe uma alternativa leve: abra `http://127.0.0.1:5173` no Edge ou Chrome e use a opcao "Instalar este site como aplicativo". Depois disso, o Creator Board abre em uma janela propria e pode ser fixado na barra de tarefas.

## Comandos

```bash
npm run typecheck
npm run build
npm run web:preview
npm run desktop
npm run dist:desktop
npm run dist:desktop:portable
npm run dist:desktop:installer
npm run preview
```

## Dados

O app salva tudo no `localStorage`.

- Dados atuais: `creator-board-data-v2`
- Rascunho de nova ideia: `creator-board-new-video-draft-v2`
- Chaves antigas preservadas e migradas automaticamente:
  - `creator-board-youtube-v1`
  - `creator-board-daily-checklist-v1`
  - `creator-board-weekly-goal-v1`
