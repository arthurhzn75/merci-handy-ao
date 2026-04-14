import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const router = useRouter()

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-a': () => router.push('/acquisition'),
    'g-p': () => router.push('/products'),
    'g-c': () => router.push('/customers'),
    'g-g': () => router.push('/geography')
  })

  return {}
}

export const useDashboard = createSharedComposable(_useDashboard)
