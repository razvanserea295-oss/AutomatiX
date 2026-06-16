# Ghid: Adăugare Date pe Pagini

Acest ghid explică cum să adaugi funcționalitate de adăugare/editare/ștergere date pe orice pagină din aplicație.

## Componente Disponibile

### 1. FormModal
Component generic pentru formulare modale cu validare și gestionare erori.

**Locație:** `src/components/FormModal.tsx`

**Props:**
- `isOpen`: boolean - starea modalului
- `onClose`: () => void - funcție de închidere
- `title`: string - titlul modalului
- `fields`: FormField[] - array de câmpuri
- `onSubmit`: (data) => Promise<void> - funcție de submit
- `initialData`: object - date inițiale pentru editare
- `submitLabel`: string - text buton submit

**Tipuri de câmpuri suportate:**
- `text` - input text simplu
- `email` - input email cu validare
- `tel` - input telefon
- `number` - input numeric
- `date` - selector dată
- `textarea` - text multi-linie
- `select` - dropdown cu opțiuni

### 2. useFormModal Hook
Hook pentru gestionarea stării modalului de formular.

**Locație:** `src/hooks/useFormModal.ts`

**Returnează:**
- `isOpen`: boolean - starea modalului
- `editingItem`: any | null - item-ul în curs de editare
- `openModal`: (item?) => void - deschide modalul
- `closeModal`: () => void - închide modalul
- `isEditing`: boolean - true dacă editează un item existent

## Pași de Implementare

### Pas 1: Import componente

```typescript
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
```

### Pas 2: Inițializare hook

```typescript
export default function MyPage() {
  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();
  // ... rest of component
}
```

### Pas 3: Definire câmpuri formular

```typescript
const formFields: FormField[] = [
  { 
    name: 'name', 
    label: 'Nume', 
    type: 'text', 
    required: true, 
    placeholder: 'Introdu numele' 
  },
  { 
    name: 'email', 
    label: 'Email', 
    type: 'email', 
    required: true, 
    placeholder: 'email@example.com' 
  },
  { 
    name: 'description', 
    label: 'Descriere', 
    type: 'textarea', 
    required: false 
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'active', label: 'Activ' },
      { value: 'inactive', label: 'Inactiv' },
    ]
  },
];
```

### Pas 4: Funcție de submit

```typescript
const handleSubmit = async (data: Record<string, any>) => {
  if (isEditing) {
    // Editare item existent
    await apiCommand('update_item', { id: editingItem.id, ...data });
  } else {
    // Creare item nou
    await apiCommand('create_item', data);
  }
  // Reîncarcă datele
  await fetchData();
};
```

### Pas 5: Funcție de ștergere (opțional)

```typescript
const handleDelete = async (id: number) => {
  if (!confirm('Sigur doriti sa stergeti acest item?')) return;
  try {
    await apiCommand('delete_item', { id });
    await fetchData();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Eroare la stergere');
  }
};
```

### Pas 6: Butoane în UI

```typescript
{/* Buton adăugare */}
<button
  type="button"
  onClick={() => openModal()}
  className="flex items-center gap-2 rounded-lg bg-shell-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
>
  <Plus className="h-4 w-4" />
  Adauga
</button>

{/* Buton editare */}
<button
  type="button"
  onClick={() => openModal(item)}
  className="rounded-lg p-1.5 text-shell-muted hover:text-shell-accent"
>
  <Pencil className="h-4 w-4" />
</button>

{/* Buton ștergere */}
<button
  type="button"
  onClick={() => handleDelete(item.id)}
  className="rounded-lg p-1.5 text-shell-muted hover:text-status-red"
>
  <Trash2 className="h-4 w-4" />
</button>
```

### Pas 7: Adaugă modalul în JSX

```typescript
return (
  <div>
    {/* Conținutul paginii */}
    
    <FormModal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEditing ? 'Editeaza' : 'Adauga'}
      fields={formFields}
      onSubmit={handleSubmit}
      initialData={editingItem || {}}
      submitLabel={isEditing ? 'Actualizeaza' : 'Adauga'}
    />
  </div>
);
```

## Exemple Complete

### Exemplu 1: Pagină Clienți
Vezi: `src/pages/clients/ClientsPage.tsx`

### Exemplu 2: Pagină Proiecte
Vezi: `src/pages/ProjectsPage.tsx`

## Tipuri de Câmpuri - Exemple Detaliate

### Text Input
```typescript
{ name: 'name', label: 'Nume', type: 'text', required: true, placeholder: 'Nume complet' }
```

### Email Input
```typescript
{ name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'email@example.com' }
```

### Telefon Input
```typescript
{ name: 'phone', label: 'Telefon', type: 'tel', required: true, placeholder: '+40 XXX XXX XXX' }
```

### Number Input
```typescript
{ name: 'budget', label: 'Buget (EUR)', type: 'number', required: true, placeholder: '0.00' }
```

### Date Input
```typescript
{ name: 'deadline', label: 'Deadline', type: 'date', required: true }
```

### Textarea
```typescript
{ name: 'description', label: 'Descriere', type: 'textarea', required: false, placeholder: 'Descriere detaliată' }
```

### Select Dropdown
```typescript
{
  name: 'status',
  label: 'Status',
  type: 'select',
  required: true,
  options: [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Activ' },
    { value: 'archived', label: 'Arhivat' },
  ]
}
```

### Select cu Date Dinamice
```typescript
{
  name: 'client_id',
  label: 'Client',
  type: 'select',
  required: true,
  options: clients.map(c => ({ value: c.id, label: c.name }))
}
```

## Best Practices

1. **Validare**: Folosește `required: true` pentru câmpuri obligatorii
2. **Placeholder**: Adaugă placeholder-uri clare pentru a ghida utilizatorul
3. **Confirmare ștergere**: Întotdeauna cere confirmare înainte de ștergere
4. **Feedback**: Gestionează erorile și afișează mesaje clare
5. **Reîncărcare date**: După operații CRUD, reîncarcă datele pentru sincronizare
6. **Accessibility**: Folosește `aria-label` pentru butoane cu doar icoane

## Troubleshooting

### Modalul nu se deschide
- Verifică că `isOpen` este setat corect
- Verifică că `openModal()` este apelat la click

### Datele nu se salvează
- Verifică că `onSubmit` este async și returnează Promise
- Verifică că API command-ul este corect
- Verifică console pentru erori

### Câmpurile nu se populează la editare
- Verifică că `initialData` conține datele corecte
- Verifică că numele câmpurilor (`name`) corespund cu proprietățile obiectului

### Select-ul nu afișează opțiuni
- Verifică că `options` este un array valid
- Verifică că fiecare opțiune are `value` și `label`
