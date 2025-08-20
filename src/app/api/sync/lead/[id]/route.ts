import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const leadId = params.id

    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    const syncResults = []

    // Sincronizar WhatsApp se tiver número
    if (lead.whatsapp_number) {
      try {
        const whatsappResponse = await supabase.functions.invoke('sync-evolution-data', {
          body: {
            leadId: lead.id,
            whatsappNumber: lead.whatsapp_number,
            groupId: process.env.NEXT_PUBLIC_WHATSAPP_GROUP_ID
          }
        })

        syncResults.push({
          service: 'evolution',
          success: whatsappResponse.data?.success || false,
          data: whatsappResponse.data
        })
      } catch (error) {
        console.error('Erro ao sincronizar WhatsApp:', error)
        syncResults.push({
          service: 'evolution',
          success: false,
          error: error.message
        })
      }
    }

    // Sincronizar Mailchimp se tiver email
    if (lead.email) {
      try {
        const mailchimpResponse = await supabase.functions.invoke('sync-mailchimp-data', {
          body: {
            leadId: lead.id,
            email: lead.email,
            subscriberId: lead.mailchimp_subscriber_id
          }
        })

        syncResults.push({
          service: 'mailchimp',
          success: mailchimpResponse.data?.success || false,
          data: mailchimpResponse.data
        })
      } catch (error) {
        console.error('Erro ao sincronizar Mailchimp:', error)
        syncResults.push({
          service: 'mailchimp',
          success: false,
          error: error.message
        })
      }
    }

    // Buscar lead atualizado com novo score
    const { data: updatedLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      syncResults
    })
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar lead' },
      { status: 500 }
    )
  }
}