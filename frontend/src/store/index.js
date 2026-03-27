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
        { id: 'tx-001', type: 'credit',   amount: 20000, desc: 'Wallet top-up via Interswitch',              date: '10 Mar 2026', status: 'completed', ref: 'FXNAP20260310A' },
        { id: 'tx-002', type: 'debit',    amount: 4872,  desc: 'Imidacloprid 200SL — AgroFirst PH',          date: '12 Mar 2026', status: 'completed', ref: 'ORD-00234' },
        { id: 'tx-003', type: 'credit',   amount: 5000,  desc: 'Wallet top-up via Interswitch',              date: '14 Mar 2026', status: 'completed', ref: 'FXNAP20260314B' },
        { id: 'tx-004', type: 'debit',    amount: 3828,  desc: 'Mancozeb 80WP — GreenField Supplies',        date: '15 Mar 2026', status: 'completed', ref: 'ORD-00218' },
        { id: 'tx-005', type: 'refund',   amount: 3828,  desc: 'Refund — order cancelled by admin',          date: '16 Mar 2026', status: 'completed', ref: 'REF-00218' },
        { id: 'tx-006', type: 'debit',    amount: 2228,  desc: 'Carbendazim 50WP — NaturaFarm Store',        date: '18 Mar 2026', status: 'completed', ref: 'ORD-00198' },
        { id: 'tx-007', type: 'credit',   amount: 10000, desc: 'Wallet top-up via Interswitch',              date: '20 Mar 2026', status: 'completed', ref: 'FXNAP20260320C' },
        { id: 'tx-008', type: 'withdraw', amount: 8000,  desc: 'Withdrawal to GTBank — 0123456789',          date: '21 Mar 2026', status: 'completed', ref: 'WDR-20260321' },
        { id: 'tx-009', type: 'refund',   amount: 2228,  desc: 'Refund — dealer did not dispatch in time',   date: '22 Mar 2026', status: 'completed', ref: 'REF-00198' },
        { id: 'tx-010', type: 'debit',    amount: 1828,  desc: 'Acetamiprid 20SP — FarmFirst Supplies',      date: '23 Mar 2026', status: 'completed', ref: 'ORD-00301' },
      ],
      topUp: (amount, ref) => set(s => ({
        balance: s.balance + amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'credit', amount, desc: 'Wallet top-up via Interswitch',
            date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
            status: 'completed', ref },
          ...s.transactions,
        ],
      })),
      deduct: (amount, desc, ref) => set(s => ({
        balance: s.balance - amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'debit', amount, desc,
            date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
            status: 'completed', ref: ref || ('ORD-' + Math.random().toString(36).slice(2,8).toUpperCase()) },
          ...s.transactions,
        ],
      })),
      refund: (amount, desc, ref) => set(s => ({
        balance: s.balance + amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'refund', amount, desc,
            date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
            status: 'completed', ref: ref || ('REF-' + Math.random().toString(36).slice(2,8).toUpperCase()) },
          ...s.transactions,
        ],
      })),
      withdraw: (amount, bankName, accountNumber) => set(s => ({
        balance: s.balance - amount,
        transactions: [
          { id: 'tx-' + Date.now(), type: 'withdraw', amount,
            desc: `Withdrawal to ${bankName} — ${accountNumber}`,
            date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
            status: 'completed', ref: 'WDR-' + Date.now() },
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