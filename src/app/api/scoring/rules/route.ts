import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')

    let query = supabase
      .from('scoring_rules')
      .select('*')
      .order('nome', { ascending: true })

    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao buscar regras de scoring' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar regras:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('scoring_rules')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao criar regra de scoring' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da regra é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('scoring_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao atualizar regra de scoring' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao atualizar regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da regra é obrigatório' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('scoring_rules')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Erro ao deletar regra de scoring' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Erro ao deletar regra:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}