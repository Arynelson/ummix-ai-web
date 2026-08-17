# Ummix AI Web

Frontend React independente dos módulos `campaign-assistant` e
`campaign-content`. Este repositório é implantado no Vercel e conversa apenas
com o `ai-api`; ele não conhece nem recebe o `x-service-token` usado na
integração server-to-server com `services`.

## Desenvolvimento

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Verificação:

```powershell
npm.cmd test
npm.cmd run build
```

## Deploy no Vercel

Configure no projeto Vercel:

```dotenv
VITE_AI_API_URL=https://<url-do-ai-api>
VITE_UMMIX_WEB_URL=https://ummix.workingtech.com.br
VITE_CAMPAIGN_ASSISTANT_ENABLED=true
VITE_CAMPAIGN_CONTENT_ENABLED=false
```

O rewrite para `/index.html` permite que as rotas internas do SPA funcionem
diretamente no navegador. O conteúdo de campanha deve continuar desligado até
o `ai-api` e o adapter de `services` serem validados.

## Contratos

`contracts/` é uma cópia versionada dos contratos públicos compartilhados com o
`ai-api`. Versão atual: `0.1.0`. Qualquer alteração deve ser replicada no
repositório `ai-api` e registrada no manifesto central do workspace.
