import * as XLSX from 'xlsx';
import type { BulkImportPieceRow } from '../types/piece';
import { normalizeTextToStationModuleSlug } from '../constants/stationPieceModules';

export type ColumnRole =
    | 'ignore'
    | 'name'
    | 'quantity'
    | 'category'
    | 'assembly'
    | 'specs'
    | 'level'
    | 'fulfillment'
    | 'material'
    | 'dimensions'
    | 'capacity'
    | 'weight'
    | 'power'
    | 'brand';

export interface ParsedWorkbook {
    sheetNames: string[];
    getMatrix(sheetName: string): string[][];
}

export async function parseExcelFile(file: File): Promise<ParsedWorkbook> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    return {
        sheetNames: wb.SheetNames,
        getMatrix(sheetName: string) {
            const sheet = wb.Sheets[sheetName];
            if (!sheet) return [];
            const m = XLSX.utils.sheet_to_json<string[]>(sheet, {
                header: 1,
                defval: '',
                raw: false,
            }) as string[][];
            return m.map((row) => row.map((c) => (c == null ? '' : String(c)).trim()));
        },
    };
}

function cell(row: string[], col: number | undefined): string {
    if (col === undefined || col < 0) return '';
    return row[col] ?? '';
}

function parseQty(s: string): number {
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : 1;
}

function parseLevel(s: string): number {
    const n = parseInt(String(s).trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeFulfillmentCell(s: string): string | undefined {
    const x = s.trim().toLowerCase();
    if (!x) return undefined;
    if (/fabric|prod|lucr|montaj.?hal/i.test(x)) return 'fabricare';
    if (/cump|achiz|furniz|livrat.?direct/i.test(x)) return 'cumparare';
    if (/nedecis|n\/a|—|-/i.test(x)) return 'nedecis';
    return undefined;
}


export function guessColumnRoles(headers: string[]): ColumnRole[] {
    return headers.map((h) => {
        const x = h.toLowerCase();
        if (/^nume|denumire|name|description|part|component|reper/i.test(x)) return 'name';
        if (/cant|qty|quantity|buc|nr/i.test(x)) return 'quantity';
        if (/execuție|executie|fabricare|achizi|tip.?exec|fulfillment|sursa/i.test(x)) return 'fulfillment';
        if (/categ|tip|type/i.test(x)) return 'category';
        if (/ansamblu|assembly|grup|modul|sect/i.test(x)) return 'assembly';
        if (/spec|obs|note|detali/i.test(x)) return 'specs';
        if (/nivel|level|indent/i.test(x)) return 'level';
        if (/material|mat\.|substanță|aliaj|metal|otel|inox|aluminiu/i.test(x)) return 'material';
        if (/dimens|dim\.|lung|lăț|înălț|înălțime|grosime|diametru|ø|lungime|width|height|thickness|diameter/i.test(x)) return 'dimensions';
        if (/capacit|cap\.|volum|vol\.|m3|mc|litri|tone|t|kg/i.test(x)) return 'capacity';
        if (/greut|weight|masa|kg|t/i.test(x)) return 'weight';
        if (/putere|power|kw|w|hp|cp/i.test(x)) return 'power';
        if (/brand|marcă|producător|manufacturer/i.test(x)) return 'brand';
        return 'ignore';
    });
}

export function buildImportRows(
    matrix: string[][],
    headerRowIndex: number,
    colRoles: ColumnRole[],
): BulkImportPieceRow[] {
    if (matrix.length <= headerRowIndex) return [];

    const width = Math.max(
        ...matrix.map((r) => r.length),
        colRoles.length,
        0,
    );
    const roles = [...colRoles];
    while (roles.length < width) roles.push('ignore');

    const nameCol = roles.indexOf('name');
    if (nameCol < 0) return [];

    const qCol = roles.indexOf('quantity');
    const catCol = roles.indexOf('category');
    const asmCol = roles.indexOf('assembly');
    const specCol = roles.indexOf('specs');
    const levelCol = roles.indexOf('level');
    const fulCol = roles.indexOf('fulfillment');
    const materialCol = roles.indexOf('material');
    const dimensionsCol = roles.indexOf('dimensions');
    const capacityCol = roles.indexOf('capacity');
    const weightCol = roles.indexOf('weight');
    const powerCol = roles.indexOf('power');
    const brandCol = roles.indexOf('brand');

    const out: BulkImportPieceRow[] = [];
    const lastIndexAtLevel: number[] = [];

    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
        const row = matrix[r];
        const name = cell(row, nameCol);
        if (!name) continue;

        const quantity = qCol >= 0 ? parseQty(cell(row, qCol)) : 1;
        let category =
            catCol >= 0 && cell(row, catCol) ? cell(row, catCol) : 'structura';
        const modSlug = normalizeTextToStationModuleSlug(category);
        if (modSlug) category = modSlug;
        let assembly_key = asmCol >= 0 ? cell(row, asmCol) : '';
        if (!assembly_key.trim() && modSlug) assembly_key = modSlug;

        
        const specsObj: Record<string, any> = {};
        
        
        const existingSpecs = specCol >= 0 && cell(row, specCol) ? cell(row, specCol) : null;
        if (existingSpecs) {
            specsObj.notes = existingSpecs;
        }

        
        if (materialCol >= 0) {
            const material = cell(row, materialCol);
            if (material) specsObj.material = material;
        }
        if (dimensionsCol >= 0) {
            const dimensions = cell(row, dimensionsCol);
            if (dimensions) specsObj.dimensions = dimensions;
        }
        if (capacityCol >= 0) {
            const capacity = cell(row, capacityCol);
            if (capacity) {
                
                const numCapacity = parseFloat(capacity.replace(',', '.'));
                if (!isNaN(numCapacity)) {
                    specsObj.capacity = numCapacity;
                } else {
                    specsObj.capacity = capacity;
                }
            }
        }
        if (weightCol >= 0) {
            const weight = cell(row, weightCol);
            if (weight) {
                const numWeight = parseFloat(weight.replace(',', '.'));
                if (!isNaN(numWeight)) {
                    specsObj.weight_kg = numWeight;
                } else {
                    specsObj.weight = weight;
                }
            }
        }
        if (powerCol >= 0) {
            const power = cell(row, powerCol);
            if (power) {
                const numPower = parseFloat(power.replace(',', '.'));
                if (!isNaN(numPower)) {
                    specsObj.power_kw = numPower;
                } else {
                    specsObj.power = power;
                }
            }
        }
        if (brandCol >= 0) {
            const brand = cell(row, brandCol);
            if (brand) specsObj.brand = brand;
        }

        const specs = Object.keys(specsObj).length > 0 ? JSON.stringify(specsObj) : null;

        let level = 0;
        let parent_batch_index: number | undefined;
        if (levelCol >= 0) {
            level = parseLevel(cell(row, levelCol));
            if (level > 0) {
                const p = lastIndexAtLevel[level - 1];
                if (p !== undefined) parent_batch_index = p;
            }
        }

        const rec: BulkImportPieceRow = {
            name,
            quantity,
            category,
            assembly_key: assembly_key || '',
            specs,
        };
        if (parent_batch_index !== undefined) rec.parent_batch_index = parent_batch_index;
        if (fulCol >= 0) {
            const f = normalizeFulfillmentCell(cell(row, fulCol));
            if (f) rec.fulfillment_type = f;
        }
        out.push(rec);

        if (levelCol >= 0) {
            lastIndexAtLevel[level] = out.length - 1;
            lastIndexAtLevel.length = level + 1;
        }
    }

    return out;
}
