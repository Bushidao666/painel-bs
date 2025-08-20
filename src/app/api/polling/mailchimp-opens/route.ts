import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MailchimpService } from '@/lib/services/mailchimp'
import { WebhookProcessor } from '@/lib/services/webhook-processor'

export async function GET(request: NextRequest) {
  try {
    // Verificar API key para segurança
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.INTERNAL_API_KEY
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()
    const mailchimp = new MailchimpService()
    const processor = new WebhookProcessor()
    
    // Parâmetros opcionais
    const searchParams = request.nextUrl.searchParams
    const timeframeDays = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Buscar leads ativos com email
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, score, temperatura')
      .not('email', 'is', null)
      .not('status', 'in', '(descadastrado,email_invalido)')
      .limit(limit)
    
    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }
    
    const results = {
      processed: 0,
      multipleOpensDetected: 0,
      errors: [] as string[],
      updatedLeads: [] as any[]
    }
    
    // Processar cada lead
    for (const lead of leads || []) {
      try {
        // Analisar múltiplas aberturas via API do MailChimp
        const analysis = await mailchimp.analyzeMultipleOpens(lead.email, timeframeDays)
        
        if (analysis.totalOpens >= 3) {
          // Lead teve múltiplas aberturas
          results.multipleOpensDetected++
          
          // Verificar se já foi registrado recentemente
          const { data: recentEvent } = await supabase
            .from('lead_events')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('event_type', 'email_multiple_opens')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single()
          
          if (!recentEvent) {
            // Criar evento de múltiplas aberturas
            await supabase.from('lead_events').insert({
              lead_id: lead.id,
              event_type: 'email_multiple_opens',
              metadata: {
                total_opens: analysis.totalOpens,
                unique_campaigns: analysis.uniqueCampaigns,
                average_opens: analysis.averageOpensPerCampaign,
                timeframe_days: timeframeDays,
                recent_opens: analysis.recentOpens.slice(0, 5)
              }
            })
            
            // Atualizar score e temperatura
            const newScore = Math.min(100, lead.score + 25)
            const newTemperature = analysis.totalOpens >= 5 ? 'hot' : 'warm'
            
            await supabase
              .from('leads')
              .update({
                score: newScore,
                temperatura: newTemperature,
                last_email_interaction: new Date().toISOString()
              })
              .eq('id', lead.id)
            
            results.updatedLeads.push({
              id: lead.id,
              email: lead.email,
              totalOpens: analysis.totalOpens,
              oldScore: lead.score,
              newScore,
              oldTemperature: lead.temperatura,
              newTemperature
            })
          }
        }
        
        // Adicionar tags no MailChimp baseado no comportamento
        if (analysis.totalOpens >= 5) {
          await mailchimp.updateMemberTags(lead.email, [
            { name: 'Highly Engaged', status: 'active' },
            { name: 'Multiple Opens', status: 'active' }
          ])
        } else if (analysis.totalOpens >= 3) {
          await mailchimp.updateMemberTags(lead.email, [
            { name: 'Engaged', status: 'active' },
            { name: 'Multiple Opens', status: 'active' }
          ])
        }
        
        results.processed++
        
      } catch (error: any) {
        console.error(`Error processing lead ${lead.id}:`, error)
        results.errors.push(`Lead ${lead.email}: ${error.message}`)
      }
    }
    
    // Registrar execução do job
    await supabase.from('sync_logs').insert({
      service: 'mailchimp',
      status: results.errors.length > 0 ? 'error' : 'success',
      data_synced: {
        type: 'multiple_opens_polling',
        results
      },
      error_message: results.errors.length > 0 ? results.errors.join('; ') : null
    })
    
    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} leads, found ${results.multipleOpensDetected} with multiple opens`
    })
    
  } catch (error: any) {
    console.error('MailChimp polling error:', error)
    
    // Registrar erro
    const supabase = await createClient()
    await supabase.from('sync_logs').insert({
      service: 'mailchimp',
      status: 'error',
      data_synced: {
        type: 'multiple_opens_polling',
        error: error.message
      },
      error_message: error.message
    })
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST para executar manualmente para leads específicos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadIds, timeframeDays = 7 } = body
    
    if (!leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    const mailchimp = new MailchimpService()
    const processor = new WebhookProcessor()
    
    const results = {
      processed: 0,
      multipleOpensDetected: 0,
      updatedLeads: [] as any[]
    }
    
    for (const leadId of leadIds) {
      // Detectar múltiplas aberturas usando o processador
      const hasMultipleOpens = await processor.detectMultipleOpens(leadId, timeframeDays)
      
      if (hasMultipleOpens) {
        results.multipleOpensDetected++
        
        // Buscar lead atualizado
        const { data: lead } = await supabase
          .from('leads')
          .select('id, email, score, temperatura')
          .eq('id', leadId)
          .single()
        
        if (lead) {
          results.updatedLeads.push(lead)
        }
      }
      
      results.processed++
    }
    
    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} leads, found ${results.multipleOpensDetected} with multiple opens`
    })
    
  } catch (error: any) {
    console.error('Manual polling error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}