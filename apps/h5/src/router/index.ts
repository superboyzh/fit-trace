import { createRouter, createWebHistory } from 'vue-router';
import { getAccessToken } from '@/utils/auth-token';

/** 记住每页离开时的滚动位置，切回同级 tab 时回到原处 */
const scrollPositions = new Map<string, number>();

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) return savedPosition;
    const cached = scrollPositions.get(to.fullPath);
    return cached === undefined ? { top: 0 } : { top: cached };
  },
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
          meta: { tabBar: true },
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
          meta: { tabBar: true },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: { tabBar: true },
        },
        {
          path: 'archive',
          name: 'archive',
          component: () => import('@/views/ArchiveView.vue'),
          meta: { tabBar: true },
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
          path: 'body/:id',
          name: 'body-detail',
          component: () => import('@/views/body/BodyDetailView.vue'),
        },
        {
          path: 'body/:id/edit',
          name: 'body-edit',
          component: () => import('@/views/body/BodyFormView.vue'),
        },
        {
          path: 'meals',
          name: 'meals',
          component: () => import('@/views/meals/MealListView.vue'),
        },
        {
          path: 'meals/create',
          name: 'meal-create',
          component: () => import('@/views/meals/MealFormView.vue'),
        },
        {
          path: 'meals/:id',
          name: 'meal-detail',
          component: () => import('@/views/meals/MealDetailView.vue'),
        },
        {
          path: 'meals/:id/edit',
          name: 'meal-edit',
          component: () => import('@/views/meals/MealFormView.vue'),
        },
        {
          path: 'workouts',
          name: 'workouts',
          component: () => import('@/views/workouts/WorkoutListView.vue'),
        },
        {
          path: 'workouts/create',
          name: 'workout-create',
          component: () => import('@/views/workouts/WorkoutFormView.vue'),
        },
        {
          path: 'workouts/:id',
          name: 'workout-detail',
          component: () => import('@/views/workouts/WorkoutDetailView.vue'),
        },
        {
          path: 'workouts/:id/edit',
          name: 'workout-edit',
          component: () => import('@/views/workouts/WorkoutFormView.vue'),
        },
        {
          path: 'photos',
          name: 'photos',
          component: () => import('@/views/photos/PhotoArchiveView.vue'),
        },
        {
          path: 'photos/:id',
          name: 'photo-detail',
          component: () => import('@/views/photos/PhotoDetailView.vue'),
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const current = router.currentRoute.value;
  if (current.fullPath && current.fullPath !== to.fullPath) {
    scrollPositions.set(current.fullPath, window.scrollY);
  }
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
