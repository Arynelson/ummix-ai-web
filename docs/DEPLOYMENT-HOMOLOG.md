# Deploy de homologação — ai-web

1. Criar um repositório Git separado para este conteúdo e publicar a branch.
2. Importar o repositório como projeto no Vercel.
3. Manter o diretório raiz do projeto como a raiz do repositório.
4. Configurar `VITE_AI_API_URL` com a URL pública do `ai-api` no Render.
5. Configurar `VITE_UMMIX_WEB_URL` com `https://ummix.workingtech.com.br`.
6. Publicar como Preview primeiro e validar o handoff e o fluxo de campanha.

O Vercel não deve receber `UMMIX_SERVICE_TOKEN`, `OPENAI_API_KEY` ou qualquer
segredo do backend.
