import { createRouter, createWebHistory } from 'vue-router';
import { getAccessToken } from '@/utils/auth-token';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'record',
          name: 'record',
          component: () => import('@/views/RecordView.vue'),
        },
        {
          path: 'trends',
          name: 'trends',
          component: () => import('@/views/TrendsView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
        },
        {
          path: 'body',
          redirect: '/body/history',
        },
        {
          path: 'body/create',
          name: 'body-create',
          component: () => import('@/views/body/BodyFormView.vue'),
        },
        {
          path: 'body/history',
          name: 'body-history',
          component: () => import('@/views/body/BodyHistoryView.vue'),
        },
        {
          path: 'body/:id/edit',
          name: 'body-edit',
          component: () => import('@/views/body/BodyFormView.vue'),
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const hasToken = Boolean(getAccessToken());
  if (to.meta.requiresAuth && !hasToken) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && hasToken) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
