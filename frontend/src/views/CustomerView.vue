<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section aria-labelledby="customer-h">
    <h1 id="customer-h">Customer</h1>
    <p>Browse the launch program and see seat availability before you book.</p>
    <ul class="customer-links">
      <li>
        <RouterLink to="/customer/launches" class="customer-link">
          Browse launch catalog
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.customer-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.customer-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

.customer-link:hover {
  box-shadow: var(--shadow);
}

.customer-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
