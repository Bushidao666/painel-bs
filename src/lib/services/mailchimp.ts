import crypto from 'crypto'

interface MailchimpConfig {
  apiKey: string
  serverPrefix: string
  listId?: string
}

export interface MailchimpWebhookEvent {
  type: string
  fired_at: string
  data: {
    id?: string
    email?: string
    email_type?: string
    ip?: string
    list_id?: string
    campaign_id?: string
    reason?: string
    action?: string
    url?: string
    timestamp?: string
    [key: string]: any
  }
}

export interface MailchimpMember {
  id: string
  email_address: string
  unique_email_id: string
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional'
  stats: {
    avg_open_rate: number
    avg_click_rate: number
  }
  list_id: string
  merge_fields: Record<string, any>
  tags: Array<{ id: number; name: string }>
  last_changed: string
}

export interface MailchimpCampaignReport {
  id: string
  campaign_title: string
  emails_sent: number
  opens: {
    opens_total: number
    unique_opens: number
    open_rate: number
  }
  clicks: {
    clicks_total: number
    unique_clicks: number
    click_rate: number
  }
}

export interface EmailActivity {
  campaign_id: string
  action: 'open' | 'click' | 'bounce' | 'sent' | 'unsub' | 'abuse'
  timestamp: string
  url?: string
  ip?: string
}

export class MailchimpService {
  private config: MailchimpConfig
  private baseUrl: string

  constructor(config?: Partial<MailchimpConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.MAILCHIMP_API_KEY || '',
      serverPrefix: config?.serverPrefix || process.env.MAILCHIMP_SERVER_PREFIX || '',
      listId: config?.listId || process.env.MAILCHIMP_LIST_ID || ''
    }

    if (!this.config.serverPrefix) {
      // Extrair server prefix da API key (formato: xxxxx-us1)
      const match = this.config.apiKey.match(/-(.+)$/)
      if (match) {
        this.config.serverPrefix = match[1]
      }
    }

    this.baseUrl = `https://${this.config.serverPrefix}.api.mailchimp.com/3.0`
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`anyuser:${this.config.apiKey}`).toString('base64')
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(`Mailchimp API error: ${response.status} - ${error.detail || error.title || 'Unknown error'}`)
    }

    return response.json()
  }

  // ========== Webhook Validation ==========

  validateWebhookSignature(body: string, signature: string, secret: string): boolean {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')
    
    return hash === signature
  }

  // ========== Member Management ==========

  async getMember(email: string): Promise<MailchimpMember | null> {
    if (!this.config.listId) {
      throw new Error('List ID not configured')
    }

    const emailHash = crypto
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex')

    try {
      return await this.makeRequest<MailchimpMember>(
        `/lists/${this.config.listId}/members/${emailHash}`
      )
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async getMemberActivity(email: string): Promise<EmailActivity[]> {
    if (!this.config.listId) {
      throw new Error('List ID not configured')
    }

    const emailHash = crypto
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex')

    const response = await this.makeRequest<{ activity: EmailActivity[] }>(
      `/lists/${this.config.listId}/members/${emailHash}/activity`
    )

    return response.activity || []
  }

  async updateMemberTags(email: string, tags: Array<{ name: string; status: 'active' | 'inactive' }>): Promise<void> {
    if (!this.config.listId) {
      throw new Error('List ID not configured')
    }

    const emailHash = crypto
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex')

    await this.makeRequest(
      `/lists/${this.config.listId}/members/${emailHash}/tags`,
      {
        method: 'POST',
        body: JSON.stringify({ tags })
      }
    )
  }

  async addMemberNote(email: string, note: string): Promise<void> {
    if (!this.config.listId) {
      throw new Error('List ID not configured')
    }

    const emailHash = crypto
      .createHash('md5')
      .update(email.toLowerCase())
      .digest('hex')

    await this.makeRequest(
      `/lists/${this.config.listId}/members/${emailHash}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({ note })
      }
    )
  }

  // ========== Campaign Reports ==========

  async getCampaignReport(campaignId: string): Promise<MailchimpCampaignReport> {
    return await this.makeRequest<MailchimpCampaignReport>(
      `/reports/${campaignId}`
    )
  }

  async getCampaignOpenDetails(campaignId: string, count: number = 100): Promise<{
    members: Array<{
      email_address: string
      opens_count: number
      opens: Array<{ timestamp: string }>
    }>
    total_items: number
  }> {
    return await this.makeRequest(
      `/reports/${campaignId}/open-details?count=${count}`
    )
  }

  async getCampaignClickDetails(campaignId: string, count: number = 100): Promise<{
    urls_clicked: Array<{
      url: string
      total_clicks: number
      unique_clicks: number
      click_percentage: number
      unique_click_percentage: number
    }>
    total_items: number
  }> {
    return await this.makeRequest(
      `/reports/${campaignId}/click-details?count=${count}`
    )
  }

  async getClickDetailsForUrl(campaignId: string, linkId: string): Promise<{
    members: Array<{
      email_address: string
      clicks: number
    }>
    total_items: number
  }> {
    return await this.makeRequest(
      `/reports/${campaignId}/click-details/${linkId}/members`
    )
  }

  // ========== Análise de Múltiplas Aberturas ==========

  async analyzeMultipleOpens(email: string, timeframeDays: number = 30): Promise<{
    totalOpens: number
    uniqueCampaigns: number
    averageOpensPerCampaign: number
    recentOpens: EmailActivity[]
  }> {
    const activity = await this.getMemberActivity(email)
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays)
    
    const recentOpens = activity.filter(a => 
      a.action === 'open' && 
      new Date(a.timestamp) > cutoffDate
    )
    
    const campaignOpens = recentOpens.reduce((acc, open) => {
      acc[open.campaign_id] = (acc[open.campaign_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const uniqueCampaigns = Object.keys(campaignOpens).length
    const totalOpens = recentOpens.length
    
    return {
      totalOpens,
      uniqueCampaigns,
      averageOpensPerCampaign: uniqueCampaigns > 0 ? totalOpens / uniqueCampaigns : 0,
      recentOpens: recentOpens.slice(0, 10) // Últimas 10 aberturas
    }
  }

  // ========== Webhook Event Types ==========

  static WEBHOOK_EVENTS = {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    PROFILE_UPDATE: 'profile',
    CLEANED: 'cleaned',
    EMAIL_CHANGED: 'upemail',
    CAMPAIGN_SENT: 'campaign',
    EMAIL_OPENED: 'open',
    LINK_CLICKED: 'click',
    EMAIL_BOUNCED: 'bounce'
  }

  parseWebhookEvent(body: any): MailchimpWebhookEvent {
    // Mailchimp envia eventos em formato específico
    // Adaptar conforme necessário baseado na documentação
    return {
      type: body.type,
      fired_at: body.fired_at || new Date().toISOString(),
      data: body.data || body
    }
  }
}