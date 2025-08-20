# Migração do Sistema de Scoring

## Funções SQL Existentes (Backup)

### 1. calculate_lead_score (versão antiga - não usada)
```sql
-- Função básica que calculava score com valores fixos
-- Usava apenas contagem de eventos e dias desde criação
-- Não integrada com WhatsApp/Mailchimp
```

### 2. calculate_lead_score_integrated (versão atual - PROBLEMA: valores hard-coded)
```sql
-- Valores fixos no código:
-- whatsapp_message_read: 15 pontos (deveria usar SCORE_WHATSAPP_READ)
-- whatsapp_reply: 20 pontos (deveria usar SCORE_WHATSAPP_REPLY)
-- email_open: 5 pontos (deveria usar SCORE_EMAIL_OPEN)
-- email_click: 10 pontos (deveria usar SCORE_EMAIL_CLICK)
-- in_launch_group: 25 pontos (deveria usar SCORE_GROUP_JOIN)
-- Limites: hot >= 70, warm >= 40 (deveriam usar SCORE_HOT_THRESHOLD, SCORE_WARM_THRESHOLD)
```

### 3. trigger_recalculate_score
```sql
-- Trigger function que chama calculate_lead_score_integrated
-- Acionada quando novo evento é inserido em lead_events
```

## Nova Implementação

### calculate_lead_score_dynamic
- Busca valores de app_settings dinamicamente
- Usa configurações para cada tipo de evento
- Aplica limites configuráveis de temperatura
- Mantém performance com cache temporário

### recalculate_all_lead_scores
- Recalcula scores de todos os leads
- Pode filtrar por campanha
- Retorna progresso para UI

## Tipos de Eventos Padronizados

### Email (Mailchimp)
- `email_open` - Email aberto
- `email_click` - Link clicado
- `email_multiple_opens` - Múltiplas aberturas
- `email_bounce` - Email retornado
- `email_unsubscribe` - Descadastro

### WhatsApp (Evolution API)
- `whatsapp_read` - Mensagem individual lida
- `whatsapp_group_read` - Mensagem em grupo lida
- `whatsapp_reply` - Resposta enviada
- `whatsapp_link_click` - Link clicado
- `whatsapp_group_join` - Entrou no grupo

### Outros
- `landing_page_visit` - Visita à landing page
- `video_watch` - Vídeo assistido
- `form_submit` - Formulário enviado

## Processo de Migração

1. ✅ Backup das funções antigas (este documento)
2. ⏳ Criar nova função dinâmica
3. ⏳ Testar com subset de leads
4. ⏳ Migrar trigger
5. ⏳ Remover funções antigas
6. ⏳ Atualizar documentação