import { redirect } from 'next/navigation'

export default function Home({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const params = new URLSearchParams()
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v)
      } else if (typeof value === 'string') {
        params.set(key, value)
      }
    }
  }

  const hasAuthParams = params.has('code') || params.has('token_hash')
  if (hasAuthParams) {
    const query = params.toString()
    redirect(`/auth/callback${query ? `?${query}` : ''}`)
  }

  redirect('/dashboard')
}
