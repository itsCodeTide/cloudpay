import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import type { ApiError, AuthResponse, User } from '@/frontend/types'

// Always use Next.js API routes — works in dev AND production without CORS issues
const API_BASE = '/api'
const ACCESS_TOKEN_KEY = 'cloudpay.accessToken'
const REFRESH_TOKEN_KEY = 'cloudpay.refreshToken'
const USER_KEY = 'cloudpay.user'

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: ApiError,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

export const sessionStorage = {
  getAccessToken: () => typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null
    const value = window.localStorage.getItem(USER_KEY)
    if (!value) return null
    try { return JSON.parse(value) as User } catch { return null }
  },
  save: (session: AuthResponse) => {
    if (typeof window === 'undefined') return
    if (session.accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
    if (session.refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  },
  saveUser: (user: User) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  saveTokens: (accessToken: string, refreshToken?: string | null) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clear: () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
  },
}

function toApiError(error: unknown): ApiClientError {
  const axiosError = error as AxiosError<ApiError>
  const body = axiosError.response?.data
  const message =
    (body as { message?: string })?.message ??
    axiosError.message ??
    'Request failed'
  return new ApiClientError(axiosError.response?.status ?? 0, message, body)
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = sessionStorage.getRefreshToken()
  if (!refreshToken) return null
  if (!refreshPromise) {
    // Try Supabase token refresh via anon key
    refreshPromise = import('@/frontend/lib/supabase')
      .then(({ supabase }) => supabase.auth.refreshSession({ refresh_token: refreshToken }))
      .then(({ data, error }) => {
        if (error || !data.session) {
          sessionStorage.clear()
          return null
        }
        sessionStorage.saveTokens(data.session.access_token, data.session.refresh_token)
        return data.session.access_token
      })
      .catch(() => {
        sessionStorage.clear()
        return null
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getAccessToken()
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const isAuthRequest = original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/sync')

    if (status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true
      const accessToken = await refreshAccessToken()
      if (accessToken) {
        original.headers = { ...original.headers, Authorization: 'Bearer ' + accessToken }
        return api(original)
      }
    }
    return Promise.reject(toApiError(error))
  },
)

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<T>(config)
    return response.data
  } catch (error) {
    if (error instanceof ApiClientError) throw error
    throw toApiError(error)
  }
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : fallback
}
