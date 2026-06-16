# BOM Import Wizard

This feature enables users to import Bill of Materials (BOM) data from SolidWorks Excel/CSV exports into the Promix ERP system through a guided 4-step wizard.

## Directory Structure

```
bom-wizard/
├── README.md                           # This file
├── types.ts                            # TypeScript interfaces and enums
├── store/
│   └── useBOMWizardStore.ts           # Zustand store with persistence
├── components/                         # (To be implemented)
│   ├── BOMImportWizard.tsx            # Main wizard container
│   ├── FileUploadStep.tsx             # Step 1: File upload
│   ├── ColumnMappingStep.tsx          # Step 2: Column mapping
│   ├── StructurePreviewStep.tsx       # Step 3: Structure preview
│   └── ImportConfirmationStep.tsx     # Step 4: Import confirmation
└── utils/                              # (To be implemented)
    ├── fileValidation.ts              # File validation utilities
    ├── autoDetection.ts               # Column auto-detection
    ├── hierarchyBuilder.ts            # Hierarchy construction
    └── exportUtils.ts                 # BOM export functionality
```

## Core Types

### SystemField Enum
Defines the system fields that BOM columns can be mapped to:
- `COD_PIESA` - Part Number (Required)
- `NUME_PIESA` - Part Name (Required)
- `CANTITATE` - Quantity (Required)
- `MATERIAL` - Material
- `MASA` - Mass/Weight
- `NIVEL` - Hierarchy Level
- `TIP_PIESA` - Part Type (Internal/Purchased)
- `TRATAMENT` - Surface Treatment/Finish

### Key Interfaces

**HierarchyNode**: Represents a node in the BOM tree structure
- Supports assembly, sub_assembly, and part types
- Includes validation status and messages
- Recursive children structure

**BOMPart**: Flattened part data ready for database import

**ImportResult**: Result of import operation with success status and errors

## State Management

The wizard uses Zustand with persistence middleware to maintain state across page reloads.

### Persisted State
- Current step number
- Uploaded file data
- File data (headers and rows)
- Column mappings
- Hierarchy structure
- Selected project ID
- New project data

### Non-Persisted State
- Auto-detect confidence
- Validation results
- Import progress
- Import result

## Usage

```typescript
import { useBOMWizardStore } from '@/features/bom-wizard/store/useBOMWizardStore';

function MyComponent() {
  const { currentStep, setCurrentStep, resetWizard } = useBOMWizardStore();
  
  // Use wizard state and actions
}
```

## Requirements

This feature implements requirements 5.1 and 5.5 from the specification:
- 5.1: Wizard state management with Zustand
- 5.5: Type definitions for all wizard data structures

## Next Steps

1. Implement Tauri backend commands (Task 3)
2. Implement file validation utilities (Task 5)
3. Build wizard UI components (Tasks 6-15)
4. Add property-based tests (Various tasks)
5. Integrate into main application (Task 17)
