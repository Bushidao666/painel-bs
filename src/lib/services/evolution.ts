interface EvolutionConfig {
  apiUrl: string
  apiKey: string
  instanceName: string
}

interface MessageStatus {
  id: string
  status: 'sent' | 'delivered' | 'read'
  readAt?: string
}

interface GroupParticipant {
  id: string
  number: string
  isAdmin: boolean
  joinedAt: string
}

export class EvolutionService {
  private config: EvolutionConfig

  constructor() {
    this.config = {
      apiUrl: process.env.EVOLUTION_API_URL || '',
      apiKey: process.env.EVOLUTION_API_KEY || '',
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || ''
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.apiUrl}/${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.apiKey,
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.statusText}`)
    }

    return response.json()
  }

  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    return this.makeRequest(`message/status/${this.config.instanceName}/${messageId}`)
  }

  async getGroupParticipants(groupId: string): Promise<GroupParticipant[]> {
    return this.makeRequest(`group/participants/${this.config.instanceName}/${groupId}`)
  }

  async checkIfInGroup(number: string, groupId: string): Promise<boolean> {
    try {
      const participants = await this.getGroupParticipants(groupId)
      return participants.some(p => p.number.includes(number.replace(/\D/g, '')))
    } catch {
      return false
    }
  }

  async sendMessage(to: string, message: string, options?: { buttons?: any[], mediaUrl?: string }) {
    const body: any = {
      number: to,
      text: message
    }

    if (options?.mediaUrl) {
      body.mediaUrl = options.mediaUrl
    }

    if (options?.buttons) {
      body.buttons = options.buttons
    }

    return this.makeRequest(`message/sendText/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async sendToGroup(groupId: string, message: string) {
    return this.makeRequest(`message/sendText/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: groupId,
        text: message
      })
    })
  }

  async getGroupInfo(groupId: string) {
    return this.makeRequest(`group/info/${this.config.instanceName}/${groupId}`)
  }

  async createGroup(name: string, participants: string[]) {
    return this.makeRequest(`group/create/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        subject: name,
        participants
      })
    })
  }

  async addToGroup(groupId: string, participants: string[]) {
    return this.makeRequest(`group/addParticipants/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        groupId,
        participants
      })
    })
  }

  async removeFromGroup(groupId: string, participants: string[]) {
    return this.makeRequest(`group/removeParticipants/${this.config.instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        groupId,
        participants
      })
    })
  }

  async getQRCode() {
    return this.makeRequest(`instance/qrcode/${this.config.instanceName}`)
  }

  async getConnectionStatus() {
    return this.makeRequest(`instance/status/${this.config.instanceName}`)
  }

  async logout() {
    return this.makeRequest(`instance/logout/${this.config.instanceName}`, {
      method: 'DELETE'
    })
  }
}