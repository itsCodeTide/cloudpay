'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, ArrowDownLeft, ArrowUpRight, BanknoteIcon, Bell, Camera, CheckCircle2,
  CreditCard, Download, LayoutDashboard, Loader2, LogOut, Menu, PlusCircle, QrCode,
  ReceiptText, RefreshCw, Send, Shield, Smartphone, Trash2, Upload, UserRound, VideoOff, Wallet, X, Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProtectedRoute } from '@/frontend/components/protected-route'
import { useAuth } from '@/frontend/lib/auth-context'
import { supabase } from '@/frontend/lib/supabase'
import { getApiErrorMessage, apiRequest, sessionStorage } from '@/frontend/services/api-client'
import { paymentService } from '@/frontend/services/payment.service'
import { notificationService } from '@/frontend/services/notification.service'
import { kycService } from '@/frontend/services/kyc.service'
import { qrService } from '@/frontend/services/qr.service'
import { userService } from '@/frontend/services/user.service'
import type { AddBankAccountPayload, BankAccount, DashboardResponse, GenerateQrResponse, KycVerification, Notification, PageResponse, Transaction } from '@/frontend/types'
import { QRCodeSVG } from 'qrcode.react'
import jsQR from 'jsqr'

declare global {
  interface Window {
    Razorpay: new (opts: unknown) => { open(): void }
  }
}

type View = 'dashboard' | 'send' | 'transactions' | 'receive' | 'qr' | 'banking' | 'profile' | 'notifications' | 'services'

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'send', label: 'Send Money', icon: Send },
  { id: 'receive', label: 'Receive Money', icon: ArrowDownLeft },
  { id: 'qr', label: 'Pay by QR / UPI', icon: QrCode },
  { id: 'banking', label: 'Bank Accounts', icon: BanknoteIcon },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'services', label: 'All Services', icon: Smartphone },
  { id: 'profile', label: 'Settings & Account', icon: UserRound },
]

const money = (v: number | string | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v ?? 0))
const fmtDate = (v: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v))

// ─── Shared ───────────────────────────────────────────────────────────────────

