














export enum SystemField {
  COD_PIESA = 'cod_piesa',        
  NUME_PIESA = 'nume_piesa',      
  CANTITATE = 'cantitate',        
  MATERIAL = 'material',          
  MASA = 'masa',                  
  NIVEL = 'nivel',                
  TIP_PIESA = 'tip_piesa',        
  TRATAMENT = 'tratament'         
}








export interface UploadedFileData {
  name: string;
  size: number;
  path: string;
  sheets: string[];
  selectedSheet: string;
}




export interface FileData {
  headers: string[];
  rows: Record<string, string>[];
}




export interface FileValidationResult {
  valid: boolean;
  error?: string;
}








export interface AutoDetectResult {
  mappings: Record<SystemField, string>;
  confidence: number;
  isHighConfidence: boolean;
}








export type NodeType = 'assembly' | 'sub_assembly' | 'part';




export type PartType = 'internal' | 'purchased';




export type ValidationStatus = 'ok' | 'warning' | 'error';




export interface NodeValidation {
  status: ValidationStatus;
  messages: string[];
}




export interface HierarchyNode {
  id: string;
  type: NodeType;
  level: number;
  code: string;
  name: string;
  quantity: number;
  material?: string;
  mass?: number;
  partType?: PartType;
  treatment?: string;
  children: HierarchyNode[];
  validation: NodeValidation;
}




export interface ValidationResult {
  okCount: number;
  warningCount: number;
  errorCount: number;
  hasBlockingErrors: boolean;
}








export interface BOMPart {
  cod_piesa: string;
  nume_piesa: string;
  cantitate: number;
  material?: string;
  masa?: number;
  tip_piesa?: PartType;
  tratament?: string;
  parent_id?: string;
  nivel: number;
}




export interface NewProjectData {
  name: string;
  client: string;
  deadline: string;
}




export interface ImportError {
  part_code: string;
  part_name: string;
  error: string;
}




export interface ImportResult {
  success: boolean;
  created_count: number;
  errors: ImportError[];
}




export interface ImportSummary {
  totalParts: number;
  subAssemblies: number;
  internalParts: number;
  purchasedParts: number;
}








export interface ReadExcelResponse {
  headers: string[];
  rows: Record<string, string>[];
  sheet_names: string[];
}




export interface ImportBOMResponse {
  success: boolean;
  created_count: number;
  errors: ImportError[];
}




export interface ProjectListItem {
  id: number;
  nume: string;
  client: string;
  deadline: string;
}
