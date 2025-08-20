'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Smartphone } from 'lucide-react'
import QRCode from 'react-qr-code'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  instanceName: string
  qrCode: string | null
  isLoading?: boolean
  onRefresh?: () => void
}

export function QRCodeModal({
  isOpen,
  onClose,
  instanceName,
  qrCode,
  isLoading = false,
  onRefresh
}: QRCodeModalProps) {
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    if (isOpen && qrCode) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            onRefresh?.()
            return 30
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isOpen, qrCode, onRefresh])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar a instância "{instanceName}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {isLoading ? (
            <div className="w-64 h-64 flex items-center justify-center bg-zinc-100 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : qrCode ? (
            <>
              <div className="relative w-64 h-64 bg-white p-4 rounded-lg border-2 border-zinc-200 flex items-center justify-center">
                {qrCode.startsWith('data:image') ? (
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QRCode
                    value={qrCode}
                    size={224}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 224 224`}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                )}
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-zinc-500">
                  QR Code expira em <span className="font-medium">{timeLeft}s</span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar novo QR Code
                </Button>
              </div>
            </>
          ) : (
            <div className="w-64 h-64 flex flex-col items-center justify-center bg-zinc-50 rounded-lg">
              <p className="text-zinc-500 text-sm">Nenhum QR Code disponível</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar QR Code
              </Button>
            </div>
          )}

          <div className="w-full space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">Como conectar:</h4>
            <ol className="text-xs text-zinc-500 space-y-1">
              <li>1. Abra o WhatsApp no seu celular</li>
              <li>2. Toque em Mais opções {">"} Aparelhos conectados</li>
              <li>3. Toque em Conectar um aparelho</li>
              <li>4. Aponte o telefone para esta tela para escanear o código</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}