<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

useDashboard()

const open = ref(false)

const close = () => { open.value = false }

const links = [{
  label: 'Vue d\'ensemble',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: close
}, {
  label: 'Matrice Produit',
  icon: 'i-lucide-grid-3x3',
  to: '/products',
  onSelect: close
}, {
  label: 'Mix Produit',
  icon: 'i-lucide-pie-chart',
  to: '/mix',
  onSelect: close
}, {
  label: 'Retours',
  icon: 'i-lucide-undo-2',
  to: '/returns',
  onSelect: close
}, {
  label: 'Promotions',
  icon: 'i-lucide-tag',
  to: '/discounts',
  onSelect: close
}, {
  label: 'Unit Economics',
  icon: 'i-lucide-calculator',
  to: '/unit-economics',
  onSelect: close
}] satisfies NavigationMenuItem[]

const groups = computed(() => [{
  id: 'links',
  label: 'Navigation',
  items: links
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <div v-if="!collapsed" class="px-3 py-2 text-xs text-muted">
          Merci Handy Data
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>
