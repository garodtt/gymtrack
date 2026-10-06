import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

// Janela de confirmação e avisos ("toasts") no visual do app,
// no lugar das caixas padrão do navegador.
const FeedbackContext = createContext(null)
export const useFeedback = () => useContext(FeedbackContext)

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])
  const resolver = useRef(null)
  const nextId = useRef(0)

  // uso: if (!(await confirm({ title, message, confirmText, danger: true }))) return
  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve
    setDialog({ confirmText: 'Confirmar', cancelText: 'Cancelar', ...opts })
  }), [])

  const close = (answer) => {
    resolver.current?.(answer)
    resolver.current = null
    setDialog(null)
  }

  // uso: toast('Rotina excluída')  |  toast('Erro ao salvar', 'error')
  const toast = useCallback((text, type = 'success') => {
    const id = ++nextId.current
    setToasts((t) => [...t, { id, text, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}

      {dialog && (
        <div className="dialog-backdrop" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{dialog.title}</h2>
            {dialog.message && <p className="muted">{dialog.message}</p>}
            <div className="dialog-actions">
              <button onClick={() => close(false)}>{dialog.cancelText}</button>
              <button className={dialog.danger ? 'danger-solid' : 'primary'} onClick={() => close(true)} autoFocus>
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.type}`}>
            <span className="toast-icon">{t.type === 'error' ? <X size={14} strokeWidth={3} /> : <Check size={14} strokeWidth={3} />}</span>
            {t.text}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}