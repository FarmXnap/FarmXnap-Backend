import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      setAuth: (user, token, role) => set({ user, token, role }),
      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
      logout: () => set({ user: null, token: null, role: null }),
    }),
    { name: 'farmxnap-auth' }
  )
)

export const useScanStore = create((set) => ({
  capturedImage: null,
  cropType: 'cassava',
  diagnosis: null,
  loading: false,
  setCapturedImage: (img) => set({ capturedImage: img }),
  setCropType: (crop) => set({ cropType: crop }),
  setDiagnosis: (result) => set({ diagnosis: result }),
  setLoading: (val) => set({ loading: val }),
  reset: () => set({ capturedImage: null, diagnosis: null, loading: false }),
}))

export const useOrderStore = create(
  persist(
    (set) => ({
      order: null,
      setOrder: (order) => set({ order }),
      clearOrder: () => set({ order: null }),
    }),
    { name: 'farmxnap-order' }
  )
)

export const useCartStore = create((set) => ({
  item: null,
  dealer: null,
  setCart: (item, dealer) => set({ item, dealer }),
  clearCart: () => set({ item: null, dealer: null }),
}))

export const useWalletStore = create(
  persist(
    (set) => ({
      balance: 12500,
      transactions: [
        { id: 'tx-001', type: 'credit', amount: 20000, desc: 'Wallet top-up via Interswitch',           date: '12 Mar 2026', status: 'completed' },
        { id: 'tx-002', type: 'debit',  amount: 4872,  desc: 'Imidacloprid 200SL — AgroFirst PH',       date: '14 Mar 2026', status: 'completed' },
        { id: 'tx-003', type: 'credit', amount: 5000,  desc: 'Wallet top-up via Interswitch',           date: '16 Mar 2026', status: 'completed' },
        { id: 'tx-004', type: 'debit',  amount: 3328,  desc: 'Mancozeb 80WP — GreenField Supplies',     date: '18 Mar 2026', status: 'completed' },
        { id: 'tx-005', type: 'refund', amount: 3328,  desc: 'Refund — order not delivered in time',    date: '19 Mar 2026', status: 'completed' },
      ],
      topUp: (amount, ref) => set(s => ({
        balance: s.balance + amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'credit', amount, desc: 'Wallet top-up via Interswitch', date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), status: 'completed', ref },
          ...s.transactions,
        ],
      })),
      deduct: (amount, desc) => set(s => ({
        balance: s.balance - amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'debit', amount, desc, date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), status: 'completed' },
          ...s.transactions,
        ],
      })),
      refund: (amount, desc) => set(s => ({
        balance: s.balance + amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'refund', amount, desc, date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), status: 'completed' },
          ...s.transactions,
        ],
      })),
    }),
    { name: 'farmxnap-wallet' }
  )
)

// ── Theme store ──────────────────────────────────────────────────────────────
const THEMES = ['dark', 'light', 'green']

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
      toggleTheme: () => {
        const current = get().theme
        const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },
    }),
    { name: 'farmxnap-theme' }
  )
)

// ── Global Toast store ───────────────────────────────────────────────────────
let _toastTimer = null

export const useToastStore = create((set) => ({
  toast: null,
  show: (message, type = 'success') => {
    if (_toastTimer) clearTimeout(_toastTimer)
    set({ toast: { message, type } })
    _toastTimer = setTimeout(() => set({ toast: null }), 3500)
  },
  hide: () => {
    if (_toastTimer) clearTimeout(_toastTimer)
    set({ toast: null })
  },
}))

// ── PIN store — no hashing, backend handles all security ────────────────────
// PIN is only held in memory during a session, never persisted to localStorage
export const usePinStore = create((set, get) => ({
  hasPinSet: false,   // flipped to true after signup PIN creation
  attempts:  0,
  lockedUntil: null,

  // Called after backend confirms PIN was set successfully
  markPinSet: () => set({ hasPinSet: true, attempts: 0, lockedUntil: null }),

  // Track failed attempts locally for UX lockout (real auth is on backend)
  recordFailure: () => {
    const attempts = get().attempts + 1
    if (attempts >= 3) {
      set({ attempts: 0, lockedUntil: Date.now() + 30000 })
    } else {
      set({ attempts })
    }
    return attempts
  },

  clearLock: () => set({ attempts: 0, lockedUntil: null }),

  isLocked: () => {
    const { lockedUntil } = get()
    return lockedUntil && Date.now() < lockedUntil
  },

  secondsLeft: () => {
    const { lockedUntil } = get()
    if (!lockedUntil) return 0
    return Math.ceil((lockedUntil - Date.now()) / 1000)
  },
}))