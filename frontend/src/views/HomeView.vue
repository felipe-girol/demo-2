<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section aria-labelledby="home-h">
    <h1 id="home-h">Welcome to AstroBookings</h1>
    <p>
      Book seats on upcoming rocket launches. Choose an area to get started.
    </p>
    <div class="home-links">
      <RouterLink to="/agency" class="home-card">
        <h2>Agency</h2>
        <p>Manage rockets and schedule launches.</p>
      </RouterLink>
      <RouterLink to="/customer" class="home-card">
        <h2>Customer</h2>
        <p>Browse launches and book your seats.</p>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.home-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.home-card {
  flex: 1 1 240px;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

.home-card:hover {
  box-shadow: var(--shadow);
}

.home-card h2 {
  margin-bottom: 0.25rem;
}

.home-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