function ErrBanner({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
      <span className="flex items-center gap-2"><AlertCircle className="size-4 shrink-0" />{message}</span>
      {retry && <Button variant="outline" size="sm" onClick={retry}><RefreshCw className="mr-1 size-3" />Retry</Button>}
    </div>
  )
}
function OkBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-4 shrink-0" />{message}
    </div>
  )
}
function Spin({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={'flex items-center justify-center gap-2 text-sm text-muted-foreground ' + (compact ? 'py-8' : 'min-h-56')}>
      <Loader2 className="size-5 animate-spin" />{label}
    </div>
  )
}
function StatCard({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: typeof Wallet; accent?: boolean }) {
  return (
    <Card className="payment-card">
      <CardContent className="flex items-start justify-between p-5">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className={'mt-2 text-2xl font-bold ' + (accent ? 'text-emerald-600 dark:text-emerald-400' : '')}>{value}</p></div>
        <div className={'flex size-10 items-center justify-center rounded-xl ' + (accent ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary')}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Razorpay loader ─────────────────────────────────────────────────────────

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

async function openRazorpay(opts: {
  amount: number
  name: string
  email: string
  description: string
  onSuccess: (data: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  onFailure: (msg: string) => void
}) {
  const loaded = await loadRazorpay()
  if (!loaded) { opts.onFailure('Failed to load payment gateway. Check your internet.'); return }

  // Create order on server
  const token = sessionStorage.getAccessToken()
  const orderRes = await fetch('/api/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify({ amount: opts.amount, currency: 'INR', receipt: `rcpt_${Date.now()}` }),
  })
  const order = await orderRes.json()
  if (!orderRes.ok) { opts.onFailure(order.error || 'Failed to create payment order'); return }

  const rzp = new window.Razorpay({
    key: order.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: 'INR',
    name: 'CloudPay',
    description: opts.description,
    order_id: order.id,
    prefill: { name: opts.name, email: opts.email },
    theme: { color: '#7c3aed' },
    handler: opts.onSuccess,
    modal: {
      ondismiss: () => opts.onFailure('Payment cancelled'),
    },
  })
  rzp.open()
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ data, loading, error, retry, go }: {
  data: DashboardResponse | null; loading: boolean; error: string | null; retry: () => void; go: (v: View) => void
}) {
  const [balancePin, setBalancePin] = useState('')
  const [balance, setBalance] = useState<import('@/frontend/types').BalanceResponse | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  async function checkBalance(e: React.FormEvent) {
    e.preventDefault(); setBalanceLoading(true); setBalanceError(null)
    try {
      const result = await userService.checkBalance(balancePin)
      setBalance(result); setBalancePin('')
      window.setTimeout(() => setBalance(null), 60_000)
    } catch (err) { setBalanceError(getApiErrorMessage(err, 'Unable to check balance')) }
    finally { setBalanceLoading(false) }
  }

  if (loading && !data) return <Spin label="Loading your dashboard…" />
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your money at a glance.</p>
      </div>
      {error && <ErrBanner message={error} retry={retry} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available Balance" value={balance ? money(balance.availableBalance) : '••••••'} icon={Wallet} accent />
        <StatCard label="Monthly Spending" value={money(data?.monthlySpending)} icon={ArrowUpRight} />
        <StatCard label="Monthly Income" value={money(data?.monthlyIncome)} icon={ArrowDownLeft} />
        <StatCard label="Total Transactions" value={String(data?.totalTransactions ?? 0)} icon={ReceiptText} />
      </div>
      <Card className="payment-card border-primary/20">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-semibold">Check balance securely</p><p className="mt-1 text-sm text-muted-foreground">Your balances stay hidden until you verify with your transaction PIN. The result is visible for 60 seconds.</p></div>
          <form onSubmit={checkBalance} className="flex w-full gap-2 sm:max-w-sm">
            <Input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={balancePin} onChange={e => setBalancePin(e.target.value.replace(/\D/g, ''))} placeholder="Enter PIN" autoComplete="off" />
            <Button type="submit" disabled={balanceLoading}>{balanceLoading ? <Loader2 className="size-4 animate-spin" /> : 'Check balance'}</Button>
          </form>
        </CardContent>
      </Card>
      {balanceError && <ErrBanner message={balanceError} />}
      {balance && <Card className="payment-card border-emerald-500/30 bg-emerald-500/[0.03]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Verified available balance</p><p className="mt-1 text-3xl font-bold text-emerald-600">{money(balance.availableBalance)}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{balance.accounts.map(account => <div key={account.id} className="rounded-xl border bg-background/70 p-3"><p className="text-sm font-semibold">{account.bankName}{account.primary ? ' · Primary' : ''}</p><p className="text-xs text-muted-foreground">{account.accountNumber}</p><p className="mt-1 font-bold">{money(account.balance)}</p></div>)}</div></CardContent></Card>}
      <p className="text-xs text-muted-foreground">Payment services</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ view: 'qr' as View, Icon: QrCode, label: 'Scan QR', desc: 'Camera permission required' }, { view: 'send' as View, Icon: Send, label: 'Pay anyone', desc: 'Send to a UPI ID' }, { view: 'services' as View, Icon: Smartphone, label: 'Mobile recharge', desc: 'Recharge and bill services' }, { view: 'services' as View, Icon: CreditCard, label: 'Offers & rewards', desc: 'Explore CloudPay benefits' }].map(({ view, Icon, label, desc }) => <button key={label} onClick={() => go(view)} className="rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><p className="mt-3 font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{desc}</p></button>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { view: 'send' as View, Icon: Send, color: 'bg-primary/10 text-primary', label: 'Send Money', desc: 'Instant transfer to any CloudPay UPI ID.' },
          { view: 'receive' as View, Icon: ArrowDownLeft, color: 'bg-emerald-500/10 text-emerald-600', label: 'Receive Money', desc: 'Share QR code to receive payments.' },
          { view: 'banking' as View, Icon: BanknoteIcon, color: 'bg-violet-500/10 text-violet-600', label: 'Bank Accounts', desc: 'Add and manage linked bank accounts.' },
        ].map(({ view, Icon, color, label, desc }) => (
          <Card key={view} className="payment-card cursor-pointer hover:shadow-md transition-all" onClick={() => go(view)}>
            <CardContent className="flex flex-col gap-3 p-6">
              <div className={`flex size-10 items-center justify-center rounded-xl ${color}`}><Icon className="size-5" /></div>
              <div><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground mt-0.5">{desc}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Send Money ───────────────────────────────────────────────────────────────

function SendView({ complete }: { complete: () => Promise<void> }) {
  const { user } = useAuth()
  const [tab, setTab] = useState<'upi' | 'card'>('upi')
  const [receiverUpiId, setReceiverUpiId] = useState('')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [pin, setPin] = useState('')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [sourceBankAccountId, setSourceBankAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<BankAccount[]>({ url: '/banking', method: 'GET' }).then(list => {
      setAccounts(list)
      setSourceBankAccountId(list.find(account => account.primary)?.id || list[0]?.id || '')
    }).catch(() => setAccounts([]))
  }, [])

  async function sendUpi(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null)
    const num = Number(amount)
    if (!receiverUpiId.trim()) { setError('Enter a receiver UPI ID'); return }
    if (!num || num <= 0) { setError('Enter a valid amount'); return }
    if (num > 100000) { setError('Maximum transfer limit is ₹1,00,000 per transaction'); return }
    setLoading(true)
    try {
      const tx = await paymentService.send({ receiverUpiId: receiverUpiId.trim().toLowerCase(), amount: num, remark: remark.trim() || undefined, sourceBankAccountId: sourceBankAccountId || undefined, pin })
      setSuccess(`✓ ₹${num.toFixed(2)} sent to ${receiverUpiId}! Ref: ${tx.transactionRef}`)
      setAmount(''); setRemark(''); setReceiverUpiId(''); setPin('')
      await complete()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Transfer failed. Please try again.'))
    } finally { setLoading(false) }
  }

  async function payWithRazorpay() {
    setError(null); setSuccess(null)
    const num = Number(amount)
    if (!num || num <= 0) { setError('Enter a valid amount'); return }
    setLoading(true)
    try {
      await openRazorpay({
        amount: num,
        name: user?.fullName || 'CloudPay User',
        email: user?.email || '',
        description: remark || 'CloudPay Top-up',
        onSuccess: async (data) => {
          // Verify on server and credit account
          const token = sessionStorage.getAccessToken()
          const res = await fetch('/api/razorpay', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: 'Bearer ' + token } : {}),
            },
            body: JSON.stringify({ ...data, amount: num }),
          })
          const result = await res.json()
          if (result.verified) {
            setSuccess(`✓ Payment of ₹${num} successful! Payment ID: ${data.razorpay_payment_id}`)
            setAmount(''); setRemark('')
            await complete()
          } else {
            setError(result.error || 'Payment verification failed. Contact support.')
          }
          setLoading(false)
        },
        onFailure: (msg) => { setError(msg); setLoading(false) },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Payment failed'))
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Payments</p>
        <h1 className="mt-1 text-2xl font-bold">Send Money</h1>
        <p className="mt-1 text-sm text-muted-foreground">Transfer instantly via UPI or pay securely with Razorpay.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {[{ id: 'upi', label: 'CloudPay UPI', icon: Zap }, { id: 'card', label: 'Pay via Card (Razorpay)', icon: CreditCard }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as 'upi' | 'card'); setError(null); setSuccess(null) }}
            id={`tab-${t.id}`}
            className={'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ' + (tab === t.id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </div>

      <Card className="payment-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Shield className="size-4 text-primary" />Secure & Encrypted Transfer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4"><ErrBanner message={error} /></div>}
          {success && <div className="mb-4"><OkBanner message={success} /></div>}

          {tab === 'upi' ? (
            <form onSubmit={sendUpi} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Pay from bank account
                <select required value={sourceBankAccountId} onChange={e => setSourceBankAccountId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select a linked account</option>
                  {accounts.map(account => <option key={account.id} value={account.id}>{account.bankName} · {account.accountNumber.slice(-4)} · {account.upiId || 'UPI not configured'}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Receiver UPI ID
                <Input required value={receiverUpiId} id="receiver-upi"
                  onChange={e => setReceiverUpiId(e.target.value)}
                  placeholder="name@cloudpay" autoComplete="off" />
              </label>
              <div className="flex flex-wrap gap-2">
                {['alex@cloudpay', 'rahulverma@cloudpay'].map(upi => (
                  <button type="button" key={upi} onClick={() => setReceiverUpiId(upi)}
                    className="rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-primary/10 hover:border-primary/30 transition-colors">
                    {upi}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Amount (₹)
                <Input required type="number" min="0.01" max="100000" step="0.01" id="send-amount"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="text-xl font-bold" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Remark <span className="font-normal text-muted-foreground">(optional)</span>
                <Input value={remark} onChange={e => setRemark(e.target.value)} id="send-remark"
                  placeholder="What's this for?" maxLength={255} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Transaction PIN
                <Input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Enter your 4–6 digit PIN" autoComplete="off" />
                <span className="text-xs font-normal text-muted-foreground">Your PIN is verified securely on the server and never stored in the browser.</span>
              </label>
              <Button type="submit" disabled={loading} className="h-12 text-base gap-2" id="send-submit-btn">
                {loading ? <><Loader2 className="size-5 animate-spin" />Sending…</> : <><Send className="size-5" />Send Securely</>}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Amount to pay (₹)
                <Input required type="number" min="1" step="0.01" id="rzp-amount"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="text-xl font-bold" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
                <Input value={remark} onChange={e => setRemark(e.target.value)} id="rzp-remark"
                  placeholder="Payment description" maxLength={255} />
              </label>
              <div className="rounded-xl bg-amber-500/10 border border-amber-200/40 p-4 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold">Test Mode</p>
                <p className="mt-1 text-xs">Use card <span className="font-mono">4111 1111 1111 1111</span>, any expiry, any CVV. Or UPI: <span className="font-mono">success@razorpay</span></p>
              </div>
              <Button onClick={payWithRazorpay} disabled={loading} className="h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700" id="rzp-pay-btn">
                {loading ? <><Loader2 className="size-5 animate-spin" />Opening payment…</> : <><CreditCard className="size-5" />Pay with Razorpay</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Receive Money ─────────────────────────────────────────────────────────────

function ReceiveView() {
  const { user } = useAuth()
  const [qr, setQr] = useState<GenerateQrResponse | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [reqAmount, setReqAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiRequest<BankAccount[]>({ url: '/banking', method: 'GET' }),
      qrService.generate(),
    ]).then(([list, generated]) => { setAccounts(list); setSelectedAccountId(generated.bankAccountId || list.find(account => account.primary)?.id || ''); setQr(generated) }).catch(e => setError(getApiErrorMessage(e))).finally(() => setLoading(false))
  }, [])

  async function chooseAccount(accountId: string) {
    setSelectedAccountId(accountId); setLoading(true); setError(null)
    try { setQr(await qrService.generate(accountId)) } catch (e) { setError(getApiErrorMessage(e)) } finally { setLoading(false) }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2500)
  }

  const finalPayload = useMemo(() => {
    if (!qr) return ''
    const num = Number(reqAmount)
    if (num > 0) {
      return `${qr.payload}&am=${num.toFixed(2)}`
    }
    return qr.payload
  }, [qr, reqAmount])

  // Google Pay / UPI deep-link
  const gpayLink = finalPayload || null

  // Function to download QR code image as PNG
  function downloadQr() {
    const svg = document.getElementById('receive-qr-svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 400, 400)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `cloudpay-qr-${qr?.upiId || 'upi'}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Payments</p>
        <h1 className="mt-1 text-2xl font-bold">Receive Money</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your dynamic QR code or UPI ID. Anyone with Google Pay, PhonePe, Paytm, BHIM, or any UPI app can scan it.
        </p>
      </div>
      <Card className="payment-card">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          {loading ? (
            <Spin label="Generating your QR code…" compact />
          ) : error ? (
            <ErrBanner message={error} />
          ) : qr ? (
            <>
              {accounts.length > 0 && <label className="w-full max-w-sm text-left text-sm font-medium">Receive into bank account
                <select value={selectedAccountId} onChange={e => chooseAccount(e.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {accounts.map(account => <option key={account.id} value={account.id}>{account.bankName} · {account.accountNumber.slice(-4)} · {account.upiId || 'UPI not configured'}</option>)}
                </select>
              </label>}
              {/* Optional Amount Request */}
              <div className="w-full max-w-sm flex flex-col gap-2 text-left">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Request Specific Amount (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={reqAmount}
                      onChange={(e) => setReqAmount(e.target.value)}
                      placeholder="e.g. 500 (pre-fills on payer phone)"
                      className="pl-7 text-sm font-medium"
                      id="receive-amount-input"
                    />
                  </div>
                  {reqAmount && (
                    <Button variant="ghost" size="sm" onClick={() => setReqAmount('')} className="text-xs">
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[100, 250, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReqAmount(String(amt))}
                      className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-xs font-medium hover:bg-primary/10 transition-colors"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code */}
              <div className="relative rounded-2xl border-4 border-primary/30 bg-white p-4 shadow-xl">
                <QRCodeSVG id="receive-qr-svg" value={finalPayload} size={220} level="H" includeMargin />
                {Number(reqAmount) > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                    Requesting: ₹{Number(reqAmount).toFixed(2)}
                  </div>
                )}
              </div>

              <div>
                <p className="text-lg font-bold tracking-wide">{qr.upiId}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{qr.upiName || user?.fullName}{qr.upiNumber ? ` · ${qr.upiNumber}` : ''}</p>
              </div>

              {/* Action buttons */}
              <div className="grid w-full gap-2 sm:grid-cols-3">
                <Button variant="outline" onClick={() => copy(qr.upiId, 'upi')} className="gap-2" id="copy-upi-btn">
                  {copied === 'upi' ? <><CheckCircle2 className="size-4 text-emerald-500" />Copied!</> : 'Copy UPI ID'}
                </Button>
                <Button variant="outline" onClick={() => copy(finalPayload, 'link')} className="gap-2 text-xs" id="copy-link-btn">
                  {copied === 'link' ? <><CheckCircle2 className="size-4 text-emerald-500" />Copied!</> : 'Copy UPI Link'}
                </Button>
                <Button variant="outline" onClick={downloadQr} className="gap-2" id="download-qr-btn">
                  <Download className="size-4" />Save QR PNG
                </Button>
              </div>

              {/* Open in Google Pay (mobile) */}
              {gpayLink && (
                <a href={gpayLink} className="w-full" id="open-gpay-btn">
                  <Button className="w-full gap-2 bg-[#1a73e8] hover:bg-[#1558b0] text-white font-semibold">
                    <Smartphone className="size-4" />
                    Open in Google Pay (Mobile)
                  </Button>
                </a>
              )}

              <div className="flex items-center justify-center gap-2 pt-2 border-t w-full text-xs text-muted-foreground">
                <Shield className="size-3.5 text-primary" />
                <span>NPCI UPI Compliant · Google Pay, PhonePe, Paytm & BHIM</span>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── QR / UPI Pay View ────────────────────────────────────────────────────────

function QrPayView({ complete }: { complete: () => Promise<void> }) {
  const [input, setInput] = useState('')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [sourceBankAccountId, setSourceBankAccountId] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [detectedUpi, setDetectedUpi] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    apiRequest<BankAccount[]>({ url: '/banking', method: 'GET' }).then(list => {
      setAccounts(list)
      setSourceBankAccountId(list.find(account => account.primary)?.id || list[0]?.id || '')
    }).catch(err => setError(getApiErrorMessage(err, 'Unable to load source bank accounts')))
  }, [])

  // Parse UPI payload: upi://pay?pa=name@cloudpay&... or just name@cloudpay
  function parseUpiId(raw: string): string {
    raw = raw.trim()
    if (raw.startsWith('upi://') || raw.startsWith('cloudpay://')) {
      try {
        const url = new URL(raw.replace(/^(upi|cloudpay):\/\//, 'http://dummy.com/'))
        return url.searchParams.get('pa') || url.searchParams.get('upiId') || raw
      } catch { return raw }
    }
    const match = raw.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/i)
    if (match) return match[0]
    return raw
  }

  function handleDetectedCode(codeStr: string) {
    setInput(codeStr)
    const upi = parseUpiId(codeStr)
    setDetectedUpi(upi)
    // Extract amount if present in QR code
    try {
      if (codeStr.includes('?')) {
        const url = new URL(codeStr.replace(/^(upi|cloudpay):\/\//, 'http://dummy.com/'))
        const amt = url.searchParams.get('am')
        if (amt && Number(amt) > 0) setAmount(amt)
        const note = url.searchParams.get('tn')
        if (note) setRemark(note)
      }
    } catch {}
  }

  // Camera scanner
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setScanning(false)
  }

  async function startCamera() {
    setError(null)
    setSuccess(null)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        const scan = () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const res = jsQR(imgData.data, imgData.width, imgData.height)
              if (res && res.data) {
                handleDetectedCode(res.data)
                stopCamera()
                return
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(scan)
        }
        animFrameRef.current = requestAnimationFrame(scan)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied'
      setError(`Camera error: ${msg}. You can also upload a QR screenshot below.`)
      stopCamera()
    }
  }

  // Image file QR decoding
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        canvas.width = img.width
        canvas.height = img.height
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const res = jsQR(imgData.data, imgData.width, imgData.height)
        if (res && res.data) {
          handleDetectedCode(res.data)
          setSuccess(`✓ QR Code Detected: ${parseUpiId(res.data)}`)
        } else {
          setError('No QR code detected in the uploaded image. Please ensure the QR code is clearly visible.')
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null)
    const upiId = parseUpiId(input)
    const num = Number(amount)
    if (!upiId) { setError('Enter a valid UPI ID or QR payload'); return }
    if (!num || num <= 0) { setError('Enter a valid amount'); return }
    setLoading(true)
    try {
      const tx = await qrService.pay(input.trim(), num, remark.trim() || undefined, pin, sourceBankAccountId || undefined)
      setSuccess(`✓ ₹${num.toFixed(2)} sent to ${upiId}! Ref: ${tx.transactionRef}`)
      setInput(''); setAmount(''); setRemark(''); setPin(''); setDetectedUpi(null)
      await complete()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Payment failed. Check the UPI ID and try again.'))
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Payments</p>
        <h1 className="mt-1 text-2xl font-bold">Pay by QR / UPI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan using your camera, upload a Google Pay QR screenshot, or enter a UPI ID directly.
        </p>
      </div>

      {/* Mode selectors */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={scanning ? 'default' : 'outline'}
          onClick={scanning ? stopCamera : startCamera}
          className="h-11 gap-2"
          id="toggle-camera-btn"
        >
          {scanning ? <><VideoOff className="size-4" />Stop Camera</> : <><Camera className="size-4" />Scan with Camera</>}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-11 gap-2"
          id="upload-qr-btn"
        >
          <Upload className="size-4" />Upload QR Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Camera Live Viewfinder */}
      {scanning && (
        <Card className="payment-card overflow-hidden border-primary/50">
          <CardContent className="p-4 flex flex-col items-center">
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="size-full object-cover" />
              <div className="absolute inset-0 border-2 border-primary/60 border-dashed rounded-xl pointer-events-none" />
              <div className="absolute bottom-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                Point camera at Google Pay / UPI QR Code
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={stopCamera} className="mt-3 text-xs">
              Cancel Camera Scan
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="payment-card">
        <CardContent className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <ErrBanner message={error} />}
            {success && <OkBanner message={success} />}

            {detectedUpi && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Detected Recipient:</span>
                  <span className="text-xs font-bold">{detectedUpi}</span>
                </div>
                <button type="button" onClick={() => setDetectedUpi(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              </div>
            )}

            <label className="flex flex-col gap-2 text-sm font-medium">
              UPI ID or QR Payload
              <Input
                required
                value={input}
                id="qr-input"
                onChange={e => { setInput(e.target.value); setDetectedUpi(parseUpiId(e.target.value)) }}
                placeholder="name@cloudpay  or  upi://pay?pa=name@cloudpay&…"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Quick Presets:</span>
              {['alex@cloudpay', 'labh@cloudpay', 'rahulverma@cloudpay'].map(upi => (
                <button
                  type="button"
                  key={upi}
                  onClick={() => { setInput(upi); setDetectedUpi(upi) }}
                  className="rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-primary/10 transition-colors"
                >
                  {upi}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Amount (₹)
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                id="qr-amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-xl font-bold"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Remark <span className="font-normal text-muted-foreground">(optional)</span>
              <Input
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="Payment note (e.g. Dinner, Rent)"
                maxLength={255}
                id="qr-remark"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Pay from bank account
              <select required value={sourceBankAccountId} onChange={e => setSourceBankAccountId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {accounts.map(account => <option key={account.id} value={account.id}>{account.bankName} Â· {account.accountNumber.slice(-4)} Â· {account.upiId || 'UPI account'}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              UPI PIN
              <Input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Enter your 4–6 digit PIN" autoComplete="off" />
            </label>

            <Button type="submit" disabled={loading} className="h-12 text-base gap-2" id="qr-pay-btn">
              {loading ? <><Loader2 className="size-5 animate-spin" />Processing…</> : <><QrCode className="size-5" />Pay Securely</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-dashed payment-card">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to pay from Google Pay</p>
          <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Open Google Pay on your phone</li>
            <li>Tap <strong>Scan any QR code</strong></li>
            <li>Scan the recipient&apos;s QR from their <strong>Receive Money</strong> page</li>
            <li>Enter the amount and pay</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Banking View ─────────────────────────────────────────────────────────────

function BankingView() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addErr, setAddErr] = useState<string | null>(null)
  const [addOk, setAddOk] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddBankAccountPayload>({ accountNumber: '', ifscCode: '', bankName: '', accountHolderName: '', makePrimary: false })

  const load = useCallback(async () => {
    setError(null); setLoading(true)
    try { setAccounts(await apiRequest<BankAccount[]>({ url: '/banking', method: 'GET' })) }
    catch (err) { setError(getApiErrorMessage(err, 'Unable to load bank accounts')) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddErr(null); setAddOk(null); setAdding(true)
    try {
      const acc = await apiRequest<BankAccount>({ url: '/banking', method: 'POST', data: form })
      setAccounts(prev => form.makePrimary ? [acc, ...prev.map(a => ({ ...a, primary: false }))] : [...prev, acc])
      setAddOk(`Bank account ending ••••${form.accountNumber.slice(-4)} added!`)
      setShowForm(false)
      setForm({ accountNumber: '', ifscCode: '', bankName: '', accountHolderName: '', makePrimary: false })
    } catch (err) { setAddErr(getApiErrorMessage(err, 'Unable to add bank account')) }
    finally { setAdding(false) }
  }

  async function del(id: string) {
    try {
      await apiRequest({ url: `/banking?id=${id}`, method: 'DELETE' })
      setAccounts(p => p.filter(a => a.id !== id))
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to remove account')) }
  }

  const banks = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Yes Bank', 'IDFC First Bank', 'IndusInd Bank']

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Payments</p>
          <h1 className="mt-1 text-2xl font-bold">Bank Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage linked accounts and create a separate UPI ID for each bank.</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="gap-2 shrink-0" id="add-bank-btn">
          <PlusCircle className="size-4" />{showForm ? 'Cancel' : 'Add Account'}
        </Button>
      </div>

      {addOk && <OkBanner message={addOk} />}
      {error && <ErrBanner message={error} retry={load} />}

      {showForm && (
        <Card className="payment-card border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Link New Bank Account</CardTitle><p className="text-sm text-muted-foreground">CloudPay will create a unique UPI ID for this account.</p></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              {addErr && <ErrBanner message={addErr} />}
              <label className="flex flex-col gap-2 text-sm font-medium">
                Account Holder Name
                <Input required id="acct-holder" value={form.accountHolderName}
                  onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))}
                  placeholder="Full name as per bank records" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Account Number
                <Input required id="acct-number" value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="Enter 9-18 digit account number" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                IFSC Code
                <Input required id="ifsc-code" value={form.ifscCode} maxLength={11}
                  onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Bank Name
                <select id="bank-name" value={form.bankName}
                  onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select your bank</option>
                  {banks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                UPI display name <span className="font-normal text-muted-foreground">(optional)</span>
                <Input value={form.upiName || ''} onChange={e => setForm(f => ({ ...f, upiName: e.target.value }))} placeholder="Name shown on this account's UPI ID" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                UPI mobile number <span className="font-normal text-muted-foreground">(optional)</span>
                <Input value={form.upiNumber || ''} inputMode="numeric" maxLength={15} onChange={e => setForm(f => ({ ...f, upiNumber: e.target.value.replace(/\D/g, '') }))} placeholder="10–15 digit number" />
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                <input type="checkbox" id="make-primary" checked={!!form.makePrimary}
                  onChange={e => setForm(f => ({ ...f, makePrimary: e.target.checked }))}
                  className="size-4 rounded" />
                Set as primary account
              </label>
              <Button type="submit" disabled={adding} className="h-10" id="save-bank-btn">
                {adding ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</> : 'Save Bank Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? <Spin label="Loading bank accounts…" compact /> :
        accounts.length === 0 ? (
          <Card className="payment-card">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <BanknoteIcon className="size-12 text-muted-foreground/30" />
              <div><p className="font-semibold">No bank accounts linked yet</p><p className="mt-1 text-sm text-muted-foreground">Add your bank account to track balances.</p></div>
              <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2"><PlusCircle className="size-4" />Add First Account</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map(acc => (
              <Card key={acc.id} className={'payment-card ' + (acc.primary ? 'border-primary/50 bg-primary/5' : '')}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={'flex size-10 shrink-0 items-center justify-center rounded-xl ' + (acc.primary ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      <BanknoteIcon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{acc.bankName}</p>
                        {acc.primary && <Badge variant="secondary" className="text-[10px]">Primary</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{acc.accountHolderName} · ••••{acc.accountNumber.slice(-4)}</p>
                      <p className="text-xs text-primary">UPI: {acc.upiId || 'Pending setup'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Balance protected · use Check balance on Dashboard</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!acc.primary && <button onClick={async () => { try { const updated = await apiRequest<BankAccount>({ url: `/banking?id=${acc.id}`, method: 'PUT' }); setAccounts(p => p.map(a => ({ ...a, primary: a.id === updated.id }))) } catch (err) { setError(getApiErrorMessage(err, 'Unable to select account')) } }} className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">Use for payments</button>}
                    <button onClick={() => del(acc.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Remove account" aria-label="Remove bank account"><Trash2 className="size-4" /></button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function TransactionsView({ history, loading, error, retry, userId }: {
  history: PageResponse<Transaction> | null; loading: boolean; error: string | null; retry: () => void; userId?: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Activity</p>
        <h1 className="mt-1 text-2xl font-bold">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Complete history of all your payments and receipts.</p>
      </div>
      {error && <ErrBanner message={error} retry={retry} />}
      <Card className="payment-card">
        <CardHeader>
          <CardTitle className="text-base">All Transactions
            <span className="ml-2 text-sm font-normal text-muted-foreground">({history?.totalElements ?? 0} total)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <Spin label="Loading transactions…" compact /> :
            !history?.content.length ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <ReceiptText className="size-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No transactions yet. Send your first payment!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {history.content.map(tx => {
                  const sent = tx.senderId === userId
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                      <Avatar className="size-10 border shrink-0">
                        <AvatarFallback className={sent ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-700'}>
                          {sent ? '↑' : '↓'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{sent ? tx.receiverUpiId : tx.senderUpiId}</p>
                        <p className="truncate text-xs text-muted-foreground">{tx.remark || 'No remark'} · {fmtDate(tx.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={'text-sm font-bold ' + (sent ? 'text-red-600' : 'text-emerald-600')}>
                          {sent ? '−' : '+'}{money(tx.amount)}
                        </p>
                        <Badge variant={tx.status === 'SUCCESS' ? 'secondary' : 'outline'} className="mt-0.5 text-[10px]">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileView({ go }: { go: (v: View) => void }) {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', email: '' })
  const [savingPin, setSavingPin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinConfigured, setPinConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [kyc, setKyc] = useState<KycVerification | null>(null)
  const [kycSubmitting, setKycSubmitting] = useState(false)
  const [kycForm, setKycForm] = useState({ legalName: '', dateOfBirth: '', governmentIdLast4: '', consent: false })
  const initials = user?.fullName?.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || '??'

  useEffect(() => {
    if (user) setProfileForm({ fullName: user.fullName, phone: user.phone || '', email: user.email })
    Promise.all([userService.pinStatus(), kycService.status()]).then(([pinResult, kycResult]) => { setPinConfigured(pinResult.configured); setKyc(kycResult) }).catch(() => {})
  }, [user])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null); setSavingProfile(true)
    try {
      const result = await userService.updateProfile(profileForm)
      updateUser(result.user)
      setOk(result.emailChangePending ? 'Profile updated. Check the new email inbox and confirm the address before it becomes active.' : 'Profile details updated securely.')
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to update profile')) }
    finally { setSavingProfile(false) }
  }

  async function genUpi() {
    setLoading(true); setError(null); setOk(null)
    try { const u = await userService.generateUpi(); updateUser(u); setOk(`UPI ID: ${u.upiId}`) }
    catch (err) { setError(getApiErrorMessage(err)) }
    finally { setLoading(false) }
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null); setSavingPin(true)
    try { await userService.setPin(pin, confirmPin, currentPin || undefined); setPinConfigured(true); setCurrentPin(''); setPin(''); setConfirmPin(''); setOk('Transaction PIN saved securely. You will need it for every transfer.') }
    catch (err) { setError(getApiErrorMessage(err, 'Unable to save transaction PIN')) }
    finally { setSavingPin(false) }
  }

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null); setKycSubmitting(true)
    try { setKyc(await kycService.submit(kycForm)); setKycForm({ legalName: '', dateOfBirth: '', governmentIdLast4: '', consent: false }); setOk('KYC submitted for review. We do not store raw government documents.') }
    catch (err) { setError(getApiErrorMessage(err, 'Unable to submit KYC')) }
    finally { setKycSubmitting(false) }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="mt-1 text-2xl font-bold">Your Profile</h1>
      </div>
      {error && <ErrBanner message={error} />}
      {ok && <OkBanner message={ok} />}
      <Card className="payment-card">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <Avatar className="size-16 border-2 border-primary/20 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">{user?.fullName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
            {user?.upiId ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                <Zap className="size-3 text-primary" fill="currentColor" />
                <span className="text-sm font-bold text-primary">{user.upiId}</span>
              </div>
            ) : (
              <Button onClick={genUpi} disabled={loading} variant="outline" className="mt-3 gap-2" id="gen-upi-btn">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}Generate UPI ID
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="payment-card border-violet-500/20">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Shield className="size-4 text-violet-600" />KYC verification</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Status: <strong>{kyc?.status || user?.kycStatus || 'NOT_STARTED'}</strong>. KYC is submitted securely for review; raw PAN, Aadhaar, or identity documents are never stored here.</p>
          {kyc?.status === 'VERIFIED' ? <OkBanner message="Your KYC is verified." /> : <form onSubmit={submitKyc} className="grid gap-3 sm:grid-cols-2">
            <Input required placeholder="Legal name" value={kycForm.legalName} onChange={e => setKycForm(form => ({ ...form, legalName: e.target.value }))} />
            <Input type="date" aria-label="Date of birth" value={kycForm.dateOfBirth} onChange={e => setKycForm(form => ({ ...form, dateOfBirth: e.target.value }))} />
            <Input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Government ID last 4 digits" value={kycForm.governmentIdLast4} onChange={e => setKycForm(form => ({ ...form, governmentIdLast4: e.target.value.replace(/\D/g, '') }))} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" required checked={kycForm.consent} onChange={e => setKycForm(form => ({ ...form, consent: e.target.checked }))} />I consent to KYC verification.</label>
            <Button type="submit" disabled={kycSubmitting} className="sm:col-span-2">{kycSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit KYC for review'}</Button>
          </form>}
        </CardContent>
      </Card>
      <Card className="payment-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Edit personal details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">Full name<Input required maxLength={150} value={profileForm.fullName} onChange={e => setProfileForm(form => ({ ...form, fullName: e.target.value }))} /></label>
            <label className="flex flex-col gap-2 text-sm font-medium">Phone number<Input required maxLength={20} inputMode="tel" value={profileForm.phone} onChange={e => setProfileForm(form => ({ ...form, phone: e.target.value }))} /></label>
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">Email address<Input required type="email" value={profileForm.email} onChange={e => setProfileForm(form => ({ ...form, email: e.target.value }))} /></label>
            <p className="text-xs text-muted-foreground sm:col-span-2">Changing email sends a verification message. The old email remains active until confirmation.</p>
            <Button type="submit" disabled={savingProfile} className="sm:col-span-2">{savingProfile ? <Loader2 className="size-4 animate-spin" /> : 'Save personal details'}</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="payment-card border-primary/20">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Shield className="size-4 text-primary" />Transaction PIN</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{pinConfigured ? 'Your PIN is configured. You can replace it any time.' : 'Set a 4–6 digit PIN. CloudPay will require it before every money transfer.'}</p>
          <form onSubmit={savePin} className="grid gap-3 sm:grid-cols-2">
            {pinConfigured && <Input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} placeholder="Current PIN" autoComplete="current-password" />}
            <Input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="New PIN" autoComplete="new-password" />
            <Input required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="Confirm PIN" autoComplete="new-password" />
            <Button type="submit" disabled={savingPin} className="sm:col-span-2">{savingPin ? <Loader2 className="size-4 animate-spin" /> : 'Save transaction PIN'}</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="payment-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Manage your CloudPay account</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {[['Bank accounts', 'Link accounts and choose where payments come from', 'banking'], ['Your QR code', 'Receive money using your selected bank account', 'receive'], ['Refer a friend', 'Share CloudPay and earn eligible rewards', 'services'], ['Rewards', 'Track cashback and referral benefits', 'services'], ['RuPay credit card', 'Connect a RuPay credit card for UPI payments', 'services'], ['UPI Lite', 'Set up small-value payments without entering PIN each time', 'services'], ['Check CIBIL score', 'Use an authorised credit bureau partner', 'services'], ['Manage account', 'Profile, security, notifications and linked services', 'profile']].map(([title, desc, target]) => <button key={title} type="button" onClick={() => go(target as View)} className="rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-primary/[0.03]"><p className="font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{desc}</p></button>)}
        </CardContent>
      </Card>
      <Card className="payment-card">
        <CardContent className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account Details</p>
          <dl className="flex flex-col gap-3">
            {[
              ['Full Name', user?.fullName],
              ['Email', user?.email],
              ['Phone', user?.phone || 'Not set'],
              ['UPI ID', user?.upiId || 'Not generated'],
              ['Role', user?.role],
              ['KYC', user?.kycVerified ? '✓ Verified' : 'Pending'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function ServicesView({ go }: { go: (v: View) => void }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState('')
  const services = [
    { id: 'scan', label: 'Scan QR', desc: 'Scan and pay with camera permission', Icon: QrCode, action: () => go('qr') },
    { id: 'pay', label: 'Pay anyone', desc: 'Send money to a UPI ID', Icon: Send, action: () => go('send') },
    { id: 'bank', label: 'Bank transfer', desc: 'Choose a linked bank account', Icon: BanknoteIcon, action: () => go('send') },
    { id: 'recharge', label: 'Mobile recharge', desc: 'Recharge and bill payments', Icon: Smartphone },
    { id: 'offers', label: 'Offers', desc: 'Personalised payment offers', Icon: Zap },
    { id: 'rewards', label: 'Rewards', desc: 'Cashback and reward history', Icon: Wallet },
    { id: 'refer', label: 'Refer & earn', desc: 'Invite friends to CloudPay', Icon: UserRound },
    { id: 'rupay', label: 'RuPay credit card', desc: 'Link a RuPay card for UPI', Icon: CreditCard },
    { id: 'lite', label: 'UPI Lite', desc: 'Small-value PIN-light payments', Icon: Shield },
    { id: 'cibil', label: 'Check CIBIL score', desc: 'Credit score via an authorised partner', Icon: ReceiptText },
  ]
  const selectedService = services.find(service => service.id === selected)

  return (
    <div className="mx-auto w-full max-w-4xl flex flex-col gap-6">
      <div><p className="text-sm text-muted-foreground">CloudPay tools</p><h1 className="mt-1 text-2xl font-bold">All Services</h1><p className="mt-1 text-sm text-muted-foreground">Payments, account tools, rewards, and partner services in one place.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {services.map(({ id, label, desc, Icon, action }) => <button key={id} type="button" onClick={() => action ? action() : setSelected(id)} className={'rounded-2xl border p-4 text-left transition hover:border-primary/40 hover:shadow-sm ' + (selected === id ? 'border-primary bg-primary/[0.04]' : '')}><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><p className="mt-3 font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{desc}</p></button>)}
      </div>
      {selectedService && <Card className="payment-card border-primary/20"><CardContent className="p-6"><p className="text-lg font-bold">{selectedService.label}</p><p className="mt-2 text-sm text-muted-foreground">This service needs a regulated partner integration before it can process real transactions. Your account and payment data stay protected until the service is enabled.</p>{selectedService.id === 'refer' && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">Your referral code: <strong>{'CLOUD' + (user?.id || '').slice(0, 6).toUpperCase()}</strong></p>}{selectedService.id === 'rewards' && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">Rewards balance: <strong>₹0</strong> · Complete eligible offers to earn.</p>}{selectedService.id === 'cibil' && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">CIBIL score access will require your explicit consent and an authorised bureau connection.</p>}</CardContent></Card>}
    </div>
  )
}

function NotificationsView() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await notificationService.list()) }
    catch (err) { setError(getApiErrorMessage(err, 'Unable to load notifications')) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    try {
      await notificationService.markRead(id)
      setItems(current => current.map(item => item.id === id ? { ...item, read: true } : item))
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to update notification')) }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Account activity</p>
          <h1 className="mt-1 text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Payment confirmations, receipts, and security updates.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={'mr-2 size-3.5 ' + (loading ? 'animate-spin' : '')} />Refresh</Button>
      </div>
      {error && <ErrBanner message={error} retry={load} />}
      {loading && items.length === 0 ? <Spin label="Loading notifications…" /> : items.length === 0 ? (
        <Card className="payment-card"><CardContent className="flex flex-col items-center gap-3 p-10 text-center"><Bell className="size-8 text-muted-foreground" /><p className="font-medium">You&apos;re all caught up</p><p className="text-sm text-muted-foreground">New payment activity will appear here.</p></CardContent></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <Card key={item.id} className={'payment-card ' + (!item.read ? 'border-primary/40 bg-primary/[0.03]' : '')}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ' + (!item.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}><Bell className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.title}</p><time className="text-xs text-muted-foreground">{fmtDate(item.createdAt)}</time></div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                  {!item.read && <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs text-primary" onClick={() => markRead(item.id)}>Mark as read</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const [view, setView] = useState<View>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [history, setHistory] = useState<PageResponse<Transaction> | null>(null)
  const [loading, setLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [histErr, setHistErr] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadDash = useCallback(async () => {
    setErr(null); setLoading(true)
    try { setDashboard(await userService.dashboard()) }
    catch (e) { setErr(getApiErrorMessage(e, 'Unable to load dashboard')) }
    finally { setLoading(false) }
  }, [])

  const loadHist = useCallback(async () => {
    setHistErr(null); setHistLoading(true)
    try { setHistory(await paymentService.history()) }
    catch (e) { setHistErr(getApiErrorMessage(e, 'Unable to load transactions')) }
    finally { setHistLoading(false) }
  }, [])

  const reload = useCallback(async () => {
    await Promise.all([loadDash(), loadHist()])
  }, [loadDash, loadHist])

  useEffect(() => { reload() }, [reload])

  // Real-time updates via Supabase Realtime channel + fallback polling
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`user-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: any) => {
          const rec = payload.new || payload.old
          if (rec && (rec.sender_id === user.id || rec.receiver_id === user.id)) {
            reload()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank_accounts', filter: `user_id=eq.${user.id}` },
        () => {
          reload()
        }
      )
      .subscribe()

    pollRef.current = setInterval(() => { loadDash() }, 15000)

    return () => {
      supabase.removeChannel(channel)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [user?.id, reload, loadDash])

  const activeLabel = useMemo(() => navItems.find(i => i.id === view)?.label ?? 'Dashboard', [view])
  function go(v: View) { setView(v); setMobileOpen(false) }

  let content: React.ReactNode
  if (view === 'dashboard') content = <DashboardView data={dashboard} loading={loading} error={err} retry={loadDash} go={go} />
  else if (view === 'send') content = <SendView complete={reload} />
  else if (view === 'receive') content = <ReceiveView />
  else if (view === 'qr') content = <QrPayView complete={reload} />
  else if (view === 'banking') content = <BankingView />
  else if (view === 'transactions') content = <TransactionsView history={history} loading={histLoading} error={histErr} retry={loadHist} userId={user?.id} />
  else if (view === 'notifications') content = <NotificationsView />
  else if (view === 'services') content = <ServicesView go={go} />
  else if (view === 'profile') content = <ProfileView go={go} />

  return (
    <div className="payment-shell min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-border/70 bg-card px-4 py-5 transition-transform duration-200 lg:translate-x-0 ' + (mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
              <Zap className="size-4" fill="currentColor" />
            </div>
            <span className="text-lg font-bold tracking-tight">CloudPay</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)}><X /></Button>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {navItems.map(item => (
            <button key={item.id} id={`nav-${item.id}`} onClick={() => go(item.id)}
              className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ' + (view === item.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <item.icon className="size-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-border/60 pt-4">
          <p className="truncate px-3 text-sm font-semibold">{user?.fullName}</p>
          <p className="truncate px-3 text-xs text-muted-foreground">{user?.upiId || user?.email}</p>
          <Button variant="ghost" id="logout-btn" onClick={logout}
            className="mt-2 w-full justify-start gap-3 text-muted-foreground hover:text-destructive">
            <LogOut className="size-[18px]" />Log out
          </Button>
        </div>
      </aside>

      {mobileOpen && <button aria-label="Close nav" className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="size-3 text-primary" fill="currentColor" />
              CloudPay / <strong className="text-foreground">{activeLabel}</strong>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] p-4 sm:p-8">{content}</main>
      </div>
    </div>
  )
}

export default function Page() {
  return <ProtectedRoute><Dashboard /></ProtectedRoute>
}
