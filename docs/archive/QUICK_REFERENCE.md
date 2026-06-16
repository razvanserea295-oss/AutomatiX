# Quick Reference Guide

Fast lookup for common tasks in the UI redesign.

## Components

### Operational Checklist
```typescript
import { OperationalChecklist } from '@/components/production';

<OperationalChecklist
  projectId={123}
  flow={operationalFlow}
  onUpdate={(flow) => console.log(flow)}
/>
```

### Notifications Dropdown
```typescript
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';

<NotificationsDropdown />
```

### Filter Bar
```typescript
import { FilterBar } from '@/components/common/FilterBar';

<FilterBar
  onSearch={(query) => {}}
  onFilterChange={(filters) => {}}
  filters={[
    { id: 'priority', label: 'Critical', value: 'critical' },
  ]}
/>
```

## Stores

### Notification Store
```typescript
import { useNotificationStore } from '@/stores/notificationStore';

const {
  notifications,
  unreadCount,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll,
} = useNotificationStore();
```

### Add Notification
```typescript
import { 
  useNotificationStore,
  createBlockageNotification,
  createDeadlineNotification,
  createCompletionNotification,
} from '@/stores/notificationStore';

const { addNotification } = useNotificationStore();

// Blockage
addNotification(createBlockageNotification(123, 'Project Name'));

// Deadline
addNotification(createDeadlineNotification(123, 'Project Name', 12));

// Completion
addNotification(createCompletionNotification(456, 'Piece Name'));
```

## Hooks

### Production Notifications
```typescript
import { useProductionNotifications } from '@/hooks/useProductionNotifications';

const {
  notifyProjectBlocked,
  notifyDeadlineApproaching,
  notifyPieceCompleted,
} = useProductionNotifications();

notifyProjectBlocked(123, 'Project Name');
notifyDeadlineApproaching(123, 'Project Name', 12);
notifyPieceCompleted(456, 'Piece Name');
```

### Auto Notifications
```typescript
import { useAutoNotifications } from '@/hooks/useAutoNotifications';

const {
  monitorProjects,
  monitorPieces,
  checkProjectBlocked,
  checkDeadlineApproaching,
  checkPieceCompleted,
} = useAutoNotifications();

monitorProjects(projects);
monitorPieces(pieces);
```

### Production Polling
```typescript
import { useProductionPolling } from '@/hooks/useAutoNotifications';

useProductionPolling(
  async () => fetch('/api/projects').then(r => r.json()),
  async () => fetch('/api/pieces').then(r => r.json()),
  30000 // 30 seconds
);
```

### Lazy Load
```typescript
import { useLazyLoad } from '@/hooks/useLazyLoad';

const { ref, isVisible } = useLazyLoad();

return (
  <div ref={ref}>
    {isVisible && <ExpensiveComponent />}
  </div>
);
```

### In Viewport
```typescript
import { useInViewport } from '@/hooks/useLazyLoad';

const { ref, isInViewport } = useInViewport();

return (
  <div ref={ref}>
    {isInViewport && <AnimatedComponent />}
  </div>
);
```

## Utilities

### Debounce
```typescript
import { debounce, createDebouncedSearch } from '@/lib/debounce';

// Basic debounce
const debouncedFn = debounce((query) => {
  console.log(query);
}, 300);

// Debounced search
const debouncedSearch = createDebouncedSearch(
  async (query) => {
    const res = await fetch(`/api/search?q=${query}`);
    return res.json();
  },
  300
);
```

### Throttle
```typescript
import { throttle } from '@/lib/debounce';

const throttledScroll = throttle(() => {
  console.log('Scrolling');
}, 1000);

window.addEventListener('scroll', throttledScroll);
```

### Memoization
```typescript
import { memoize, memoizeAsync, deepEqual } from '@/lib/memoization';

// Memoize function
const memoizedFn = memoize((arg) => {
  return expensiveCalculation(arg);
}, 100);

// Memoize async function
const memoizedAsync = memoizeAsync(async (id) => {
  const res = await fetch(`/api/data/${id}`);
  return res.json();
}, 100);

// Deep equal
const isEqual = deepEqual(obj1, obj2);
```

## Common Patterns

### Add Notification on Project Status Change
```typescript
const { addNotification } = useNotificationStore();
const { notifyProjectBlocked } = useProductionNotifications();

useEffect(() => {
  if (project.status === 'blocked') {
    notifyProjectBlocked(project.id, project.name);
  }
}, [project.status]);
```

