import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Buscar todos os leads ativos
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(100) // Processar 100 por vez para não sobrecarregar

    if (leadsError) {
      return NextResponse.json(
        { error: 'Erro ao buscar leads' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum lead para sincronizar'
      })
    }

    const syncPromises = []
    
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

    const results = await Promise.allSettled(syncPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Registrar log geral
    await supabase.from('sync_logs').insert({
      service: 'all',
      status: failed === 0 ? 'success' : 'partial',
      data_synced: {
        total_leads: leads.length,
        successful_syncs: successful,
        failed_syncs: failed,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      syncedSuccessfully: successful,
      syncFailed: failed
    })
  } catch (error) {
    console.error('Erro na sincronização geral:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar todos os leads' },
      { status: 500 }
    )
  }
}

// GET para verificar status da última sincronização
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: lastSync, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao buscar logs de sincronização' },
        { status: 500 }
      )
    }

    // Buscar estatísticas
    const { data: stats } = await supabase.rpc('get_last_sync_status')

    return NextResponse.json({
      lastSync: lastSync?.[0],
      recentLogs: lastSync,
      stats
    })
  } catch (error) {
    console.error('Erro ao buscar status:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar status de sincronização' },
      { status: 500 }
    )
  }
}