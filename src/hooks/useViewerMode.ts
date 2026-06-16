import { useAuthStore } from '@/store/authStore';
import { isViewerOnly, type AppPage } from '@/lib/access';

export function useViewerMode(page: AppPage): boolean {
  const user = useAuthStore((s) => s.user);
  return isViewerOnly(user?.role_name, page, user?.custom_pages);
}
