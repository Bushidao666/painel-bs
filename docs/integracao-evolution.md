# Integração Evolution API (WhatsApp)

Este documento descreve a arquitetura unificada da integração com a Evolution API para WhatsApp, cobrindo backend, frontend, Supabase (Edge Functions), banco de dados e práticas de operação.

## Arquitetura
- Webhook único: Evolution → Supabase Edge Function `evolution-webhook`.
- Next.js: rotas `/api/whatsapp/**` para ações síncronas (connect, status, envio de mensagem/grupos) e persistência em `whatsapp_instances`.
- Frontend: `useWhatsAppConnection` + Realtime das mudanças em `whatsapp_instances`. Modal exibe QR normalizado.
- Sync: Edge `sync-evolution-data` para processamento de leads, grupos e eventos.

## Variáveis de ambiente (Edge Functions)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (SRK)
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`
- `WEBHOOK_API_KEY` (opcional, para validar origem no webhook)

## Webhook (Supabase)
- Função: `evolution-webhook`
- Mapeia eventos da Evolution para `whatsapp_instances.status` e salva `qr_code` quando disponível (expiração ~30s).
- Atualiza `phone_number`, `connected_at`, e limpa campos ao desconectar.
- Endpoint Next.js legado `/api/webhooks/evolution` está DEPRECADO.

## Fluxo de conexão (Next.js)
1. POST `/api/whatsapp/connect/[name]`
   - Chama Evolution `connect` e normaliza QR:
     - `code` (string) → render via `react-qr-code`.
     - `base64` (com/sem `data:image`) → `<img src=...>`.
     - `pairingCode` → fallback (string).
   - Se Evolution indicar `state=open`, retorna `{ alreadyConnected: true }` e atualiza banco como `connected`.
   - Persiste `status=qr_code`, `qr_code`, `qr_code_expires_at`.
2. GET `/api/whatsapp/connect/[name]/status` sincroniza estado com Evolution quando necessário.

## Frontend
- Hook `useWhatsAppConnection`:
  - `connect()` retorna `{ qrGenerated, alreadyConnected? }`.
  - Atualiza `connectionStatus` e `qrCode` via Realtime em `whatsapp_instances`.
  - Auto-refresh do QR a cada 30s, com botão manual no modal.
- Componente `QRCodeModal`: renderiza imagem base64 ou gera QR a partir de string.

## Banco de dados
Tabela `whatsapp_instances` (campos principais):
- `instance_name` (unique)
- `status` ('connected' | 'disconnected' | 'connecting' | 'qr_code')
- `phone_number`, `qr_code`, `qr_code_expires_at`, `connected_at`, `last_sync`, `metadata`, timestamps

RLS Policies (resumo): permitir SELECT/UPDATE para usuários autenticados conforme necessidades da aplicação.

## Sincronização (@sync)
- Edge `sync-evolution-data`: verifica participação em grupo, coleta mensagens recentes e grava eventos/score (RPC `calculate_lead_score_dynamic`).
- Rotas Next `/api/sync/**`: facilitadores para campanhas, leads e execução em lote.

## Operação e Observabilidade
- Logs estruturados nas edges com `event`, `instance`, `state`.
- Alertas para falhas 5xx em `evolution-webhook` e `sync-evolution-data`.
- Nunca logar chaves ou dados sensíveis.

## Troubleshooting
- QR não aparece: validar formatos (`code`, `base64`, `pairingCode`), expiração, e se webhook está apontando para a Edge correta.
- Estado inconsistente: forçar sincronização via `/api/whatsapp/connect/[name]/status` e checar eventos recentes da Evolution.

## Status
- Endpoint Next.js `/api/webhooks/evolution`: DEPRECADO. Use Supabase Edge Function `evolution-webhook`.


