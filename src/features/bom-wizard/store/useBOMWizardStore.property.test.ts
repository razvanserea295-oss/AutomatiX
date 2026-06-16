

















import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBOMWizardStore } from './useBOMWizardStore';
import type {
  UploadedFileData,
  FileData,
  HierarchyNode,
  NewProjectData,
} from '../types';
import { SystemField } from '../types';






function readPersistedState(): Record<string, unknown> {
  const raw = localStorage.getItem('bom-wizard-storage');
  if (!raw) return {};
  const parsed = JSON.parse(raw) as { state: Record<string, unknown> };
  return parsed.state ?? {};
}


function writePersistedState(state: Record<string, unknown>): void {
  const payload = { state, version: 0 };
  localStorage.setItem('bom-wizard-storage', JSON.stringify(payload));
  
  useBOMWizardStore.persist.rehydrate();
}





type Step = 0 | 1 | 2 | 3;
const ALL_STEPS: Step[] = [0, 1, 2, 3];

function makeUploadedFile(variant: 'xlsx' | 'csv' | 'multi-sheet'): UploadedFileData {
  if (variant === 'xlsx') {
    return {
      name: 'bom.xlsx',
      size: 204800,
      path: '/uploads/bom.xlsx',
      sheets: ['Sheet1'],
      selectedSheet: 'Sheet1',
    };
  }
  if (variant === 'csv') {
    return {
      name: 'bom.csv',
      size: 1024,
      path: '/uploads/bom.csv',
      sheets: ['default'],
      selectedSheet: 'default',
    };
  }
  
  return {
    name: 'complex.xlsx',
    size: 512000,
    path: '/uploads/complex.xlsx',
    sheets: ['BOM', 'Summary', 'Metadata'],
    selectedSheet: 'BOM',
  };
}

function makeFileData(variant: 'small' | 'large' | 'unicode'): FileData {
  if (variant === 'small') {
    return {
      headers: ['Part Number', 'Description', 'Quantity'],
      rows: [
        { 'Part Number': 'P001', Description: 'Part 1', Quantity: '10' },
        { 'Part Number': 'P002', Description: 'Part 2', Quantity: '5' },
      ],
    };
  }
  if (variant === 'large') {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      'Part Number': `P${String(i).padStart(3, '0')}`,
      Description: `Part ${i}`,
      Quantity: String(i + 1),
      Material: i % 2 === 0 ? 'Steel' : 'Aluminum',
    }));
    return {
      headers: ['Part Number', 'Description', 'Quantity', 'Material'],
      rows,
    };
  }
  
  return {
    headers: ['Număr piesă', 'Denumire', 'Cantitate', 'Material'],
    rows: [
      { 'Număr piesă': 'P001', Denumire: 'Piesă 1', Cantitate: '3', Material: 'Oțel' },
    ],
  };
}

function makeColumnMappings(
  variant: 'full' | 'partial' | 'empty'
): Record<SystemField, string> {
  if (variant === 'full') {
    return {
      [SystemField.COD_PIESA]: 'Part Number',
      [SystemField.NUME_PIESA]: 'Description',
      [SystemField.CANTITATE]: 'Quantity',
      [SystemField.MATERIAL]: 'Material',
      [SystemField.MASA]: 'Mass',
      [SystemField.NIVEL]: 'Level',
      [SystemField.TIP_PIESA]: 'Part Type',
      [SystemField.TRATAMENT]: 'Finish',
    } as Record<SystemField, string>;
  }
  if (variant === 'partial') {
    return {
      [SystemField.COD_PIESA]: 'Part Number',
      [SystemField.NUME_PIESA]: 'Description',
      [SystemField.CANTITATE]: 'Quantity',
    } as Record<SystemField, string>;
  }
  return {} as Record<SystemField, string>;
}

