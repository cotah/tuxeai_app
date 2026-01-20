# Deploy no Render - Guia Completo

## ✅ Status Atual

- ✅ Banco PostgreSQL criado e configurado
- ✅ 13 tabelas criadas
- ✅ 4 agentes populados no catálogo
- ✅ Web Service criado (`tuxeai_app`)
- ⚠️ Faltam variáveis de ambiente

## 🔧 Configuração de Variáveis de Ambiente

### Opção 1: Via Dashboard do Render (Recomendado)

1. Acesse: https://dashboard.render.com
2. Clique no seu Web Service `tuxeai_app`
3. Vá em **"Environment"** no menu lateral
4. Clique em **"Add Environment Variable"**
5. Adicione TODAS as variáveis abaixo:

```
DATABASE_URL=postgresql://app_user:7ttOZBS0mEEGhO9bep18bYRfhLjpWA4i@dpg-d5njbkmr433s739pk2dg-a.frankfurt-postgres.render.com/restaurant_platform_r1dp

JWT_SECRET=tuxeai-super-secret-jwt-key-2026-change-in-production

OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth
VITE_APP_ID=tuxeai_app
OWNER_OPEN_ID=owner_default
OWNER_NAME=Admin

VITE_APP_TITLE=Restaurant AI Workforce
VITE_APP_LOGO=

NODE_ENV=production
```

6. Clique em **"Save Changes"**
7. O Render vai fazer redeploy automaticamente

### Opção 2: Via API do Render

```bash
# Get your API key from: https://dashboard.render.com/account/settings
./scripts/setup-render-env.sh srv-d5njc6t4tr6s73d8ofkg YOUR_API_KEY
```

## 🚀 Após Adicionar as Variáveis

1. Aguarde o redeploy terminar (5-10 minutos)
2. Acesse: https://tuxeai-app.onrender.com
3. A landing page deve aparecer
4. O marketplace de agentes deve funcionar

## 🔍 Verificação

### Verificar se o servidor está rodando:

```bash
curl https://tuxeai-app.onrender.com/api/trpc/auth.me
```

Deve retornar JSON (mesmo que seja erro de autenticação, significa que o servidor está up)

### Verificar banco de dados:

```bash
PGPASSWORD=7ttOZBS0mEEGhO9bep18bYRfhLjpWA4i psql -h dpg-d5njbkmr433s739pk2dg-a.frankfurt-postgres.render.com -U app_user -d restaurant_platform_r1dp -c "SELECT COUNT(*) FROM agent_catalog;"
```

Deve retornar: `4` (os 4 agentes)

## 📝 Próximos Passos

### 1. Integração Stripe (Billing)

- Criar conta Stripe: https://stripe.com
- Obter API keys (test mode)
- Adicionar variável: `STRIPE_SECRET_KEY`
- Criar produtos e preços no Stripe
- Configurar webhooks

### 2. Integração WhatsApp Business API

- Criar conta Meta Business: https://business.facebook.com
- Configurar WhatsApp Business API
- Obter credenciais
- Adicionar variáveis:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

### 3. Implementar Dashboard Administrativo

- Criar páginas de gestão
- Analytics e métricas
- Configuração de agentes
- Gerenciamento de clientes

### 4. Testes e Validação

- Testar fluxo completo de onboarding
- Testar subscrição de agentes
- Testar integrações
- Performance e otimização

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
- Verifique se DATABASE_URL está correta
- Teste conexão manual com psql

### Erro: "OAuth not configured"
- Adicione todas as variáveis OAUTH_*
- Reinicie o serviço

### Build falha
- Verifique logs no Render dashboard
- Procure por erros de TypeScript
- Verifique se todas as dependências estão no package.json

## 📞 Suporte

Para problemas específicos do Render:
- Docs: https://render.com/docs
- Support: https://render.com/support

Para problemas do código:
- Veja logs em: https://dashboard.render.com → seu serviço → Logs
- Verifique ARCHITECTURE.md para entender a estrutura
