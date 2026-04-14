<template>
  <UCard :ui="{ body: '!px-0 !pt-0 !pb-3' }" class="mh-rainbow-border">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Evolution du CA net
        </p>
        <div class="h-8 w-32 bg-muted/20 rounded animate-pulse" />
      </div>
    </template>

    <div class="h-96 flex items-center justify-center">
      <p class="text-muted">Chargement du graphique...</p>
    </div>
  </UCard>
</template>
