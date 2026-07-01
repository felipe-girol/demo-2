<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section aria-labelledby="nf-h" class="not-found">
    <h1 id="nf-h">Page not found</h1>
    <p>The page you are looking for does not exist.</p>
    <RouterLink to="/" class="back-link">Back to home</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 2rem 1rem;
}

.back-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--accent);
}
</style>