function makeHierarchy(variant: 'flat' | 'nested' | 'empty'): HierarchyNode[] {
  if (variant === 'empty') return [];

  const root: HierarchyNode = {
    id: 'node-0',
    type: 'assembly',
    level: 0,
    code: 'STATION-001',
    name: 'Concrete Station',
    quantity: 1,
    material: undefined,
    mass: undefined,
    partType: undefined,
    treatment: undefined,
    children: [],
    validation: { status: 'ok', messages: [] },
  };

  if (variant === 'flat') return [root];

  
  const sub: HierarchyNode = {
    id: 'node-1',
    type: 'sub_assembly',
    level: 1,
    code: 'SUB-001',
    name: 'Chassis',
    quantity: 1,
    children: [],
    validation: { status: 'ok', messages: [] },
  };
  const part: HierarchyNode = {
    id: 'node-2',
    type: 'part',
    level: 2,
    code: 'P001',
    name: 'Bolt M8',
    quantity: 12,
    material: 'Steel',
    mass: 0.05,
    partType: 'purchased',
    treatment: 'Zinc plated',
    children: [],
    validation: { status: 'ok', messages: [] },
  };
  sub.children = [part];
  root.children = [sub];
  return [root];
}

function makeNewProjectData(
  variant: 'full' | 'minimal'
): NewProjectData {
  if (variant === 'full') {
    return { name: 'Station Alpha', client: 'ACME Corp', deadline: '2025-12-31' };
  }
  return { name: 'Station Beta', client: '', deadline: '' };
}





interface WizardStateCase {
  label: string;
  currentStep: Step;
  uploadedFile: UploadedFileData | null;
  fileData: FileData | null;
  columnMappings: Record<SystemField, string>;
  hierarchy: HierarchyNode[];
  selectedProjectId: number | null;
  newProjectData: NewProjectData | null;
}

const STATE_CASES: WizardStateCase[] = [
  
  {
    label: 'step 0 – all null / empty',
    currentStep: 0,
    uploadedFile: null,
    fileData: null,
    columnMappings: makeColumnMappings('empty'),
    hierarchy: makeHierarchy('empty'),
    selectedProjectId: null,
    newProjectData: null,
  },
  
  {
    label: 'step 1 – xlsx file uploaded, no mappings',
    currentStep: 1,
    uploadedFile: makeUploadedFile('xlsx'),
    fileData: makeFileData('small'),
    columnMappings: makeColumnMappings('empty'),
    hierarchy: makeHierarchy('empty'),
    selectedProjectId: null,
    newProjectData: null,
  },
  
  {
    label: 'step 1 – csv file with unicode headers',
    currentStep: 1,
    uploadedFile: makeUploadedFile('csv'),
    fileData: makeFileData('unicode'),
    columnMappings: makeColumnMappings('empty'),
    hierarchy: makeHierarchy('empty'),
    selectedProjectId: null,
    newProjectData: null,
  },
  
  {
    label: 'step 2 – partial column mappings',
    currentStep: 2,
    uploadedFile: makeUploadedFile('xlsx'),
    fileData: makeFileData('small'),
    columnMappings: makeColumnMappings('partial'),
    hierarchy: makeHierarchy('empty'),
    selectedProjectId: null,
    newProjectData: null,
  },
  
  {
    label: 'step 2 – full mappings, flat hierarchy',
    currentStep: 2,
    uploadedFile: makeUploadedFile('multi-sheet'),
    fileData: makeFileData('large'),
    columnMappings: makeColumnMappings('full'),
    hierarchy: makeHierarchy('flat'),
    selectedProjectId: null,
    newProjectData: null,
  },
  
  {
    label: 'step 3 – nested hierarchy, existing project',
    currentStep: 3,
    uploadedFile: makeUploadedFile('xlsx'),
    fileData: makeFileData('small'),
    columnMappings: makeColumnMappings('full'),
    hierarchy: makeHierarchy('nested'),
    selectedProjectId: 42,
    newProjectData: null,
  },
  
  {
    label: 'step 3 – nested hierarchy, new project data',
    currentStep: 3,
    uploadedFile: makeUploadedFile('xlsx'),
    fileData: makeFileData('small'),
    columnMappings: makeColumnMappings('full'),
    hierarchy: makeHierarchy('nested'),
    selectedProjectId: null,
    newProjectData: makeNewProjectData('full'),
  },
  
  {
    label: 'step 3 – minimal new project data',
    currentStep: 3,
    uploadedFile: makeUploadedFile('csv'),
    fileData: makeFileData('unicode'),
    columnMappings: makeColumnMappings('partial'),
    hierarchy: makeHierarchy('flat'),
    selectedProjectId: null,
    newProjectData: makeNewProjectData('minimal'),
  },
  
  ...ALL_STEPS.map((step) => ({
    label: `step ${step} – uploadedFile null, fileData null`,
    currentStep: step,
    uploadedFile: null,
    fileData: null,
    columnMappings: makeColumnMappings('partial'),
    hierarchy: makeHierarchy('flat'),
    selectedProjectId: step === 3 ? 7 : null,
    newProjectData: null,
  })),
  
  {
    label: 'step 2 – large fileData (50 rows)',
    currentStep: 2,
    uploadedFile: makeUploadedFile('xlsx'),
    fileData: makeFileData('large'),
    columnMappings: makeColumnMappings('full'),
    hierarchy: makeHierarchy('nested'),
    selectedProjectId: null,
    newProjectData: null,
  },
];





