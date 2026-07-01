<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section aria-labelledby="agency-h">
    <h1 id="agency-h">Agency</h1>
    <p>Manage your rocket fleet and your launches.</p>
    <ul class="agency-links">
      <li>
        <RouterLink to="/agency/rockets" class="agency-link">
          Manage rockets
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/agency/launches" class="agency-link">
          Manage launches
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.agency-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agency-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

.agency-link:hover {
  box-shadow: var(--shadow);
}

.agency-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
