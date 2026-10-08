# Workshop PyStart – página de conversão

Página estática (HTML + CSS + JS), sem build. Pronta para o GitHub Pages.

## O que preencher (arquivo `config.js`)
1. `whatsapp`: seu número com DDI e DDD, só dígitos. Ex.: `5511912345678`.
2. `vagasConfirmadas`: atualize a cada pagamento confirmado (hoje: 1).
3. (Opcional) `pixelId`: ID do Pixel da Meta.

No `index.html`, troque `SEU-USUARIO` e `SEU-REPOSITORIO` nas duas linhas `og:url` e `og:image`
pelo endereço real da página. Sem isso, o link não mostra imagem de prévia ao ser compartilhado.

## Como publicar no GitHub Pages
1. Crie um repositório novo no GitHub (ex.: `pystart`) e envie todos os arquivos desta pasta.
2. No repositório: **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Escolha a branch `main` e a pasta `/ (root)` e clique em **Save**.
4. Em 1 a 2 minutos a página fica em `https://SEU-USUARIO.github.io/pystart/`.

## Comportamento automático
- Vagas: quando `vagasConfirmadas` = `vagasTotal`, a página troca o botão de pagamento por "lista de espera".
- Depois de 14/10 às 19h30 (horário de Brasília), mostra "Turma 01 já começou".
- Enquanto `whatsapp` estiver vazio, os botões de WhatsApp ficam escondidos no site publicado.

## Vídeo da Joseane
- O vídeo aparece direto na página (player do YouTube). Para trocar, mude `videoId` em `config.js`.
- No YouTube Studio, o vídeo precisa estar **Público** ou **Não listado** e com **"Permitir incorporação"** ligado.
- Se for um vídeo em pé (Shorts), coloque `videoFormato: "vertical"`.
- O player só funciona com a página publicada (GitHub Pages). Abrir o `index.html` com dois cliques no computador pode dar erro de incorporação do YouTube.
