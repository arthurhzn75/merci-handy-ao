<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2" :class="[collapsed ? 'justify-center' : 'px-2 py-3']">
    <div
      class="flex items-center justify-center shrink-0 rounded-full bg-mh-black text-white font-bold"
      :class="[collapsed ? 'size-8 text-xs' : 'size-9 text-sm']"
    >
      MH
    </div>
    <div v-if="!collapsed" class="flex flex-col min-w-0">
      <span class="text-sm font-semibold text-highlighted truncate">Merci Handy</span>
      <span class="text-xs text-muted truncate">Analyse Produit</span>
    </div>
  </div>
</template>
