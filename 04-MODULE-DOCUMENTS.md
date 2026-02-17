# Module 4: Document List with MUI DataGrid

## Goal
Display documents in MUI DataGrid with filtering, search, and download capability

## Estimated Time
2-3 days

## Dependencies
- Module 3 (Dataverse Integration) must be complete

## Tasks

### 4.1 Create Documents Page

File: `src/pages/Documents.tsx`

Main page component that:
- Uses `useDocuments` hook
- Shows loading state
- Shows error state
- Renders DocumentList component

### 4.2 Create Document List Component

File: `src/components/DocumentList.tsx`

Uses MUI DataGrid with:
- Columns: Name, Account, Status, Created Date, Actions
- Sortable columns
- Pagination
- Download button in Actions column

### 4.3 Create Document Filters

File: `src/components/DocumentFilters.tsx`

Toolbar with:
- Search text field
- Account filter (if multiple accounts)
- Status filter
- Clear filters button

### 4.4 Format Helpers

File: `src/utils/formatters.ts`

```typescript
export const formatDate = (dateString: string, locale: string): string => {
  // Format date based on locale
};

export const formatFileSize = (bytes: number): string => {
  // Convert bytes to KB/MB/GB
};

export const getStatusLabel = (statecode: number): string => {
  // Return "Active" or "Inactive"
};
```

## Claude Code Instructions

```markdown
MODULE 4: Document List with MUI DataGrid

CONTEXT:
- Display documents from actum_clientdocument table
- Use MUI DataGrid component for rich table features
- Desktop-only (no mobile responsive needed)
- Include filtering and search
- Download button per document

REQUIREMENTS:

1. Install Additional Dependencies (if needed)
```bash
npm install @mui/x-data-grid
npm install date-fns  # for date formatting
```

2. Create Formatters (src/utils/formatters.ts)

```typescript
import { format } from 'date-fns';
import { enUS, da, de, fr, nl } from 'date-fns/locale';

const localeMap = {
  en: enUS,
  da: da,
  de: de,
  fr: fr,
  nl: nl,
};

export const formatDate = (dateString: string, locale: string = 'en'): string => {
  try {
    const date = new Date(dateString);
    const localeObj = localeMap[locale as keyof typeof localeMap] || enUS;
    return format(date, 'PPP', { locale: localeObj }); // e.g., "Jan 1, 2024"
  } catch {
    return dateString;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getStatusLabel = (statecode: number): string => {
  return statecode === 0 ? 'Active' : 'Inactive';
};

export const getStatusColor = (statecode: number): 'success' | 'default' => {
  return statecode === 0 ? 'success' : 'default';
};
```

3. Create DocumentFilters Component (src/components/DocumentFilters.tsx)

```typescript
import { TextField, Box, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

interface DocumentFiltersProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  statusFilter: number | '';
  onStatusChange: (status: number | '') => void;
  onClear: () => void;
}

export const DocumentFilters = ({
  searchText,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onClear
}: DocumentFiltersProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
      <TextField
        placeholder="Search documents..."
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
        }}
        sx={{ minWidth: 300 }}
      />
      
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as number | '')}
          label="Status"
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value={0}>Active</MenuItem>
          <MenuItem value={1}>Inactive</MenuItem>
        </Select>
      </FormControl>
      
      <Button
        variant="outlined"
        startIcon={<ClearIcon />}
        onClick={onClear}
      >
        Clear Filters
      </Button>
    </Box>
  );
};
```

4. Create DocumentList Component (src/components/DocumentList.tsx)

```typescript
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconButton, Chip, Tooltip, Box } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { ClientDocument } from '../types/document';
import { formatDate, getStatusLabel, getStatusColor } from '../utils/formatters';
import { useTranslation } from 'react-i18next';

interface DocumentListProps {
  documents: ClientDocument[];
  loading: boolean;
  onDownload: (document: ClientDocument) => void;
}

