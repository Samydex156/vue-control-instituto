import { createRouter, createWebHistory } from 'vue-router';

// Importación perezosa (Lazy Loading) para optimizar
const HomeView = () => import('../views/HomeView.vue');
const DemoFeatures = () => import('../views/DemoFeatures.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/demo',
      name: 'demo',
      component: DemoFeatures
    },
    // Aquí irían tus rutas futuras como /estudiantes, /cursos
  ]
});

export default router;