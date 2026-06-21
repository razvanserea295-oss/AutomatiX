# Shared Storage Pool - Deployment Summary

## Feature Overview
Added a global shared file storage pool accessible to all authenticated users.

## Files Changed/Added

### Backend (Server)
- `electron/services/sharedStorageService.ts` - New service for file operations
- `server/sharedStorageApi.ts` - New REST API endpoints
- `migrations/112_shared_storage_pool.sql` - Database schema

### Frontend
- `src/pages/shared-storage/SharedStoragePage.tsx` - New page component
- `src/lib/sharedStorage.ts` - Updated with file methods
- `src/pages/workspace/InstrumenteWorkspace.tsx` - Added "Shared Files" tab

### Configuration
- `deploy-shared-storage.sh` - Deployment script

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/shared-files | List all files |
| GET | /api/shared-files/:id | Get file metadata |
| POST | /api/shared-files | Upload file (small files inline) |
| POST | /api/shared-files/upload | Upload file (large files to disk) |
| GET | /api/shared-files/:id/download | Download file |
| DELETE | /api/shared-files/:id | Delete file |

## How to Deploy

```bash
# On your production server:
cd /opt/promix
git pull origin main
npm ci
npm run build:prod
sudo systemctl restart promix
```

## Database Migration
The migration runs automatically on server startup. It creates the `shared_storage_pool` table.

## Access
- **URL**: https://automatix.online → Instrumente workspace → Shared Files tab
- **Permission**: All authenticated users (global access)
- **Storage**: 
  - Files < 5MB: Stored inline in database
  - Files > 5MB: Stored on disk in `data/shared-files/`

## Testing
1. Log in to automatix.online
2. Navigate to "Instrumente" workspace
3. Click "Shared Files" tab
4. Upload a test file
5. Verify download works

## Rollback Plan
If issues occur:
```bash
cd /opt/promix
# Restore database backup
cp data/promix.db.backup.TIMESTAMP data/promix.db
sudo systemctl restart promix
```