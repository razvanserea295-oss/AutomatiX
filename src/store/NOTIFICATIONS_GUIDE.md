# Notification System Guide

Complete guide for using the notification system in Promix Automatix.

## Overview

The notification system provides real-time alerts for production events:
- Project blockages
- Deadline warnings
- Piece completions
- Phase updates

## Components

### NotificationStore (Zustand)

Central store for managing notifications.

```typescript
import { useNotificationStore } from '@/store/notificationStore';

const { 
  notifications,      // Array of all notifications
  unreadCount,        // Number of unread notifications
  addNotification,    // Add new notification
  markAsRead,         // Mark single notification as read
  markAllAsRead,      // Mark all as read
  removeNotification, // Remove notification
  clearAll            // Clear all notifications
} = useNotificationStore();
```

### NotificationsDropdown Component

Displays notifications in header with grouping by type.

```typescript
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';

<NotificationsDropdown />
```

**Features:**
- Badge with unread count
- Grouped by type (Blocaje, Deadline-uri, Finalizări, Altele)
- Click to mark as read
- Remove individual notifications
- Mark all as read button

## Usage Examples

### Adding Notifications

#### Manual Addition

```typescript
import { useNotificationStore } from '@/store/notificationStore';

const { addNotification } = useNotificationStore();

// Add custom notification
addNotification({
  type: 'blockage',
  title: 'Proiect Blocat',
  message: 'Proiectul "Alpha" a intrat în stadiul Blocat',
  projectId: 123,
});
```

#### Using Helper Functions

```typescript
import { 
  useNotificationStore,
  createBlockageNotification,
  createDeadlineNotification,
  createCompletionNotification,
  createPhaseUpdateNotification
} from '@/store/notificationStore';

const { addNotification } = useNotificationStore();

// Blockage notification
addNotification(createBlockageNotification(123, 'Proiect Alpha'));

// Deadline notification
addNotification(createDeadlineNotification(123, 'Proiect Alpha', 12));

// Completion notification
addNotification(createCompletionNotification(456, 'Piesă Beta'));

// Phase update notification
addNotification(createPhaseUpdateNotification('Piesă Beta', 'Execuție'));
```

### Using Production Notifications Hook

```typescript
import { useProductionNotifications } from '@/hooks/useProductionNotifications';

const { 
  notifyProjectBlocked,
  notifyDeadlineApproaching,
  notifyPieceCompleted
} = useProductionNotifications();

// Notify when project is blocked
notifyProjectBlocked(123, 'Proiect Alpha');

// Notify when deadline is approaching
notifyDeadlineApproaching(123, 'Proiect Alpha', 12);

// Notify when piece is completed
notifyPieceCompleted(456, 'Piesă Beta');
```

### Auto-Notifications with Monitoring

```typescript
import { useAutoNotifications } from '@/hooks/useAutoNotifications';

const { 
  monitorProjects,
  monitorPieces,
  checkProjectBlocked,
  checkDeadlineApproaching,
  checkPieceCompleted
} = useAutoNotifications();

// Monitor projects for status changes
const projects = [
  { id: 1, name: 'Alpha', deadline: '2026-04-05', status: 'blocked' },
  { id: 2, name: 'Beta', deadline: '2026-04-06', status: 'in_production' },
];
monitorProjects(projects);

// Monitor pieces for completion
const pieces = [
  { 
    id: 1, 
    name: 'Piesă A', 
    phases: { 
      dxf: 'finalizat',
      desene: 'finalizat',
      executie: 'finalizat',
      testare: 'finalizat',
      livrat: 'finalizat',
      montat: 'finalizat',
      punere_in_functiune: 'finalizat'
    }
  }
];
monitorPieces(pieces);
```

### Real-Time Polling

```typescript
import { useProductionPolling } from '@/hooks/useAutoNotifications';

// Set up automatic polling every 30 seconds
useProductionPolling(
  async () => {
    // Fetch projects from API
    const response = await fetch('/api/projects');
    return response.json();
  },
  async () => {
    // Fetch pieces from API
    const response = await fetch('/api/pieces');
    return response.json();
  },
  30000 // Poll interval in milliseconds
);
```

## Notification Types

### Blockage
- **Type**: `'blockage'`
- **Color**: Red
- **Icon**: AlertCircle
- **Trigger**: Project status changes to 'blocked'

```typescript
{
  type: 'blockage',
  title: 'Proiect Blocat',
  message: 'Proiectul "Alpha" a intrat în stadiul Blocat',
  projectId: 123,
}
```

### Deadline
- **Type**: `'deadline'`
- **Color**: Orange
- **Icon**: Clock
- **Trigger**: Deadline < 24 hours

```typescript
{
  type: 'deadline',
  title: 'Risc Deadline',
  message: 'Proiectul "Alpha" are deadline în 12 ore',
  projectId: 123,
}
```

### Completion
- **Type**: `'completion'`
- **Color**: Green
- **Icon**: CheckCircle
- **Trigger**: Piece completed in all phases

