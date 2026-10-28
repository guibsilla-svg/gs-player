# GS PLAYER 0.6.0 — pacote de teste webOS + Android

Esta pasta é a cópia de desenvolvimento do GS PLAYER. Ela não altera `C:\Projetos\MeuStreaming` nem qualquer outra pasta do computador.

## O que está incluído

- Interface responsiva para TV, computador e celular Android.
- Catálogo M3U/M3U8, pesquisa, favoritos e conexão opcional com API Xtream Codes.
- Tentativa de carregar listas públicas de filmes e séries ao abrir; cache local quando o navegador permite; alguns endereços de filmes clássicos como fallback se a lista não carregar.
- PWA: manifesto, ícones Android e cache do app (a reprodução dos vídeos e o catálogo online ainda precisam de internet).
- Player HTML5 com mensagens de erro mais claras.

## Android — instalar como app sem Android Studio

O pacote é uma **PWA instalável**, não um APK nativo. É a forma mais simples para testar o mesmo app num celular Android sem instalar ferramentas de desenvolvimento.

1. Publique o conteúdo desta pasta em um site HTTPS. Uma opção gratuita é GitHub Pages: crie um repositório vazio, envie os arquivos desta pasta para a raiz e, em **Settings → Pages**, escolha publicar a branch principal a partir de `/ (root)`.
2. Abra o endereço HTTPS publicado no Chrome do celular Android.
3. No Chrome, toque em `⋮` → **Install app** ou **Add to Home screen** (o texto varia por versão).
4. Abra o GS PLAYER pelo ícone instalado.

O Service Worker só é registrado em HTTP/HTTPS e a instalação PWA normalmente exige HTTPS (ou localhost). Abrir `index.html` diretamente pelo gerenciador de arquivos não instala a PWA.

## Teste rápido no computador

Abra `index.html` no Chrome para conferir o layout. Para testar fetch/cache/service worker, rode um servidor HTTP local na pasta (ex.: `python -m http.server 8080`) e abra `http://localhost:8080`. Isso não testa a reprodução real na TV.

## LG webOS — gerar e instalar quando estiver perto da TV

Use a pasta extraída em `C:\Projetos\GS PLAYER\GS_PLAYER_v0_2_desenvolvimento` (ou outra pasta de teste separada; não substitua seu original sem backup). No PowerShell, a partir da pasta do projeto:

```powershell
npm.cmd list -g @webos-tools/cli
# Ajuste para a pasta de teste escolhida:
cd "C:\Projetos\GS PLAYER\GS_PLAYER_v0_2_desenvolvimento"
# Copie para essa pasta os arquivos desta versão antes de empacotar.
ares-package.cmd .
Get-ChildItem *.ipk
# Use exatamente o nome retornado acima:
ares-install.cmd --device tv2 .\NOME-EXATO-DO-PACOTE.ipk
ares-launch.cmd --device tv2 com.pessoal.gsplayer
```

A versão atual usa `appinfo.json` com ID `com.pessoal.gsplayer`, versão `0.6.0`.

## Limitações importantes antes do teste

- **Não afirmamos que o catálogo online ou cada link de vídeo foi validado**: o ambiente de construção não conseguiu alcançar os servidores externos durante a verificação. O app tentará carregar as listas ao iniciar e mostrará o resultado em Configurações.
- Listas M3U de terceiros, servidores Xtream e vídeos dependem de disponibilidade, autorização, CORS, codecs e compatibilidade do navegador/TV. O servidor Xtream pode recusar requisições feitas pelo navegador.
- A PWA funciona em Android pelo navegador; não há APK nativo compilado neste pacote.
- O código passou em `node --check`, os JSON foram validados e os seletores JS conferem com os IDs do HTML. Ainda é necessário testar em um Android real e na LG UM7500PSB para validar reprodução, controle remoto e desempenho.
- Use somente fontes e contas que você tem autorização para acessar.
