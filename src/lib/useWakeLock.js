import { useEffect } from 'react'

// Mantém a tela do celular acesa enquanto o componente estiver aberto (ex.: durante o treino).
// Funciona no Chrome/Android e no Safari/iPhone (iOS 16.4+). Onde não existir, não faz nada.
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* bateria fraca ou permissão negada: segue sem travar a tela */
      }
    }
    // o sistema solta a trava quando o app vai para segundo plano; pede de novo ao voltar
    const onVisible = () => { if (!cancelled && document.visibilityState === 'visible') request() }

    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}