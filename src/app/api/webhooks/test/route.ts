import { NextRequest, NextResponse } from 'next/server'

// Endpoint de teste para simular eventos de webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, target, data } = body
    
    if (!type || !target) {
      return NextResponse.json(
        { error: 'type and target are required' },
        { status: 400 }
      )
    }
    
    let webhookUrl = ''
    let webhookData: any = {}
    
    // Construir URL do webhook baseado no ambiente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
    
    switch (target) {
      case 'mailchimp':
        webhookUrl = `${baseUrl}/api/webhooks/mailchimp`
        
        // Simular evento do MailChimp
        switch (type) {
          case 'open':
            webhookData = {
              type: 'open',
              fired_at: new Date().toISOString(),
              data: {
                id: data?.subscriberId || 'test-subscriber-123',
                email: data?.email || 'test@example.com',
                email_type: 'html',
                ip: data?.ip || '127.0.0.1',
                campaign_id: data?.campaignId || 'test-campaign-123',
                list_id: data?.listId || 'test-list-123',
                timestamp: new Date().toISOString()
              }
            }
            break
          
          case 'click':
            webhookData = {
              type: 'click',
              fired_at: new Date().toISOString(),
              data: {
                id: data?.subscriberId || 'test-subscriber-123',
                email: data?.email || 'test@example.com',
                url: data?.url || 'https://example.com/landing',
                ip: data?.ip || '127.0.0.1',
                campaign_id: data?.campaignId || 'test-campaign-123',
                list_id: data?.listId || 'test-list-123',
                timestamp: new Date().toISOString()
              }
            }
            break
          
          case 'bounce':
            webhookData = {
              type: 'bounce',
              fired_at: new Date().toISOString(),
              data: {
                id: data?.subscriberId || 'test-subscriber-123',
                email: data?.email || 'test@example.com',
                reason: data?.reason || 'hard',
                campaign_id: data?.campaignId || 'test-campaign-123',
                list_id: data?.listId || 'test-list-123',
                timestamp: new Date().toISOString()
              }
            }
            break
          
          default:
            return NextResponse.json(
              { error: `Unknown MailChimp event type: ${type}` },
              { status: 400 }
            )
        }
        break
      
      case 'evolution':
        webhookUrl = `${baseUrl}/api/webhooks/evolution`
        
        // Simular evento do Evolution API
        switch (type) {
          case 'message_read':
            webhookData = {
              instance: data?.instance || 'test-instance',
              event: 'messages.update',
              data: {
                key: {
                  remoteJid: data?.phoneNumber ? `${data.phoneNumber}@s.whatsapp.net` : '5511999999999@s.whatsapp.net',
                  fromMe: false,
                  id: 'test-message-123'
                },
                update: {
                  status: 'READ'
                }
              },
              date_time: new Date().toISOString(),
              sender: data?.phoneNumber || '5511999999999',
              server_url: 'http://localhost:8080',
              apikey: 'test-api-key'
            }
            break
          
          case 'message_reply':
            webhookData = {
              instance: data?.instance || 'test-instance',
              event: 'messages.upsert',
              data: {
                key: {
                  remoteJid: data?.phoneNumber ? `${data.phoneNumber}@s.whatsapp.net` : '5511999999999@s.whatsapp.net',
                  fromMe: false,
                  id: 'test-message-456'
                },
                message: {
                  conversation: data?.message || 'Olá! Tenho interesse no lançamento.',
                  messageTimestamp: Math.floor(Date.now() / 1000)
                },
                messageType: 'conversation'
              },
              date_time: new Date().toISOString(),
              sender: data?.phoneNumber || '5511999999999'
            }
            break
          
          case 'group_message_read':
            webhookData = {
              instance: data?.instance || 'test-instance',
              event: 'messages.update',
              data: {
                key: {
                  remoteJid: data?.groupJid || '120363123456789012@g.us',
                  fromMe: false,
                  participant: data?.phoneNumber ? `${data.phoneNumber}@s.whatsapp.net` : '5511999999999@s.whatsapp.net',
                  id: 'test-group-message-123'
                },
                update: {
                  status: 'READ'
                }
              },
              date_time: new Date().toISOString()
            }
            break
          
          case 'join_group':
            webhookData = {
              instance: data?.instance || 'test-instance',
              event: 'group-participants.update',
              data: {
                action: 'add',
                groupJid: data?.groupJid || '120363123456789012@g.us',
                participants: [
                  data?.phoneNumber ? `${data.phoneNumber}@s.whatsapp.net` : '5511999999999@s.whatsapp.net'
                ]
              },
              date_time: new Date().toISOString()
            }
            break
          
          default:
            return NextResponse.json(
              { error: `Unknown Evolution event type: ${type}` },
              { status: 400 }
            )
        }
        break
      
      default:
        return NextResponse.json(
          { error: `Unknown target: ${target}` },
          { status: 400 }
        )
    }
    
    // Enviar webhook simulado
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(target === 'evolution' && { 'apikey': process.env.EVOLUTION_WEBHOOK_API_KEY || 'test-key' })
      },
      body: JSON.stringify(webhookData)
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      webhookUrl,
      sentData: webhookData,
      response: result
    })
    
  } catch (error: any) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to send test webhook', details: error.message },
      { status: 500 }
    )
  }
}

// GET para listar eventos de teste disponíveis
export async function GET() {
  return NextResponse.json({
    availableTests: {
      mailchimp: [
        {
          type: 'open',
          description: 'Simula abertura de email',
          requiredData: ['email'],
          optionalData: ['subscriberId', 'campaignId', 'listId', 'ip']
        },
        {
          type: 'click',
          description: 'Simula clique em link do email',
          requiredData: ['email'],
          optionalData: ['subscriberId', 'campaignId', 'listId', 'url', 'ip']
        },
        {
          type: 'bounce',
          description: 'Simula email que voltou (bounce)',
          requiredData: ['email'],
          optionalData: ['subscriberId', 'campaignId', 'listId', 'reason']
        }
      ],
      evolution: [
        {
          type: 'message_read',
          description: 'Simula leitura de mensagem no WhatsApp',
          requiredData: ['phoneNumber'],
          optionalData: ['instance']
        },
        {
          type: 'message_reply',
          description: 'Simula resposta de mensagem no WhatsApp',
          requiredData: ['phoneNumber'],
          optionalData: ['instance', 'message']
        },
        {
          type: 'group_message_read',
          description: 'Simula leitura de mensagem em grupo',
          requiredData: ['phoneNumber'],
          optionalData: ['instance', 'groupJid']
        },
        {
          type: 'join_group',
          description: 'Simula entrada em grupo',
          requiredData: ['phoneNumber'],
          optionalData: ['instance', 'groupJid']
        }
      ]
    },
    exampleRequest: {
      type: 'open',
      target: 'mailchimp',
      data: {
        email: 'lead@example.com',
        campaignId: 'camp-123'
      }
    }
  })
}