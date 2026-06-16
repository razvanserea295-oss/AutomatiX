import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber } from '../middleware/validate';
import { roleHasAny } from '../db/permissions';
import { logAuditEvent } from '../db/auditLogs';
import type { UserWithRole } from './authService';

export interface RecipeItem {
  id: number;
  menu_item_id: number;
  material_id: number | null;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  line_cost: number;
}

export interface RecipeOverviewRow {
  menu_item_id: number;
  code: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  ingredient_count: number;
  cost: number;
  margin: number;
  food_cost_pct: number;
}

export interface AddRecipeItemRequest {
  menu_item_id: number;
  material_id?: number | null;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  unit_cost?: number | null;
}
export interface UpdateRecipeItemRequest extends Partial<AddRecipeItemRequest> { id: number }

const RCOLS = 'id, menu_item_id, material_id, name, quantity, unit, unit_cost, line_cost';

function canManage(db: Database, roleId: number): boolean {
  return roleHasAny(db, roleId, ['all', 'manage_menu', 'manage_recipes', 'manage_costs']);
}
function audit(db: Database, userId: number, action: string, id: number | null): void {
  try { logAuditEvent(db, userId, action, 'recipe_item', id); } catch { /* never break main flow */ }
}
function mapItem(r: Record<string, unknown>): RecipeItem {
  return {
    id: r.id as number,
    menu_item_id: r.menu_item_id as number,
    material_id: (r.material_id as number | null) ?? null,
    name: r.name as string,
    quantity: (r.quantity as number) || 0,
    unit: (r.unit as string) || 'buc',
    unit_cost: (r.unit_cost as number) || 0,
    line_cost: (r.line_cost as number) || 0,
  };
}

export class RecipeService {
  static getRecipe(db: Database, menuItemId: number): RecipeItem[] {
    const stmt = db.prepare(`SELECT ${RCOLS} FROM recipe_items WHERE menu_item_id = ? ORDER BY id`);
    stmt.bind([menuItemId]);
    const out: RecipeItem[] = [];
    while (stmt.step()) out.push(mapItem(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static getOverview(db: Database): RecipeOverviewRow[] {
    const stmt = db.prepare(`
      SELECT mi.id AS menu_item_id, mi.code, mi.name, mi.category, mi.price, mi.currency,
             COUNT(ri.id) AS ingredient_count,
             COALESCE(SUM(ri.line_cost), 0) AS cost
        FROM menu_items mi
        LEFT JOIN recipe_items ri ON ri.menu_item_id = mi.id
       GROUP BY mi.id
       ORDER BY mi.category, mi.name`);
    const out: RecipeOverviewRow[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      const price = (r.price as number) || 0;
      const cost = (r.cost as number) || 0;
      out.push({
        menu_item_id: r.menu_item_id as number,
        code: r.code as string,
        name: r.name as string,
        category: (r.category as string) || 'Burgeri',
        price,
        currency: (r.currency as string) || 'RON',
        ingredient_count: (r.ingredient_count as number) || 0,
        cost,
        margin: price - cost,
        food_cost_pct: price > 0 ? Math.round((cost / price) * 100) : 0,
      });
    }
    stmt.free();
    return out;
  }

  private static recompute(req: { quantity?: number | null; unit_cost?: number | null }): { qty: number; unit: number; line: number } {
    const qty = validateNumber(req.quantity, 'quantity', { min: 0, max: 1e6 }) ?? 0;
    const unit = validateNumber(req.unit_cost, 'unit_cost', { min: 0, max: 1e6 }) ?? 0;
    return { qty, unit, line: qty * unit };
  }

  static addItem(db: Database, user: UserWithRole, req: AddRecipeItemRequest): RecipeItem[] {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const menuItemId = validateNumber(req.menu_item_id, 'menu_item_id', { min: 1, max: 1e12 });
    if (!menuItemId) throw CommandError.badRequest('Produs lipsă');
    const name = capStr(req.name, 200, 'name', { required: true })!;
    const unit = capStr(req.unit, 20, 'unit') || 'buc';
    const materialId = req.material_id != null ? (validateNumber(req.material_id, 'material_id', { min: 1, max: 1e12 }) ?? null) : null;
    const { qty, unit: unitCost, line } = this.recompute(req);
    db.run(
      `INSERT INTO recipe_items (menu_item_id, material_id, name, quantity, unit, unit_cost, line_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [menuItemId, materialId, name, qty, unit, unitCost, line],
    );
    audit(db, user.id, 'CREATE', menuItemId);
    return this.getRecipe(db, menuItemId);
  }

  static updateItem(db: Database, user: UserWithRole, req: UpdateRecipeItemRequest): RecipeItem[] {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const id = validateNumber(req.id, 'id', { min: 1, max: 1e12 });
    if (!id) throw CommandError.badRequest('id invalid');
    const cur = db.prepare(`SELECT ${RCOLS} FROM recipe_items WHERE id = ?`);
    cur.bind([id]);
    if (!cur.step()) { cur.free(); throw CommandError.notFound('Ingredient negăsit'); }
    const row = mapItem(cur.getAsObject());
    cur.free();
    const name = req.name != null ? capStr(req.name, 200, 'name', { required: true })! : row.name;
    const unit = req.unit != null ? (capStr(req.unit, 20, 'unit') || row.unit) : row.unit;
    const qty = req.quantity != null ? (validateNumber(req.quantity, 'quantity', { min: 0, max: 1e6 }) ?? row.quantity) : row.quantity;
    const unitCost = req.unit_cost != null ? (validateNumber(req.unit_cost, 'unit_cost', { min: 0, max: 1e6 }) ?? row.unit_cost) : row.unit_cost;
    db.run(
      `UPDATE recipe_items SET name=?, quantity=?, unit=?, unit_cost=?, line_cost=?, updated_at=datetime('now') WHERE id=?`,
      [name, qty, unit, unitCost, qty * unitCost, id],
    );
    audit(db, user.id, 'UPDATE', row.menu_item_id);
    return this.getRecipe(db, row.menu_item_id);
  }

  static deleteItem(db: Database, user: UserWithRole, id: number): { menu_item_id: number; items: RecipeItem[] } {
    if (!canManage(db, user.role_id)) throw CommandError.forbidden('Acces refuzat');
    const cur = db.prepare('SELECT menu_item_id FROM recipe_items WHERE id = ?');
    cur.bind([id]);
    if (!cur.step()) { cur.free(); throw CommandError.notFound('Ingredient negăsit'); }
    const menuItemId = cur.getAsObject().menu_item_id as number;
    cur.free();
    db.run('DELETE FROM recipe_items WHERE id = ?', [id]);
    audit(db, user.id, 'DELETE', menuItemId);
    return { menu_item_id: menuItemId, items: this.getRecipe(db, menuItemId) };
  }
}