### Monitor Projects with Polling
```typescript
useProductionPolling(
  async () => {
    const res = await fetch('/api/projects');
    return res.json();
  },
  async () => {
    const res = await fetch('/api/pieces');
    return res.json();
  }
);
```

### Debounced Search in Component
```typescript
const [query, setQuery] = useState('');
const debouncedSearch = useCallback(
  debounce((q) => {
    // Perform search
  }, 300),
  []
);

const handleSearch = (value) => {
  setQuery(value);
  debouncedSearch(value);
};
```

### Lazy Load Chart
```typescript
const { ref, isVisible } = useLazyLoad();

return (
  <div ref={ref}>
    {isVisible ? <Chart data={data} /> : <Skeleton />}
  </div>
);
```

## Notification Types

| Type | Color | Icon | Trigger |
|------|-------|------|---------|
| blockage | Red | AlertCircle | Project blocked |
| deadline | Orange | Clock | Deadline < 24h |
| completion | Green | CheckCircle | Piece completed |
| other | Blue | Bell | Generic updates |

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Sidebar drawer, 1 column |
| Tablet | 768-1023px | Sidebar collapsed, 2 columns |
| Desktop | ≥ 1024px | Sidebar expanded, 3-6 columns |

## Color Palette

### Light Mode
- Background: `#f8fafc` (slate-50)
- Surface: `#ffffff` (white)
- Border: `#e2e8f0` (slate-200)
- Text: `#0f172a` (slate-900)
- Accent: `#0d9488` (teal-600)

### Dark Mode
- Background: `#0f172a` (slate-900)
- Surface: `#1e293b` (slate-800)
- Border: `#334155` (slate-700)
- Text: `#f1f5f9` (slate-100)
- Accent: `#2dd4bf` (teal-400)

## Spacing (8px Grid)

| Token | Value | Usage |
|-------|-------|-------|
| pm-space-1 | 8px | Small gaps |
| pm-space-2 | 16px | Medium gaps |
| pm-space-3 | 24px | Large gaps |
| pm-space-4 | 32px | Section spacing |
| pm-space-5 | 40px | Hero sections |

## File Locations

| Component | Path |
|-----------|------|
| OperationalChecklist | `src/components/production/OperationalChecklist.tsx` |
| NotificationsDropdown | `src/components/layout/NotificationsDropdown.tsx` |
| FilterBar | `src/components/common/FilterBar.tsx` |
| notificationStore | `src/stores/notificationStore.ts` |
| useProductionNotifications | `src/hooks/useProductionNotifications.ts` |
| useAutoNotifications | `src/hooks/useAutoNotifications.ts` |
| useLazyLoad | `src/hooks/useLazyLoad.ts` |
| debounce | `src/lib/debounce.ts` |
| memoization | `src/lib/memoization.ts` |

## Documentation

| Document | Path |
|----------|------|
| Production Components | `src/components/production/README.md` |
| Notifications Guide | `src/stores/NOTIFICATIONS_GUIDE.md` |
| Implementation Progress | `IMPLEMENTATION_PROGRESS.md` |
| Implementation Summary | `IMPLEMENTATION_SUMMARY.md` |
| Quick Reference | `QUICK_REFERENCE.md` |

## Troubleshooting

### Notifications Not Showing
1. Check NotificationsDropdown is in Header
2. Verify addNotification is called
3. Check browser console for errors

### Debounce Not Working
1. Verify debounce delay is set (default 300ms)
2. Check function is called multiple times
3. Ensure cleanup on unmount

### Lazy Load Not Triggering
1. Check element is in viewport
2. Verify Intersection Observer is supported
3. Check threshold value (default 0.1)

### Performance Issues
1. Check notification count (max 50)
2. Verify polling interval (30+ seconds)
3. Use memoization for expensive computations

## Tips & Tricks

### Combine Debounce + Memoization
```typescript
const memoizedSearch = memoize(async (query) => {
  const res = await fetch(`/api/search?q=${query}`);
  return res.json();
});

const debouncedSearch = debounce(memoizedSearch, 300);
```

### Monitor Multiple Data Sources
```typescript
const { monitorProjects, monitorPieces } = useAutoNotifications();

useEffect(() => {
  monitorProjects(projects);
  monitorPieces(pieces);
}, [projects, pieces]);
```

### Lazy Load with Fallback
```typescript
const { ref, isVisible } = useLazyLoad();

return (
  <div ref={ref}>
    {isVisible ? (
      <ExpensiveComponent />
    ) : (
      <Skeleton />
    )}
  </div>
);
```

---

**Last Updated**: April 5, 2026  
**Version**: 1.0  
**Status**: Production Ready
