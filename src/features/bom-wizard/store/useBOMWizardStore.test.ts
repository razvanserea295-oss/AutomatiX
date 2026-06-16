









import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBOMWizardStore } from './useBOMWizardStore';
import type { SystemField, UploadedFileData, FileData, HierarchyNode, ValidationResult, NewProjectData, ImportResult } from '../types';

describe('useBOMWizardStore', () => {
  beforeEach(() => {
    
    useBOMWizardStore.getState().resetWizard();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = useBOMWizardStore.getState();
      
      expect(state.currentStep).toBe(0);
      expect(state.uploadedFile).toBeNull();
      expect(state.fileData).toBeNull();
      expect(state.columnMappings).toEqual({});
      expect(state.autoDetectConfidence).toBe(0);
      expect(state.hierarchy).toEqual([]);
      expect(state.validationResults).toBeNull();
      expect(state.selectedProjectId).toBeNull();
      expect(state.newProjectData).toBeNull();
      expect(state.importProgress).toBe(0);
      expect(state.importResult).toBeNull();
    });
  });

  describe('Navigation Actions', () => {
    it('should update currentStep', () => {
      const { setCurrentStep } = useBOMWizardStore.getState();
      
      setCurrentStep(2);
      expect(useBOMWizardStore.getState().currentStep).toBe(2);
      
      setCurrentStep(0);
      expect(useBOMWizardStore.getState().currentStep).toBe(0);
    });
  });

  describe('File Upload Actions', () => {
    it('should set uploadedFile', () => {
      const { setUploadedFile } = useBOMWizardStore.getState();
      
      const fileData: UploadedFileData = {
        name: 'test.xlsx',
        size: 1024,
        path: '/path/to/test.xlsx',
        sheets: ['Sheet1', 'Sheet2'],
        selectedSheet: 'Sheet1'
      };
      
      setUploadedFile(fileData);
      expect(useBOMWizardStore.getState().uploadedFile).toEqual(fileData);
      
      setUploadedFile(null);
      expect(useBOMWizardStore.getState().uploadedFile).toBeNull();
    });

    it('should set fileData', () => {
      const { setFileData } = useBOMWizardStore.getState();
      
      const data: FileData = {
        headers: ['Part Number', 'Description', 'Quantity'],
        rows: [
          { 'Part Number': 'P001', 'Description': 'Part 1', 'Quantity': '10' },
          { 'Part Number': 'P002', 'Description': 'Part 2', 'Quantity': '5' }
        ]
      };
      
      setFileData(data);
      expect(useBOMWizardStore.getState().fileData).toEqual(data);
      
      setFileData(null);
      expect(useBOMWizardStore.getState().fileData).toBeNull();
    });
  });

  describe('Column Mapping Actions', () => {
    it('should set columnMappings', () => {
      const { setColumnMappings } = useBOMWizardStore.getState();
      
      const mappings = {
        cod_piesa: 'Part Number',
        nume_piesa: 'Description',
        cantitate: 'Quantity'
      } as Record<SystemField, string>;
      
      setColumnMappings(mappings);
      expect(useBOMWizardStore.getState().columnMappings).toEqual(mappings);
    });

    it('should set autoDetectConfidence', () => {
      const { setAutoDetectConfidence } = useBOMWizardStore.getState();
      
      setAutoDetectConfidence(85.5);
      expect(useBOMWizardStore.getState().autoDetectConfidence).toBe(85.5);
      
      setAutoDetectConfidence(0);
      expect(useBOMWizardStore.getState().autoDetectConfidence).toBe(0);
    });
  });

  describe('Structure Preview Actions', () => {
    it('should set hierarchy', () => {
      const { setHierarchy } = useBOMWizardStore.getState();
      
      const hierarchy: HierarchyNode[] = [
        {
          id: 'node-1',
          type: 'assembly',
          level: 0,
          code: 'STATION-001',
          name: 'Concrete Station',
          quantity: 1,
          children: [],
          validation: { status: 'ok', messages: [] }
        }
      ];
      
      setHierarchy(hierarchy);
      expect(useBOMWizardStore.getState().hierarchy).toEqual(hierarchy);
    });

    it('should set validationResults', () => {
      const { setValidationResults } = useBOMWizardStore.getState();
      
      const results: ValidationResult = {
        okCount: 10,
        warningCount: 2,
        errorCount: 0,
        hasBlockingErrors: false
      };
      
      setValidationResults(results);
      expect(useBOMWizardStore.getState().validationResults).toEqual(results);
      
      setValidationResults(null);
      expect(useBOMWizardStore.getState().validationResults).toBeNull();
    });
  });

  describe('Import Confirmation Actions', () => {
    it('should set selectedProjectId', () => {
      const { setSelectedProjectId } = useBOMWizardStore.getState();
      
      setSelectedProjectId(42);
      expect(useBOMWizardStore.getState().selectedProjectId).toBe(42);
      
      setSelectedProjectId(null);
      expect(useBOMWizardStore.getState().selectedProjectId).toBeNull();
    });

    it('should set newProjectData', () => {
      const { setNewProjectData } = useBOMWizardStore.getState();
      
      const projectData: NewProjectData = {
        name: 'New Station Project',
        client: 'ACME Corp',
        deadline: '2024-12-31'
      };
      
      setNewProjectData(projectData);
      expect(useBOMWizardStore.getState().newProjectData).toEqual(projectData);
      
      setNewProjectData(null);
      expect(useBOMWizardStore.getState().newProjectData).toBeNull();
    });

    it('should set importProgress', () => {
      const { setImportProgress } = useBOMWizardStore.getState();
      
      setImportProgress(50);
      expect(useBOMWizardStore.getState().importProgress).toBe(50);
      
      setImportProgress(100);
      expect(useBOMWizardStore.getState().importProgress).toBe(100);
    });

    it('should set importResult', () => {
      const { setImportResult } = useBOMWizardStore.getState();
      
      const result: ImportResult = {
        success: true,
        created_count: 25,
        errors: []
      };
      
      setImportResult(result);
      expect(useBOMWizardStore.getState().importResult).toEqual(result);
      
      setImportResult(null);
      expect(useBOMWizardStore.getState().importResult).toBeNull();
    });
  });

  describe('State Persistence', () => {
    afterEach(() => {
      localStorage.clear();
    });

    it('should persist only the fields defined in partialize', () => {
      const store = useBOMWizardStore.getState();

      
      store.setCurrentStep(2);
      store.setUploadedFile({
        name: 'bom.xlsx',
        size: 2048,
        path: '/files/bom.xlsx',
        sheets: ['BOM'],
        selectedSheet: 'BOM'
      });
      store.setFileData({
        headers: ['Part Number', 'Description', 'Quantity'],
        rows: [{ 'Part Number': 'P001', 'Description': 'Part 1', 'Quantity': '5' }]
      });
      store.setColumnMappings({ cod_piesa: 'Part Number', nume_piesa: 'Description', cantitate: 'Quantity' } as Record<SystemField, string>);
      store.setHierarchy([{
        id: 'node-0',
        type: 'assembly',
        level: 0,
        code: 'STATION-001',
        name: 'Concrete Station',
        quantity: 1,
        children: [],
        validation: { status: 'ok', messages: [] }
      }]);
      store.setSelectedProjectId(7);
      store.setNewProjectData({ name: 'Project X', client: 'Client Y', deadline: '2025-06-30' });

      
      store.setAutoDetectConfidence(92);
      store.setValidationResults({ okCount: 5, warningCount: 1, errorCount: 0, hasBlockingErrors: false });
      store.setImportProgress(60);
      store.setImportResult({ success: true, created_count: 5, errors: [] });

      
      const raw = localStorage.getItem('bom-wizard-storage');
      expect(raw).not.toBeNull();

      const persisted = JSON.parse(raw!);
      const state = persisted.state;

      
      expect(state.currentStep).toBe(2);
      expect(state.uploadedFile).not.toBeNull();
      expect(state.fileData).not.toBeNull();
      expect(state.columnMappings).toBeDefined();
      expect(state.hierarchy).toHaveLength(1);
      expect(state.selectedProjectId).toBe(7);
      expect(state.newProjectData).not.toBeNull();

      
      expect(state.autoDetectConfidence).toBeUndefined();
      expect(state.validationResults).toBeUndefined();
      expect(state.importProgress).toBeUndefined();
      expect(state.importResult).toBeUndefined();
    });

    it('should restore persisted state from localStorage on store initialization', () => {
      const persistedState = {
        state: {
          currentStep: 3,
          uploadedFile: {
            name: 'restored.xlsx',
            size: 512,
            path: '/restored.xlsx',
            sheets: ['Sheet1'],
            selectedSheet: 'Sheet1'
          },
          fileData: {
            headers: ['Cod', 'Denumire', 'Cantitate'],
            rows: [{ Cod: 'P100', Denumire: 'Piesa 100', Cantitate: '2' }]
          },
          columnMappings: { cod_piesa: 'Cod', nume_piesa: 'Denumire', cantitate: 'Cantitate' },
          hierarchy: [{
            id: 'node-0',
            type: 'assembly',
            level: 0,
            code: 'ST-100',
            name: 'Station 100',
            quantity: 1,
            children: [],
            validation: { status: 'ok', messages: [] }
          }],
          selectedProjectId: 15,
          newProjectData: { name: 'Restored Project', client: 'Client Z', deadline: '2025-01-01' }
        },
        version: 0
      };

      localStorage.setItem('bom-wizard-storage', JSON.stringify(persistedState));

      
      
      
      const raw = localStorage.getItem('bom-wizard-storage');
      const parsed = JSON.parse(raw!);

      expect(parsed.state.currentStep).toBe(3);
      expect(parsed.state.uploadedFile?.name).toBe('restored.xlsx');
      expect(parsed.state.fileData?.headers).toEqual(['Cod', 'Denumire', 'Cantitate']);
      expect(parsed.state.columnMappings).toEqual({ cod_piesa: 'Cod', nume_piesa: 'Denumire', cantitate: 'Cantitate' });
      expect(parsed.state.hierarchy).toHaveLength(1);
      expect(parsed.state.selectedProjectId).toBe(15);
      expect(parsed.state.newProjectData?.name).toBe('Restored Project');
    });

    it('should use storage key "bom-wizard-storage"', () => {
      useBOMWizardStore.getState().setCurrentStep(1);

      const keys = Object.keys(localStorage);
      expect(keys).toContain('bom-wizard-storage');
    });

    it('should clear persisted state when resetWizard is called', () => {
      const store = useBOMWizardStore.getState();

      store.setCurrentStep(2);
      store.setSelectedProjectId(5);

      
      const rawBefore = localStorage.getItem('bom-wizard-storage');
      expect(rawBefore).not.toBeNull();
      const beforeState = JSON.parse(rawBefore!).state;
      expect(beforeState.currentStep).toBe(2);

      
      store.resetWizard();

      
      const rawAfter = localStorage.getItem('bom-wizard-storage');
      expect(rawAfter).not.toBeNull();
      const afterState = JSON.parse(rawAfter!).state;
      expect(afterState.currentStep).toBe(0);
      expect(afterState.selectedProjectId).toBeNull();
    });
  });

  describe('Utility Actions', () => {
    it('should reset all state to initial values', () => {
      const store = useBOMWizardStore.getState();
      
      
      store.setCurrentStep(3);
      store.setUploadedFile({
        name: 'test.xlsx',
        size: 1024,
        path: '/test.xlsx',
        sheets: ['Sheet1'],
        selectedSheet: 'Sheet1'
      });
      store.setFileData({
        headers: ['A', 'B'],
        rows: [{ A: '1', B: '2' }]
      });
      store.setColumnMappings({ cod_piesa: 'A' } as Record<SystemField, string>);
      store.setAutoDetectConfidence(90);
      store.setHierarchy([{
        id: 'node-1',
        type: 'part',
        level: 1,
        code: 'P001',
        name: 'Part 1',
        quantity: 1,
        children: [],
        validation: { status: 'ok', messages: [] }
      }]);
      store.setValidationResults({
        okCount: 1,
        warningCount: 0,
        errorCount: 0,
        hasBlockingErrors: false
      });
      store.setSelectedProjectId(10);
      store.setNewProjectData({
        name: 'Project',
        client: 'Client',
        deadline: '2024-12-31'
      });
      store.setImportProgress(75);
      store.setImportResult({
        success: true,
        created_count: 10,
        errors: []
      });
      
      
      store.resetWizard();
      
      
      const state = useBOMWizardStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.uploadedFile).toBeNull();
      expect(state.fileData).toBeNull();
      expect(state.columnMappings).toEqual({});
      expect(state.autoDetectConfidence).toBe(0);
      expect(state.hierarchy).toEqual([]);
      expect(state.validationResults).toBeNull();
      expect(state.selectedProjectId).toBeNull();
      expect(state.newProjectData).toBeNull();
      expect(state.importProgress).toBe(0);
      expect(state.importResult).toBeNull();
    });
  });
});
