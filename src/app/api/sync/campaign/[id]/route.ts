import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const campaignId = url.pathname.split('/').slice(-2, -1)[0]

    // Buscar todos os leads da campanha
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaignId)

    if (leadsError) {
      return NextResponse.json(
        { error: 'Erro ao buscar leads da campanha' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum lead encontrado para esta campanha' },
        { status: 404 }
      )
    }

    const syncPromises = []
    
    // Criar promises para sincronizar cada lead
    for (const lead of leads) {
      if (lead.whatsapp_number) {
        syncPromises.push(
          supabase.functions.invoke('sync-evolution-data', {
            body: {
              leadId: lead.id,
              whatsappNumber: lead.whatsapp_number,
              groupId: process.env.NEXT_PUBLIC_WHATSAPP_GROUP_ID
            }
          }).catch(error => ({
            error: true,
            leadId: lead.id,
            service: 'evolution',
            message: error.message
          }))
        )
      }

      if (lead.email) {
        syncPromises.push(
          supabase.functions.invoke('sync-mailchimp-data', {
            body: {
              leadId: lead.id,
              email: lead.email,
              subscriberId: lead.mailchimp_subscriber_id
            }
          }).catch(error => ({
            error: true,
            leadId: lead.id,
            service: 'mailchimp',
            message: error.message
          }))
        )
      }
    }

    // Executar todas as sincronizações em paralelo
    const results = await Promise.allSettled(syncPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Registrar log de sincronização em massa
    await supabase.from('sync_logs').insert({
      service: 'all',
      status: failed === 0 ? 'success' : 'partial',
      data_synced: {
        campaign_id: campaignId,
        total_leads: leads.length,
        successful_syncs: successful,
        failed_syncs: failed
      }
    })

    return NextResponse.json({
      success: true,
      campaignId,
      totalLeads: leads.length,
      syncedSuccessfully: successful,
      syncFailed: failed,
      results: results.map(r => 
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      )
    })
  } catch (error) {
    console.error('Erro na sincronização da campanha:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar campanha' },
      { status: 500 }
    )
  }
}