export const DocumentList = ({ documents, loading, onDownload }: DocumentListProps) => {
  const { t, i18n } = useTranslation();

  const columns: GridColDef[] = [
    {
      field: 'actum_name',
      headerName: t('documents.name'),
      flex: 2,
      minWidth: 250,
    },
    {
      field: 'actum_account',
      headerName: t('documents.account'),
      flex: 1,
      minWidth: 200,
      valueGetter: (params) => params.row.actum_account?.name || '-',
    },
    {
      field: 'statecode',
      headerName: t('documents.status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'createdon',
      headerName: t('documents.date'),
      width: 180,
      valueFormatter: (params) => formatDate(params.value, i18n.language),
    },
    {
      field: 'actions',
      headerName: t('documents.actions'),
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={t('common.download')}>
          <IconButton
            color="primary"
            onClick={() => onDownload(params.row)}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={documents}
        columns={columns}
        getRowId={(row) => row.actum_clientdocumentid}
        loading={loading}
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
        }}
      />
    </Box>
  );
};
```

5. Create Documents Page (src/pages/Documents.tsx)

```typescript
import { useState, useMemo } from 'react';
import { Container, Typography, Paper, Alert, CircularProgress, Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentList } from '../components/DocumentList';
import { DocumentFilters } from '../components/DocumentFilters';
import { ClientDocument } from '../types/document';
import { toast } from 'react-toastify';

export const Documents = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');

  // Fetch all documents (filtering done client-side for now)
  const { documents, loading, error, refetch } = useDocuments();

  // Client-side filtering
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = searchText === '' || 
        doc.actum_name.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === '' || doc.statecode === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [documents, searchText, statusFilter]);

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter('');
  };

  const handleDownload = (document: ClientDocument) => {
    // TODO: Implement download logic (Module 6)
    console.log('Download document:', document);
    toast.info('Download will be implemented in Module 6');
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('documents.title')}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <DocumentFilters
          searchText={searchText}
          onSearchChange={setSearchText}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onClear={handleClearFilters}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DocumentList
            documents={filteredDocuments}
            loading={false}
            onDownload={handleDownload}
          />
        )}
      </Paper>
    </Container>
  );
};
```

SUCCESS CRITERIA:
✅ Documents display in DataGrid
✅ Can search by document name
✅ Can filter by status
✅ Can clear filters
✅ Dates formatted based on locale
✅ Download button shows (placeholder for now)
✅ Proper loading and error states
✅ Pagination works
✅ Columns sortable

OUTPUT:
Fully functional document list with DataGrid, filters, and search
```

## Deliverables

- ✅ Documents page with DataGrid
- ✅ Working filters (status)
- ✅ Working search (by name)
- ✅ Download button (placeholder)
- ✅ Loading and error states

## Success Criteria

- ✅ Documents display in DataGrid
- ✅ Can search by document name
- ✅ Can filter by status
- ✅ Can clear filters
- ✅ Dates formatted based on locale
- ✅ Download button shows (placeholder for now)
- ✅ Proper loading and error states
- ✅ Pagination works
- ✅ Columns sortable

## Testing Checklist

- [ ] Documents load and display in grid
- [ ] Search by document name works
- [ ] Filter by status (Active) works
- [ ] Filter by status (Inactive) works
- [ ] Clear filters resets all filters
- [ ] Click column header to sort
- [ ] Change page size (10, 25, 50, 100)
- [ ] Navigate between pages
- [ ] Loading spinner shows while fetching
- [ ] Error message shows if fetch fails
- [ ] Retry button works on error
- [ ] Download button is visible (doesn't work yet - Module 6)

## Next Steps

Once Module 4 is complete, proceed to Module 5 (Multi-Language Support).

## Troubleshooting

**Issue: DataGrid not displaying**
- Verify @mui/x-data-grid is installed
- Check if documents array has data
- Verify getRowId is correct (actum_clientdocumentid)
- Check browser console for errors

**Issue: Columns not rendering correctly**
- Verify column field names match document properties
- Check valueGetter for computed fields
- Ensure i18n is initialized for translations

**Issue: Search not working**
- Verify searchText state is updating
- Check filter logic in useMemo
- Ensure case-insensitive comparison

**Issue: Status filter not working**
- Verify statusFilter type (number | '')
- Check filter logic handles both values
- Ensure statecode values are 0 or 1

**Issue: Dates not formatted**
- Install date-fns: `npm install date-fns`
- Verify formatDate function is correct
- Check locale is passed correctly

## Notes

- Download functionality will be implemented in Module 6
- For now, clicking download shows a toast message
- Client-side filtering is used for simplicity (can be moved to server-side later)
- Translations are placeholders until Module 5 is complete
