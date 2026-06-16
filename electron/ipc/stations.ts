import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { StationService, type CreateStationRequest, type CreateInterventionRequest } from '../services/stationService';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type UpdateStationArgs = Parameters<typeof StationService.updateStation>[1];
type CreateMaintenancePlanArgs = Parameters<typeof StationService.createMaintenancePlan>[1];
type CreatePartsRequestArgs = Parameters<typeof StationService.createPartsRequest>[1];
type CreateChangeRequestArgs = Parameters<typeof StationService.createChangeRequest>[1];

export function registerStationHandlers(): void {
  ipcRegister<Authed>('get_all_stations', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getAllStations(db));
  });

  ipcRegister<Authed & { id: number }>('get_station_by_id', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getStationById(db, args.id));
  });

  ipcRegister<Cmd<CreateStationRequest>>('create_station', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => StationService.createStation(db, payload(args), user));
  });

  ipcRegister<Cmd<UpdateStationArgs>>('update_station', async (args) => {
    const req = payload(args);
    requirePositiveId(req?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => StationService.updateStation(db, req, user));
  });

  ipcRegister<Authed & { id: number }>('delete_station', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, user) => { StationService.deleteStation(db, args.id, user); return { success: true }; });
  });

  ipcRegister<Authed & { station_id: number }>('get_station_interventions', async (args) => {
    requirePositiveId(args?.station_id, 'station_id');
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getStationInterventions(db, args.station_id));
  });

  ipcRegister<Authed>('get_all_interventions', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getAllInterventions(db));
  });

  ipcRegister<Cmd<CreateInterventionRequest>>('create_intervention', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => StationService.createIntervention(db, payload(args), user));
  });

  ipcRegister<Authed & { station_id: number }>('get_station_maintenance_plans', async (args) => {
    requirePositiveId(args?.station_id, 'station_id');
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getStationMaintenancePlans(db, args.station_id));
  });

  ipcRegister<Authed>('get_all_maintenance_plans', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getAllMaintenancePlans(db));
  });

  ipcRegister<Authed & { station_id: number }>('get_station_parts', async (args) => {
    requirePositiveId(args?.station_id, 'station_id');
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getStationParts(db, args.station_id));
  });

  ipcRegister<Authed>('get_all_parts', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getAllParts(db));
  });

  ipcRegister<Authed & { station_id: number }>('get_station_activity', async (args) => {
    requirePositiveId(args?.station_id, 'station_id');
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getStationActivity(db, args.station_id));
  });

  ipcRegister<Authed & { station_id: number }>('get_station_change_requests', async (args) => {
    requirePositiveId(args?.station_id, 'station_id');
    return withAuthenticatedUser(args.token, (db, _user) => StationService.getStationChangeRequests(db, args.station_id));
  });

  ipcRegister<Cmd<CreateMaintenancePlanArgs>>('create_station_maintenance_plan', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.createMaintenancePlan(db, payload(args)));
  });

  ipcRegister<Authed & { id: number }>('delete_station_maintenance_plan', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, _user) => { StationService.deleteMaintenancePlan(db, args.id); return { success: true }; });
  });

  ipcRegister<Cmd<CreatePartsRequestArgs>>('create_station_parts_request', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.createPartsRequest(db, payload(args)));
  });

  ipcRegister<Authed & { id: number }>('delete_station_parts_request', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, _user) => { StationService.deletePartsRequest(db, args.id); return { success: true }; });
  });

  ipcRegister<Cmd<CreateChangeRequestArgs>>('create_station_change_request', async (args) => {
    return withAuthenticatedUser(args.token, (db, _user) => StationService.createChangeRequest(db, payload(args)));
  });

  ipcRegister<Authed & { id: number }>('delete_station_change_request', async (args) => {
    requirePositiveId(args?.id, 'id');
    return withAuthenticatedUser(args.token, (db, _user) => { StationService.deleteChangeRequest(db, args.id); return { success: true }; });
  });
}
