import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';

export interface TipPiesa {
  id: number;
  slug: string;
  label: string;
}

export interface OperatieConfig {
  id: number | null;
  tip_piesa_id: number;
  nume: string;
  ordine: number;
  durata_estimata_ore: number;
  um_materiale: string;
  obligatorie: boolean;
  blocker: boolean;
}

export class TipPieseService {
  static getTipPiese(db: Database): TipPiesa[] {
    const stmt = db.prepare('SELECT id, slug, label FROM tip_piese ORDER BY id ASC');
    const out: TipPiesa[] = [];
    while (stmt.step()) {
      const r = stmt.get();
      out.push({ id: r[0] as number, slug: r[1] as string, label: r[2] as string });
    }
    stmt.free();
    return out;
  }

  static getOperatiiConfig(db: Database, tipPiesaId: number): OperatieConfig[] {
    if (!tipPiesaId) throw CommandError.badRequest('tip_piesa_id invalid');
    const stmt = db.prepare(
      `SELECT id, tip_piesa_id, nume, ordine, durata_estimata_ore, um_materiale, obligatorie, blocker
       FROM tip_piesa_operatii WHERE tip_piesa_id = ? ORDER BY ordine ASC, id ASC`
    );
    stmt.bind([tipPiesaId]);
    const out: OperatieConfig[] = [];
    while (stmt.step()) {
      const r = stmt.get();
      out.push({
        id: r[0] as number,
        tip_piesa_id: r[1] as number,
        nume: r[2] as string,
        ordine: r[3] as number,
        durata_estimata_ore: r[4] as number,
        um_materiale: r[5] as string,
        obligatorie: (r[6] as number) === 1,
        blocker: (r[7] as number) === 1,
      });
    }
    stmt.free();
    return out;
  }

  
  static saveOperatiiConfig(db: Database, tipPiesaId: number, operatii: OperatieConfig[]): OperatieConfig[] {
    if (!tipPiesaId) throw CommandError.badRequest('tip_piesa_id invalid');

    db.run('BEGIN');
    try {
      db.run('DELETE FROM tip_piesa_operatii WHERE tip_piesa_id = ?', [tipPiesaId]);
      for (const op of operatii) {
        db.run(
          `INSERT INTO tip_piesa_operatii
           (tip_piesa_id, nume, ordine, durata_estimata_ore, um_materiale, obligatorie, blocker)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tipPiesaId, op.nume, op.ordine, op.durata_estimata_ore,
           op.um_materiale, op.obligatorie ? 1 : 0, op.blocker ? 1 : 0]
        );
      }
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    return TipPieseService.getOperatiiConfig(db, tipPiesaId);
  }
}