describe('Property 8: Wizard State Persistence', () => {
  beforeEach(() => {
    useBOMWizardStore.getState().resetWizard();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  




  describe('save → restore produces equivalent state', () => {
    for (const tc of STATE_CASES) {
      it(`[${tc.label}]`, () => {
        const store = useBOMWizardStore.getState();

        
        store.setCurrentStep(tc.currentStep);
        store.setUploadedFile(tc.uploadedFile);
        store.setFileData(tc.fileData);
        store.setColumnMappings(tc.columnMappings);
        store.setHierarchy(tc.hierarchy);
        store.setSelectedProjectId(tc.selectedProjectId);
        store.setNewProjectData(tc.newProjectData);

        
        const persisted = readPersistedState();

        
        expect(persisted.currentStep).toEqual(tc.currentStep);
        expect(persisted.uploadedFile).toEqual(tc.uploadedFile);
        expect(persisted.fileData).toEqual(tc.fileData);
        expect(persisted.columnMappings).toEqual(tc.columnMappings);
        expect(persisted.hierarchy).toEqual(tc.hierarchy);
        expect(persisted.selectedProjectId).toEqual(tc.selectedProjectId);
        expect(persisted.newProjectData).toEqual(tc.newProjectData);
      });
    }
  });

  




  describe('restore from localStorage produces equivalent in-memory state', () => {
    for (const tc of STATE_CASES) {
      it(`[${tc.label}]`, () => {
        const snapshot = {
          currentStep: tc.currentStep,
          uploadedFile: tc.uploadedFile,
          fileData: tc.fileData,
          columnMappings: tc.columnMappings,
          hierarchy: tc.hierarchy,
          selectedProjectId: tc.selectedProjectId,
          newProjectData: tc.newProjectData,
        };

        writePersistedState(snapshot);

        const state = useBOMWizardStore.getState();

        expect(state.currentStep).toEqual(tc.currentStep);
        expect(state.uploadedFile).toEqual(tc.uploadedFile);
        expect(state.fileData).toEqual(tc.fileData);
        expect(state.columnMappings).toEqual(tc.columnMappings);
        expect(state.hierarchy).toEqual(tc.hierarchy);
        expect(state.selectedProjectId).toEqual(tc.selectedProjectId);
        expect(state.newProjectData).toEqual(tc.newProjectData);
      });
    }
  });

  




  describe('full round-trip: set → serialize → rehydrate → compare', () => {
    for (const tc of STATE_CASES) {
      it(`[${tc.label}]`, () => {
        const store = useBOMWizardStore.getState();

        
        store.setCurrentStep(tc.currentStep);
        store.setUploadedFile(tc.uploadedFile);
        store.setFileData(tc.fileData);
        store.setColumnMappings(tc.columnMappings);
        store.setHierarchy(tc.hierarchy);
        store.setSelectedProjectId(tc.selectedProjectId);
        store.setNewProjectData(tc.newProjectData);

        
        const raw = localStorage.getItem('bom-wizard-storage');
        expect(raw).not.toBeNull();

        
        useBOMWizardStore.persist.rehydrate();

        
        const restored = useBOMWizardStore.getState();
        expect(restored.currentStep).toEqual(tc.currentStep);
        expect(restored.uploadedFile).toEqual(tc.uploadedFile);
        expect(restored.fileData).toEqual(tc.fileData);
        expect(restored.columnMappings).toEqual(tc.columnMappings);
        expect(restored.hierarchy).toEqual(tc.hierarchy);
        expect(restored.selectedProjectId).toEqual(tc.selectedProjectId);
        expect(restored.newProjectData).toEqual(tc.newProjectData);
      });
    }
  });

  




  it('transient fields are NOT included in the persisted snapshot', () => {
    const store = useBOMWizardStore.getState();

    store.setCurrentStep(2);
    store.setAutoDetectConfidence(92.5);
    store.setValidationResults({ okCount: 5, warningCount: 1, errorCount: 0, hasBlockingErrors: false });
    store.setImportProgress(75);
    store.setImportResult({ success: true, created_count: 10, errors: [] });

    const persisted = readPersistedState();

    expect(persisted).not.toHaveProperty('autoDetectConfidence');
    expect(persisted).not.toHaveProperty('validationResults');
    expect(persisted).not.toHaveProperty('importProgress');
    expect(persisted).not.toHaveProperty('importResult');
  });

  



  it.each(ALL_STEPS)(
    'storage key is "bom-wizard-storage" for step %i',
    (step) => {
      useBOMWizardStore.getState().setCurrentStep(step);
      expect(Object.keys(localStorage)).toContain('bom-wizard-storage');
    }
  );

  



  it('persisting the same state twice is idempotent', () => {
    const store = useBOMWizardStore.getState();
    const file = makeUploadedFile('xlsx');

    store.setCurrentStep(1);
    store.setUploadedFile(file);
    const first = localStorage.getItem('bom-wizard-storage');

    
    store.setCurrentStep(1);
    store.setUploadedFile(file);
    const second = localStorage.getItem('bom-wizard-storage');

    expect(first).toEqual(second);
  });

  



  it('resetWizard clears all persisted partialize fields to initial values', () => {
    const store = useBOMWizardStore.getState();

    store.setCurrentStep(3);
    store.setUploadedFile(makeUploadedFile('xlsx'));
    store.setFileData(makeFileData('small'));
    store.setColumnMappings(makeColumnMappings('full'));
    store.setHierarchy(makeHierarchy('nested'));
    store.setSelectedProjectId(99);
    store.setNewProjectData(makeNewProjectData('full'));

    store.resetWizard();

    const persisted = readPersistedState();
    expect(persisted.currentStep).toBe(0);
    expect(persisted.uploadedFile).toBeNull();
    expect(persisted.fileData).toBeNull();
    expect(persisted.columnMappings).toEqual({});
    expect(persisted.hierarchy).toEqual([]);
    expect(persisted.selectedProjectId).toBeNull();
    expect(persisted.newProjectData).toBeNull();
  });

  



  it('updating one field does not corrupt other persisted fields', () => {
    const store = useBOMWizardStore.getState();

    const file = makeUploadedFile('xlsx');
    const data = makeFileData('small');
    const mappings = makeColumnMappings('full');

    store.setCurrentStep(2);
    store.setUploadedFile(file);
    store.setFileData(data);
    store.setColumnMappings(mappings);
    store.setSelectedProjectId(5);

    
    store.setCurrentStep(3);

    const persisted = readPersistedState();
    expect(persisted.currentStep).toBe(3);
    expect(persisted.uploadedFile).toEqual(file);
    expect(persisted.fileData).toEqual(data);
    expect(persisted.columnMappings).toEqual(mappings);
    expect(persisted.selectedProjectId).toBe(5);
  });

  



  it('null → value → null transitions are persisted correctly', () => {
    const store = useBOMWizardStore.getState();

    
    store.setUploadedFile(makeUploadedFile('xlsx'));
    expect(readPersistedState().uploadedFile).not.toBeNull();

    
    store.setUploadedFile(null);
    expect(readPersistedState().uploadedFile).toBeNull();

    
    store.setSelectedProjectId(10);
    expect(readPersistedState().selectedProjectId).toBe(10);

    
    store.setSelectedProjectId(null);
    expect(readPersistedState().selectedProjectId).toBeNull();
  });
});
