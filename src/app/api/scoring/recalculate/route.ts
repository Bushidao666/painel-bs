import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Opcionalmente filtrar por campanha
    const { campaignId } = await request.json().catch(() => ({ campaignId: null }))

    // Chamar função de recálculo
    const { data, error } = await supabase
      .rpc('recalculate_all_lead_scores', {
        p_campaign_id: campaignId || null
      })

    if (error) {
      console.error('Erro ao recalcular scores:', error)
      return NextResponse.json(
        { error: 'Failed to recalculate scores', details: error.message },
        { status: 500 }
      )
    }

    // Limpar flag de recálculo necessário
    await supabase
      .from('app_settings')
      .update({ value: 'false' })
      .eq('key', 'SCORE_RECALC_NEEDED')

    // Retornar estatísticas
    const result = data?.[0] || { total_leads: 0, updated_leads: 0, execution_time_ms: 0 }
    
    return NextResponse.json({
      success: true,
      totalLeads: result.total_leads,
      updatedLeads: result.updated_leads,
      executionTimeMs: result.execution_time_ms,
      message: `${result.updated_leads} leads atualizados em ${result.execution_time_ms}ms`
    })
  } catch (error) {
    console.error('Erro ao processar recálculo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET para verificar status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar se recálculo é necessário
    const { data } = await supabase
      .from('app_settings')
      .select('value, updated_at')
      .eq('key', 'SCORE_RECALC_NEEDED')
      .single()

    // Contar total de leads
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'inativo')

    return NextResponse.json({
      needsRecalculation: data?.value === 'true',
      lastUpdate: data?.updated_at,
      totalActiveLeads: count || 0
    })
  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}