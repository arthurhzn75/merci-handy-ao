import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const route = useRoute()
  const router = useRouter()

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-p': () => router.push('/products'),
    'g-m': () => router.push('/mix'),
    'g-r': () => router.push('/returns'),
    'g-d': () => router.push('/discounts'),
    'g-u': () => router.push('/unit-economics')
  })

  return {}
}

export const useDashboard = createSharedComposable(_useDashboard)
