<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

useDashboard()

const open = ref(false)

const links = [{
  label: 'Vue d\'ensemble',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => { open.value = false }
}, {
  label: 'Acquisition',
  icon: 'i-lucide-megaphone',
  to: '/acquisition',
  onSelect: () => { open.value = false }
}, {
  label: 'Produits',
  icon: 'i-lucide-package',
  to: '/products',
  onSelect: () => { open.value = false }
}, {
  label: 'Clients',
  icon: 'i-lucide-users',
  to: '/customers',
  onSelect: () => { open.value = false }
}, {
  label: 'Geographie',
  icon: 'i-lucide-map-pin',
  to: '/geography',
  onSelect: () => { open.value = false }
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
