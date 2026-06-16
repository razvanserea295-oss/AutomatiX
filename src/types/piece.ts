export interface ProjectCustomStage {
    id: number;
    project_id: number;
    name: string;
    order_index: number;
    description: string | null;
    status: string;
    created_at: string;
}

export type TrackingPhase = 'neinceput' | 'in_lucru' | 'finalizat';

export interface ProductionTracking {
    proiectare: TrackingPhase;
    achizitie_materiale: TrackingPhase;
    debitare: TrackingPhase;
    sudare: TrackingPhase;
    prelucrare_mecanica: TrackingPhase;
    vopsire: TrackingPhase;
    asamblare: TrackingPhase;
    dxf: TrackingPhase;
    desene: TrackingPhase;
    executie: TrackingPhase;
    testare: TrackingPhase;
    livrat: TrackingPhase;
    montat: TrackingPhase;
    punere_functiune: TrackingPhase;
}

export interface ProjectPiece {
    id: number;
    project_id: number;
    stage_id: number;
    stage_name: string | null;
    name: string;
    original_name: string | null;
    category: string;
    specs: string | null;
    quantity: number;
    status: string;
    parent_piece_id: number | null;
    sort_order: number;
    assembly_key: string;
    production_tracking: string;
    hall_notes: string | null;
    fulfillment_type: string;
    fulfillment_status: string;
    source_file_name: string | null;
    source_file_path: string | null;
    created_at: string;
    updated_at: string;
}

export function parseProductionTracking(json: string): ProductionTracking {
    try {
        const o = JSON.parse(json) as Record<string, string>;
        return {
            proiectare: (o.proiectare || 'neinceput') as TrackingPhase,
            achizitie_materiale: (o.achizitie_materiale || 'neinceput') as TrackingPhase,
            debitare: (o.debitare || 'neinceput') as TrackingPhase,
            sudare: (o.sudare || 'neinceput') as TrackingPhase,
            prelucrare_mecanica: (o.prelucrare_mecanica || 'neinceput') as TrackingPhase,
            vopsire: (o.vopsire || 'neinceput') as TrackingPhase,
            asamblare: (o.asamblare || 'neinceput') as TrackingPhase,
            dxf: (o.dxf || 'neinceput') as TrackingPhase,
            desene: (o.desene || 'neinceput') as TrackingPhase,
            executie: (o.executie || 'neinceput') as TrackingPhase,
            testare: (o.testare || 'neinceput') as TrackingPhase,
            livrat: (o.livrat || 'neinceput') as TrackingPhase,
            montat: (o.montat || 'neinceput') as TrackingPhase,
            punere_functiune: (o.punere_functiune || 'neinceput') as TrackingPhase,
        };
    } catch {
        return {
            proiectare: 'neinceput',
            achizitie_materiale: 'neinceput',
            debitare: 'neinceput',
            sudare: 'neinceput',
            prelucrare_mecanica: 'neinceput',
            vopsire: 'neinceput',
            asamblare: 'neinceput',
            dxf: 'neinceput',
            desene: 'neinceput',
            executie: 'neinceput',
            testare: 'neinceput',
            livrat: 'neinceput',
            montat: 'neinceput',
            punere_functiune: 'neinceput',
        };
    }
}

export function stringifyProductionTracking(t: ProductionTracking): string {
    return JSON.stringify({
        proiectare: t.proiectare,
        achizitie_materiale: t.achizitie_materiale,
        debitare: t.debitare,
        sudare: t.sudare,
        prelucrare_mecanica: t.prelucrare_mecanica,
        vopsire: t.vopsire,
        asamblare: t.asamblare,
        dxf: t.dxf,
        desene: t.desene,
        executie: t.executie,
        testare: t.testare,
        livrat: t.livrat,
        montat: t.montat,
        punere_functiune: t.punere_functiune,
    });
}

export interface PieceMaterialRequirement {
    id: number;
    project_piece_id: number;
    material_id: number;
    material_name: string | null;
    material_code: string | null;
    quantity_plan: number;
    notes: string | null;
    created_at: string;
}

export interface CreatePieceMaterialRequirementRequest {
    project_piece_id: number;
    material_id: number;
    quantity_plan: number;
    notes?: string | null;
}

export interface CreateProjectCustomStageRequest {
    project_id: number;
    name: string;
    order_index: number;
    description?: string | null;
}

export interface UpdateProjectCustomStageRequest {
    id: number;
    name?: string | null;
    order_index?: number | null;
    description?: string | null;
    status?: string | null;
}

export interface CreateProjectPieceRequest {
    project_id: number;
    stage_id: number;
    name: string;
    category: string;
    specs?: string | null;
    quantity: number;
    parent_piece_id?: number | null;
    sort_order?: number | null;
    assembly_key?: string | null;
    production_tracking?: string | null;
    hall_notes?: string | null;
    fulfillment_type?: string | null;
    fulfillment_status?: string | null;
}

export interface UpdateProjectPieceRequest {
    id: number;
    stage_id?: number | null;
    name?: string | null;
    category?: string | null;
    specs?: string | null;
    quantity?: number | null;
    status?: string | null;
    parent_piece_id?: number | null;
    sort_order?: number | null;
    assembly_key?: string | null;
    production_tracking?: string | null;
    hall_notes?: string | null;
    fulfillment_type?: string | null;
    fulfillment_status?: string | null;
}


export interface BulkImportPieceRow {
    name: string;
    quantity: number;
    category: string;
    assembly_key?: string;
    specs?: string | null;
    parent_batch_index?: number | null;
    production_tracking?: string | null;
    fulfillment_type?: string | null;
}

export interface BulkImportProjectPiecesRequest {
    project_id: number;
    stage_id?: number | null;
    create_default_stage?: boolean;
    rows: BulkImportPieceRow[];
}

