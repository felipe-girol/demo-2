<script setup lang="ts">
import { RouterLink } from 'vue-router'

type NavItem = { to: string; label: string }

const items: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/agency', label: 'Agency' },
  { to: '/customer', label: 'Customer' },
]
</script>

<template>
  <nav class="app-nav" aria-label="Primary">
    <ul>
      <li v-for="item in items" :key="item.to">
        <RouterLink :to="item.to" class="nav-link" exact-active-class="is-active">
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.app-nav ul {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-link {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  color: var(--text);
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover {
  color: var(--text-h);
  background: var(--social-bg);
}

.nav-link.is-active {
  color: var(--accent);
  background: var(--accent-bg);
}

.nav-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
