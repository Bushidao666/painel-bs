interface EvolutionConfig {
  apiUrl: string
  apiKey: string
}

interface Instance {
  instanceName: string
  instanceId?: string
  status?: string
  state?: string
  serverUrl?: string
  apikey?: string
  owner?: string
  profileName?: string
  profilePicUrl?: string
  profileStatus?: string
  integration?: string
}

interface QRCodeResponse {
  code?: string
  base64?: string
  pairingCode?: string
}

interface ConnectionState {
  instance: string
  state: 'open' | 'close' | 'connecting'
}

interface Group {
  id: string
  subject: string
  subjectOwner?: string
  subjectTime?: number
  pictureUrl?: string
  size?: number
  creation?: number
  owner?: string
  desc?: string
  descId?: string
  restrict?: boolean
  announce?: boolean
  participants?: Array<{
    id: string
    admin?: string | null
    isSuperAdmin?: boolean
  }>
}

export class EvolutionV2Service {
  private config: EvolutionConfig

  constructor(config?: Partial<EvolutionConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.NEXT_PUBLIC_EVOLUTION_API_URL || '',
      apiKey: config?.apiKey || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || ''
    }

    // Garantir que a URL não termine com barra
    if (this.config.apiUrl) {
      this.config.apiUrl = this.config.apiUrl.replace(/\/$/, '')
    }
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Validar se a URL está configurada
    if (!this.config.apiUrl) {
      throw new Error('Evolution API URL não configurada. Configure a URL nas configurações do sistema.')
    }

    // Validar se a API Key está configurada
    if (!this.config.apiKey) {
      throw new Error('Evolution API Key não configurada. Configure a chave de API nas configurações do sistema.')
    }

