







import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UploadedFileData,
  FileData,
  SystemField,
  HierarchyNode,
  ValidationResult,
  NewProjectData,
  ImportResult
} from '../types';





interface BOMWizardStore {
  
  
  
  
  
  currentStep: number;
  
  
  uploadedFile: UploadedFileData | null;
  fileData: FileData | null;
  
  
  columnMappings: Record<SystemField, string>;
  autoDetectConfidence: number;
  
  
  hierarchy: HierarchyNode[];
  validationResults: ValidationResult | null;
  
  
  selectedProjectId: number | null;
  newProjectData: NewProjectData | null;
  importProgress: number;
  importResult: ImportResult | null;
  
  
  
  
  
  
  setCurrentStep: (step: number) => void;
  
  
  setUploadedFile: (file: UploadedFileData | null) => void;
  setFileData: (data: FileData | null) => void;
  
  
  setColumnMappings: (mappings: Record<SystemField, string>) => void;
  setAutoDetectConfidence: (confidence: number) => void;
  
  
  setHierarchy: (hierarchy: HierarchyNode[]) => void;
  setValidationResults: (results: ValidationResult | null) => void;
  
  
  setSelectedProjectId: (id: number | null) => void;
  setNewProjectData: (data: NewProjectData | null) => void;
  setImportProgress: (progress: number) => void;
  setImportResult: (result: ImportResult | null) => void;
  
  
  resetWizard: () => void;
}





const initialState = {
  currentStep: 0,
  uploadedFile: null,
  fileData: null,
  columnMappings: {} as Record<SystemField, string>,
  autoDetectConfidence: 0,
  hierarchy: [],
  validationResults: null,
  selectedProjectId: null,
  newProjectData: null,
  importProgress: 0,
  importResult: null
};





export const useBOMWizardStore = create<BOMWizardStore>()(
  persist(
    (set) => ({
      
      ...initialState,
      
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      
      setUploadedFile: (file) => set({ uploadedFile: file }),
      setFileData: (data) => set({ fileData: data }),
      
      
      setColumnMappings: (mappings) => set({ columnMappings: mappings }),
      setAutoDetectConfidence: (confidence) => set({ autoDetectConfidence: confidence }),
      
      
      setHierarchy: (hierarchy) => set({ hierarchy }),
      setValidationResults: (results) => set({ validationResults: results }),
      
      
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setNewProjectData: (data) => set({ newProjectData: data }),
      setImportProgress: (progress) => set({ importProgress: progress }),
      setImportResult: (result) => set({ importResult: result }),
      
      
      resetWizard: () => set(initialState)
    }),
    {
      name: 'bom-wizard-storage',
      
      partialize: (state) => ({
        currentStep: state.currentStep,
        uploadedFile: state.uploadedFile,
        fileData: state.fileData,
        columnMappings: state.columnMappings,
        hierarchy: state.hierarchy,
        selectedProjectId: state.selectedProjectId,
        newProjectData: state.newProjectData
      })
    }
  )
);
