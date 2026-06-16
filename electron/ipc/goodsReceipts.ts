import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { GoodsReceiptService } from '../services/goodsReceiptService';

export function registerGoodsReceiptHandlers(): void {
  ipcRegister('list_goods_receipts', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      GoodsReceiptService.list(db, user, args?.status),
    ),
  );

  ipcRegister('get_goods_receipt', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      GoodsReceiptService.get(db, user, args.id),
    ),
  );

  ipcRegister('create_goods_receipt', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) =>
      GoodsReceiptService.create(db, user, args.request || args),
    ),
  );

  ipcRegister('delete_goods_receipt', async (args: any) =>
    withAuthenticatedUser(args?.token, (db, user) => {
      GoodsReceiptService.delete(db, user, args.id);
      return { ok: true };
    }),
  );
}
