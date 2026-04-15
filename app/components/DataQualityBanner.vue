<script setup lang="ts">
const props = defineProps<{
  cogsGapRate: number
  validationRate: number
  marginReliable: boolean
}>()
</script>

<template>
  <UAlert
    v-if="cogsGapRate > 10"
    color="warning"
    icon="i-lucide-alert-triangle"
    :title="`${cogsGapRate}% des lignes ont un COGS a 0`"
    description="Les marges affichees sont potentiellement sur-estimees. Verifiez les donnees COGS dans votre export Funnel.io."
    class="mb-4"
  />
  <div v-else-if="validationRate > 99 && cogsGapRate < 5" class="mb-4 flex items-center gap-2">
    <UBadge color="success" variant="subtle">
      <UIcon name="i-lucide-shield-check" class="size-3.5" />
      Donnees verifiees
    </UBadge>
    <span class="text-xs text-muted">Validation {{ validationRate }}% — COGS disponible sur {{ (100 - cogsGapRate).toFixed(0) }}% des lignes</span>
  </div>
</template>