    // Garantir que a URL tenha protocolo
    let baseUrl = this.config.apiUrl
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`
    }

    const url = `${baseUrl}${endpoint}`

    // Retry com backoff leve para lidar com rate limit e 404 de participantes
    const maxAttempts = 3
    let attempt = 0
    let lastErr: any = null
    while (attempt < maxAttempts) {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey,
          ...options.headers
        }
      })

      if (response.ok) {
        const text = await response.text()
        if (!text) return {} as T
        try { return JSON.parse(text) } catch { return text as unknown as T }
      }

      const errorText = await response.text()
      const isParticipantsEndpoint = endpoint.includes('/group/participants')
      const isRateLimited = response.status === 429 || /rate[- ]?overlimit/i.test(errorText)
      const isNoParticipants = response.status === 404 && /No participants/i.test(errorText)

      if (isParticipantsEndpoint && isNoParticipants) {
        // Tratar como lista vazia
        return [] as unknown as T
      }

      lastErr = new Error(`Evolution API error: ${response.status} - ${errorText}`)

      if (isRateLimited) {
        const delay = 500 * (attempt + 1)
        await new Promise(r => setTimeout(r, delay))
        attempt++
        continue
      }

      break
    }

    throw lastErr || new Error('Evolution API request failed')
  }

  // ========== Instance Management ==========

  async fetchInstances(): Promise<Instance[]> {
    return this.makeRequest('/instance/fetchInstances')
  }

  async createInstance(instanceName: string, options?: {
    integration?: string
    webhook?: string | { url: string; byEvents?: boolean; base64?: boolean }
    webhookByEvents?: boolean // legado
    webhookBase64?: boolean   // legado
    chatwootAccountId?: string
    chatwootToken?: string
    chatwootUrl?: string
    chatwootSignMsg?: boolean
    chatwootReopenConversation?: boolean
    chatwootConversationPending?: boolean
  }): Promise<Instance> {
    // Evolution V2 requer token e integration como campos obrigatórios
    const baseBody: any = {
      instanceName,
      token: `${instanceName}_${Date.now()}`, // Token único baseado no nome e timestamp
      integration: "WHATSAPP-BAILEYS", // Obrigatório para Evolution V2
      qrcode: true
    }
    
    // Tentativa 1: formato legado (campos no topo)
    const bodyAttempt1: any = { ...baseBody }
    if (options?.webhook) {
      if (typeof options.webhook === 'string') {
        bodyAttempt1.webhook = options.webhook
        bodyAttempt1.webhookByEvents = options.webhookByEvents !== false // default true
        bodyAttempt1.webhookBase64 = options.webhookBase64 || false
      } else {
        bodyAttempt1.webhook = options.webhook.url
        bodyAttempt1.webhookByEvents = options.webhook.byEvents !== false
        bodyAttempt1.webhookBase64 = !!options.webhook.base64
      }
    }
    
    // Adicionar outras opções se fornecidas
    if (options?.chatwootAccountId) {
      bodyAttempt1.chatwootAccountId = options.chatwootAccountId
      bodyAttempt1.chatwootToken = options.chatwootToken
      bodyAttempt1.chatwootUrl = options.chatwootUrl
      bodyAttempt1.chatwootSignMsg = options.chatwootSignMsg
      bodyAttempt1.chatwootReopenConversation = options.chatwootReopenConversation
      bodyAttempt1.chatwootConversationPending = options.chatwootConversationPending
    }
    
    try {
      return await this.makeRequest('/instance/create', {
        method: 'POST',
        body: JSON.stringify(bodyAttempt1)
      })
    } catch (e: any) {
      const message = String(e?.message || '')
      // Tentativa 2: formato objeto para webhook
      const bodyAttempt2: any = { ...baseBody }
      if (options?.webhook) {
        if (typeof options.webhook === 'string') {
          bodyAttempt2.webhook = {
            url: options.webhook,
            byEvents: options.webhookByEvents !== false,
            base64: options.webhookBase64 || false
          }
        } else {
          bodyAttempt2.webhook = {
            url: options.webhook.url,
            byEvents: options.webhook.byEvents !== false,
            base64: !!options.webhook.base64
          }
        }
      }
      if (options?.chatwootAccountId) {
        bodyAttempt2.chatwootAccountId = options.chatwootAccountId
        bodyAttempt2.chatwootToken = options.chatwootToken
        bodyAttempt2.chatwootUrl = options.chatwootUrl
        bodyAttempt2.chatwootSignMsg = options.chatwootSignMsg
        bodyAttempt2.chatwootReopenConversation = options.chatwootReopenConversation
        bodyAttempt2.chatwootConversationPending = options.chatwootConversationPending
      }
      return await this.makeRequest('/instance/create', {
        method: 'POST',
        body: JSON.stringify(bodyAttempt2)
      })
    }
  }

  async getConnectionState(instanceName: string): Promise<ConnectionState> {
    return this.makeRequest(`/instance/connectionState/${encodeURIComponent(instanceName)}`)
  }

  async connectInstance(instanceName: string): Promise<QRCodeResponse> {
    return this.makeRequest(`/instance/connect/${encodeURIComponent(instanceName)}`)
  }

  async restartInstance(instanceName: string): Promise<{ status: string }> {
    return this.makeRequest(`/instance/restart/${encodeURIComponent(instanceName)}`, {
      method: 'PUT'
    })
  }

  async logoutInstance(instanceName: string): Promise<{ status: string }> {
    return this.makeRequest(`/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE'
    })
  }

  async deleteInstance(instanceName: string): Promise<{ status: string }> {
    return this.makeRequest(`/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE'
    })
  }

  // ========== Webhook Configuration ==========

  async configureInstanceWebhook(
    instanceName: string,
    payload: { url: string; webhook_by_events?: boolean; webhook_base64?: boolean; events?: string[] }
  ): Promise<{ status?: string } | any> {
    const body = {
      enabled: true,
      url: payload.url,
      webhook_by_events: payload.webhook_by_events ?? true,
      webhook_base64: payload.webhook_base64 ?? false,
      events: payload.events || [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE'
      ]
    }

    // Tentativa 1: endpoint oficial v2 - /webhook/set/{instance}
    try {
      return await this.makeRequest(`/webhook/set/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        body: JSON.stringify(body)
      })
    } catch (err) {
      // Tentativa 2: endpoint sem instance no path (instance no body)
      return await this.makeRequest(`/webhook/set`, {
        method: 'POST',
        body: JSON.stringify({ instance: instanceName, ...body })
      })
    }
  }

  async setPresence(instanceName: string, presence: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused') {
    return this.makeRequest(`/instance/setPresence/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({ presence })
    })
  }

  // ========== QR Code Management ==========

  async getQRCode(instanceName: string): Promise<QRCodeResponse> {
    try {
      const response = await this.connectInstance(instanceName)
      return response
    } catch (error) {
      console.error('Error getting QR Code:', error)
      throw error
    }
  }

  async checkQRCodeStatus(instanceName: string): Promise<ConnectionState> {
    return this.getConnectionState(instanceName)
  }

  // ========== Group Management ==========

  async fetchAllGroups(instanceName: string, getParticipants: boolean = false): Promise<Group[]> {
    return this.makeRequest(`/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=${getParticipants}`)
  }

  async getGroupInfo(instanceName: string, groupJid: string): Promise<Group> {
    return this.makeRequest(`/group/findGroupInfos/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`)
  }

  async getGroupParticipants(instanceName: string, groupJid: string): Promise<{
    participants: Array<{
      id: string
      admin: string | null
    }>
  }> {
    return this.makeRequest(`/group/participants/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`)
  }

  async createGroup(instanceName: string, subject: string, participants: string[]): Promise<Group> {
    return this.makeRequest(`/group/create/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({
        subject,
        participants
      })
    })
  }

  async updateGroupSubject(instanceName: string, groupJid: string, subject: string) {
    return this.makeRequest(`/group/updateGroupSubject/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        subject
      })
    })
  }

  async updateGroupDescription(instanceName: string, groupJid: string, description: string) {
    return this.makeRequest(`/group/updateGroupDescription/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        description
      })
    })
  }

  async addParticipants(instanceName: string, groupJid: string, participants: string[]) {
    return this.makeRequest(`/group/updateParticipant/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        action: 'add',
        participants
      })
    })
  }

  async removeParticipants(instanceName: string, groupJid: string, participants: string[]) {
    return this.makeRequest(`/group/updateParticipant/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        action: 'remove',
        participants
      })
    })
  }

  async promoteParticipants(instanceName: string, groupJid: string, participants: string[]) {
    return this.makeRequest(`/group/updateParticipant/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        action: 'promote',
        participants
      })
    })
  }

  async demoteParticipants(instanceName: string, groupJid: string, participants: string[]) {
    return this.makeRequest(`/group/updateParticipant/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        action: 'demote',
        participants
      })
    })
  }

  async leaveGroup(instanceName: string, groupJid: string) {
    return this.makeRequest(`/group/leaveGroup/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE',
      body: JSON.stringify({ groupJid })
    })
  }

  async getInviteCode(instanceName: string, groupJid: string): Promise<{ inviteCode: string, inviteUrl: string }> {
    return this.makeRequest(`/group/inviteCode/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(groupJid)}`)
  }

  async acceptInvite(instanceName: string, inviteCode: string) {
    return this.makeRequest(`/group/acceptInviteCode/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    })
  }

  async revokeInviteCode(instanceName: string, groupJid: string) {
    return this.makeRequest(`/group/revokeInviteCode/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({ groupJid })
    })
  }

  async toggleEphemeral(instanceName: string, groupJid: string, expiration: number) {
    return this.makeRequest(`/group/toggleEphemeral/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({
        groupJid,
        expiration
      })
    })
  }

  // ========== Profile Management ==========

  async fetchProfile(instanceName: string, number?: string): Promise<{
    wuid: string
    name: string
    picture?: string
    status?: string
  }> {
    const endpoint = number 
      ? `/chat/fetchProfile/${encodeURIComponent(instanceName)}?number=${encodeURIComponent(number)}`
      : `/chat/fetchProfile/${encodeURIComponent(instanceName)}`
    return this.makeRequest(endpoint)
  }

  async updateProfileName(instanceName: string, name: string) {
    return this.makeRequest(`/chat/updateProfileName/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    })
  }

  async updateProfileStatus(instanceName: string, status: string) {
    return this.makeRequest(`/chat/updateProfileStatus/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  }

  async updateProfilePicture(instanceName: string, picture: string) {
    return this.makeRequest(`/chat/updateProfilePicture/${encodeURIComponent(instanceName)}`, {
      method: 'PUT',
      body: JSON.stringify({ picture })
    })
  }

  async removeProfilePicture(instanceName: string) {
    return this.makeRequest(`/chat/removeProfilePicture/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE'
    })
  }

  // ========== Message Management ==========

  async sendText(instanceName: string, number: string, text: string, options?: {
    delay?: number
    linkPreview?: boolean
    mentionsEveryOne?: boolean
    mentioned?: string[]
    quotedMsg?: any
  }) {
    return this.makeRequest(`/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        text,
        ...options
      })
    })
  }

  async sendMedia(instanceName: string, number: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'document', options?: {
    caption?: string
    fileName?: string
    delay?: number
    mentionsEveryOne?: boolean
    mentioned?: string[]
    quotedMsg?: any
  }) {
    return this.makeRequest(`/message/sendMedia/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        media: mediaUrl,
        mediatype: mediaType,
        ...options
      })
    })
  }
}