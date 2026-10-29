# Configurar a ponte de playlists do GS PLAYER

A ponte é necessária somente quando o endereço M3U não permite que o navegador acesse o conteúdo diretamente (erro CORS). Ela busca o **texto da playlist**, não retransmite os vídeos.

## Publicar no Cloudflare Workers

1. Entre em https://dash.cloudflare.com/ e crie uma conta gratuita, se ainda não tiver.
2. Abra **Workers & Pages** e escolha **Create** / **Create Worker**.
3. Dê um nome, por exemplo `gs-player-playlist`, e crie o Worker.
4. Abra a opção para editar o código (**Edit code**).
5. Substitua o exemplo de código pelo conteúdo completo de `worker.js) deste repositório.
6. Escolha **Deploy**.
7. Copie a URL HTTPS fornecida, geralmente parecida com `https://gs-player-playlist.seu-subdominio.workers.dev`.

## Conectar no GS PLAYER

1. Abra https://guibsilla-svg.github.io/gs-player/ e entre em **Configurações**.
2. Na seção **Ponte própria para URLs bloqueadas**, cole a URL do Worker.
3. Clique em **Salvar endereço da ponte**.
4. Volte à seção **Carregar playlist por URL**, cole o endereço M3U e clique em **Carregar URL**.

A URL do Worker fica salva no armazenamento local deste navegador/dispositivo. Se usar outro dispositivo, configure-a novamente.

## Limitações e segurança

- Use somente playlists públicas ou URLs às quais você tenha autorização de acesso. Não coloque senhas ou tokens privados dentro da URL.
- O Worker aceita apenas URLs HTTP/HTTPS públicas e limita a resposta da playlist a 10 MB.
- Algumas fontes exigem autenticação, bloqueiam acesso automatizado ou entregam conteúdo que não é M3U; essas fontes podem continuar falhando.
- O Worker é um serviço separado do GitHub Pages: editar o repositório não publica o Worker automaticamente.
- A cota e as condições gratuitas do Cloudflare podem mudar; confira o painel do serviço.
