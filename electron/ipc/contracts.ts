import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ContractService } from '../services/contractService';

export function registerContractHandlers(): void {
  ipcRegister('get_section_templates', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.getSectionTemplates(db));
  });

  ipcRegister('get_contracts', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.getContracts(db));
  });

  ipcRegister('get_contract', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.getContract(db, args.contract_id));
  });

  ipcRegister('get_contract_by_project', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.getContractByProject(db, args.project_id));
  });

  ipcRegister('create_contract', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ContractService.createContract(db, user, args.request || args));
  });

  ipcRegister('update_contract', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.updateContract(db, args.request || args));
  });

  ipcRegister('create_contract_revision', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ContractService.createRevision(db, user, args.contract_id, args.notes ?? null);
    });
  });

  ipcRegister('get_contract_revisions', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.getRevisions(db, args.contract_id));
  });

  
  ipcRegister('list_contract_attachments', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.listAttachments(db, args.contract_id));
  });

  ipcRegister('add_contract_attachment', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => ContractService.addAttachment(db, user, args.request || args));
  });

  ipcRegister('get_contract_attachment', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.getAttachment(db, args.id));
  });

  ipcRegister('delete_contract_attachment', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => ContractService.deleteAttachment(db, args.id));
  });
}