```typescript
{
  type: 'completion',
  title: 'Piesă Finalizată',
  message: 'Piesa "Beta" a fost finalizată în toate fazele',
  pieceId: 456,
}
```

### Other
- **Type**: `'other'`
- **Color**: Blue
- **Icon**: Bell
- **Trigger**: Generic updates

```typescript
{
  type: 'other',
  title: 'Actualizare Fază',
  message: 'Piesa "Beta" a avansat la faza "Execuție"',
}
```

## Notification Data Model

```typescript
interface Notification {
  id: number;                    // Auto-generated
  type: NotificationType;        // 'blockage' | 'deadline' | 'completion' | 'other'
  title: string;                 // Notification title
  message: string;               // Notification message
  timestamp: string;             // ISO 8601 timestamp (auto-generated)
  read: boolean;                 // Read status (default: false)
  projectId?: number;            // Optional project reference
  pieceId?: number;              // Optional piece reference
}

type NotificationType = 'blockage' | 'deadline' | 'completion' | 'other';
```

## Store State

```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  removeNotification: (id: number) => void;
  clearAll: () => void;
}
```

## Features

### Automatic ID Generation
- Each notification gets a unique auto-incrementing ID
- IDs start from 1 and increment

### Timestamp Management
- Timestamps are automatically set to current time
- Formatted as ISO 8601 strings
- Displayed as relative time in UI (e.g., "5m", "2h", "3d")

### Notification Limit
- Maximum 50 notifications stored
- Oldest notifications are removed when limit is reached
- Prevents memory issues with long-running sessions

### Grouping
- Notifications grouped by type in dropdown
- Groups: Blocaje, Deadline-uri, Finalizări, Altele
- Each group shows count

### Unread Tracking
- Automatic unread count calculation
- Badge displayed in header
- Shows "9+" for counts > 9

## Best Practices

### 1. Use Helper Functions
Always use the provided helper functions for consistency:

```typescript
// ✅ Good
addNotification(createBlockageNotification(123, 'Project Name'));

// ❌ Avoid
addNotification({
  type: 'blockage',
  title: 'Proiect Blocat',
  message: 'Proiectul "Project Name" a intrat în stadiul Blocat',
  projectId: 123,
});
```

### 2. Monitor at Component Level
Use hooks to monitor data changes:

```typescript
// ✅ Good - Monitor in component
useAutoNotifications();

// ❌ Avoid - Manual checking everywhere
if (project.status === 'blocked') {
  addNotification(...);
}
```

### 3. Use Polling for Real-Time Updates
Set up polling in main layout or app component:

```typescript
// ✅ Good - Centralized polling
useProductionPolling(fetchProjects, fetchPieces, 30000);

// ❌ Avoid - Multiple polling instances
useEffect(() => { /* poll */ }, []);
useEffect(() => { /* poll */ }, []);
```

### 4. Clean Up Notifications
Remove old notifications to keep UI clean:

```typescript
// ✅ Good - Remove after user interaction
const handleNotificationClick = (id) => {
  markAsRead(id);
  // Later...
  removeNotification(id);
};

// ❌ Avoid - Let notifications pile up
// Just keep adding without removing
```

## Integration Example

Complete example of integrating notifications in a production page:

```typescript
import React, { useEffect } from 'react';
import { useAutoNotifications, useProductionPolling } from '@/hooks/useAutoNotifications';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';

export const ProductionPage: React.FC = () => {
  // Set up auto-notifications
  useAutoNotifications();

  // Set up polling
  useProductionPolling(
    async () => {
      const res = await fetch('/api/projects');
      return res.json();
    },
    async () => {
      const res = await fetch('/api/pieces');
      return res.json();
    },
    30000
  );

  return (
    <div>
      {/* NotificationsDropdown is in Header */}
      <NotificationsDropdown />
      
      {/* Rest of page */}
    </div>
  );
};
```

## Troubleshooting

### Notifications Not Appearing
1. Check that NotificationsDropdown is in Header
2. Verify addNotification is being called
3. Check browser console for errors
4. Ensure notification type is valid

### Unread Count Not Updating
1. Verify markAsRead is being called
2. Check that notification ID is correct
3. Ensure store is properly initialized

### Notifications Disappearing
1. Check notification limit (max 50)
2. Verify clearAll is not being called
3. Check for removeNotification calls

## Performance Considerations

- Notifications are stored in Zustand (in-memory)
- Maximum 50 notifications to prevent memory issues
- Polling interval should be 30+ seconds
- Use debouncing for frequent updates

## Accessibility

- Badge with unread count for screen readers
- ARIA labels on all buttons
- Keyboard navigation support
- Focus management in dropdown
- Semantic HTML structure

## Future Enhancements

- [ ] Persistent storage (localStorage/IndexedDB)
- [ ] Sound notifications
- [ ] Desktop notifications (Web Notifications API)
- [ ] Email notifications
- [ ] Notification preferences/settings
- [ ] Notification history/archive
- [ ] Notification filtering
- [ ] Notification templates
