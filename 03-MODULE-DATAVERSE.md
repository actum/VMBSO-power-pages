# Module 3: Dataverse Integration Layer

## Goal
Create service layer to interact with Dataverse Web API and fetch documents

## Estimated Time
1-2 days

## Dependencies
- Module 1 (Foundation) must be complete

## Tasks

### 3.1 Define TypeScript Types

File: `src/types/contact.ts`
```typescript
export interface Contact {
  contactid: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
  // Custom fields - TO BE CONFIRMED
  // actum_role?: string;
  // actum_country?: string;
  // actum_language?: string;
}
```

File: `src/types/document.ts`
```typescript
export interface ClientDocument {
  actum_clientdocumentid: string;
  actum_name: string;
  actum_account?: {
    accountid: string;
    name: string;
  };
  actum_referencedocument?: {
    // Fields from reference document lookup - TO BE CONFIRMED
    // Likely contains download URL or document metadata
  };
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
  ownerid?: {
    ownerid: string;
    name: string;
  };
}
```

### 3.2 Create Dataverse Service

File: `src/services/dataverseService.ts`

```typescript
const API_BASE = '/_api';

export const dataverseService = {
  getCurrentContact: async (): Promise<Contact> => {
    // GET /_api/contacts
    // Returns current authenticated user
  },
  
  getDocuments: async (): Promise<ClientDocument[]> => {
    // GET /_api/actum_clientdocuments
    // Expand actum_account and actum_referencedocument
    // Filter by user's account or visibility rules
  },
  
  getDocumentById: async (id: string): Promise<ClientDocument> => {
    // GET /_api/actum_clientdocuments(id)
    // Expand lookups
  }
};
```

### 3.3 Create Custom Hooks

File: `src/hooks/useCurrentUser.ts`
```typescript
export const useCurrentUser = () => {
  const [user, setUser] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch current user on mount
  // Return { user, loading, error, refetch }
};
```

File: `src/hooks/useDocuments.ts`
```typescript
export const useDocuments = () => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch documents on mount
  // Return { documents, loading, error, refetch }
};
```

## Claude Code Instructions

```markdown
MODULE 3: Dataverse Integration Layer

CONTEXT:
- Dataverse Web API endpoint: /_api/
- Tables: contact (standard), actum_clientdocument (custom)
- Session cookie automatically includes authentication
- Need to handle OData queries and responses

REQUIREMENTS:

1. Define TypeScript Types

src/types/contact.ts:
```typescript
export interface Contact {
  contactid: string;
  firstname: string;
  lastname: string;
  emailaddress1: string;
  fullname?: string;
  createdon?: string;
  modifiedon?: string;
  // Placeholder for custom fields - will be updated when names confirmed
  // TODO: Add actum_role, actum_country, actum_language
}
```

src/types/document.ts:
```typescript
export interface ClientDocument {
  actum_clientdocumentid: string;
  actum_name: string;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
  // Expanded lookups
  actum_account?: {
    accountid: string;
    name: string;
  };
  actum_referencedocument?: any; // Type unknown until we see response
  _actum_account_value?: string; // Lookup ID
  _actum_referencedocument_value?: string; // Lookup ID
}

export interface DocumentFilters {
  accountId?: string;
  status?: number;
  searchText?: string;
}
```

2. Create Dataverse Service (src/services/dataverseService.ts)

```typescript
const API_BASE = '/_api';

// Helper to build OData query
const buildQuery = (params: {
  select?: string[];
  expand?: string[];
  filter?: string;
  orderby?: string;
  top?: number;
}) => {
  const query = new URLSearchParams();
  if (params.select) query.append('$select', params.select.join(','));
  if (params.expand) query.append('$expand', params.expand.join(','));
  if (params.filter) query.append('$filter', params.filter);
  if (params.orderby) query.append('$orderby', params.orderby);
  if (params.top) query.append('$top', params.top.toString());
  return query.toString();
};

// Generic fetch wrapper
const fetchFromDataverse = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Accept': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export const dataverseService = {
  // Get current authenticated user
  getCurrentContact: async (): Promise<Contact> => {
    const query = buildQuery({
      top: 1
    });
    const response = await fetchFromDataverse<{ value: Contact[] }>(
      `/contacts?${query}`
    );
    
    if (!response.value || response.value.length === 0) {
      throw new Error('No current user found');
    }
    
    return response.value[0];
  },
  
  // Get all documents
  getDocuments: async (filters?: DocumentFilters): Promise<ClientDocument[]> => {
    // Build filter string
    let filterStr = '';
    if (filters?.accountId) {
      filterStr = `_actum_account_value eq ${filters.accountId}`;
    }
    if (filters?.status !== undefined) {
      filterStr += filterStr ? ' and ' : '';
      filterStr += `statecode eq ${filters.status}`;
    }
    if (filters?.searchText) {
      filterStr += filterStr ? ' and ' : '';
      filterStr += `contains(actum_name, '${filters.searchText}')`;
    }
    
    const query = buildQuery({
      expand: ['actum_account($select=accountid,name)', 'actum_referencedocument'],
      orderby: 'createdon desc',
      filter: filterStr || undefined,
      top: 100
    });
    
    const response = await fetchFromDataverse<{ value: ClientDocument[] }>(
      `/actum_clientdocuments?${query}`
    );
    
    return response.value || [];
  },
  
  // Get single document by ID
  getDocumentById: async (id: string): Promise<ClientDocument> => {
    const query = buildQuery({
      expand: ['actum_account($select=accountid,name)', 'actum_referencedocument']
    });
    
    return fetchFromDataverse<ClientDocument>(
      `/actum_clientdocuments(${id})?${query}`
    );
  }
};
```

3. Create Custom Hooks

src/hooks/useCurrentUser.ts:
```typescript
import { useState, useEffect } from 'react';
import { dataverseService } from '../services/dataverseService';
import { Contact } from '../types/contact';

export const useCurrentUser = () => {
  const [user, setUser] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await dataverseService.getCurrentContact();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, loading, error, refetch: fetchUser };
};
```

src/hooks/useDocuments.ts:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { dataverseService } from '../services/dataverseService';
import { ClientDocument, DocumentFilters } from '../types/document';

export const useDocuments = (filters?: DocumentFilters) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await dataverseService.getDocuments(filters);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
};
```

4. Error Handling
- Handle 401 (unauthorized) → trigger logout
- Handle 403 (forbidden) → show permission error
- Handle 404 (not found) → show not found message
- Handle network errors → show connection error

5. Testing Considerations
- Add console.log for debugging OData responses
- Log the expanded actum_referencedocument to understand structure
- Log current user to verify custom fields

SUCCESS CRITERIA:
✅ Can fetch current user from Dataverse
✅ Can fetch documents list with expanded lookups
✅ Proper TypeScript types for all entities
✅ Error handling for all API calls
✅ Loading states managed correctly
✅ Can see document and account data in console

NOTES:
- actum_referencedocument structure unknown - log and examine
- Contact custom fields (role, country) - to be added when names confirmed
- Filters can be expanded based on requirements

OUTPUT:
Complete Dataverse integration layer with types, service, and hooks
```

## Deliverables

- ✅ Type definitions for Contact and ClientDocument
- ✅ Dataverse service layer with CRUD operations
- ✅ Custom hooks for fetching data
- ✅ Error handling for all API calls

## Success Criteria

- ✅ Can fetch current user from Dataverse
- ✅ Can fetch documents list with expanded lookups
- ✅ Proper TypeScript types for all entities
- ✅ Error handling for all API calls
- ✅ Loading states managed correctly
- ✅ Can see document and account data in console

## Testing Checklist

- [ ] Log current user to console
- [ ] Verify user data structure matches Contact type
- [ ] Log documents list to console
- [ ] Verify document data structure matches ClientDocument type
- [ ] Check if actum_account is expanded correctly
- [ ] Check if actum_referencedocument is expanded correctly
- [ ] Test error handling by making invalid API call
- [ ] Verify 401 triggers logout
- [ ] Test filtering by status
- [ ] Test searching by document name

## Next Steps

Once Module 3 is complete, proceed to Module 4 (Document List with MUI DataGrid).

## Troubleshooting

**Issue: Cannot fetch current user**
- Verify user is authenticated (check auth flow)
- Check API endpoint: /_api/contacts
- Verify session cookie is present
- Check browser Network tab for errors

**Issue: Documents list returns empty**
- Verify actum_clientdocument table exists in Dataverse
- Check table permissions in Power Pages
- Verify OData query syntax
- Check if user has permission to read documents

**Issue: Lookup fields not expanding**
- Verify expand syntax: `actum_account($select=accountid,name)`
- Check if lookup fields exist in table schema
- Look for errors in browser console

**Issue: TypeScript errors**
- Ensure all types are properly defined
- Check for nullable fields (use `?`)
- Verify import paths are correct

## Notes

- actum_referencedocument structure is unknown until we inspect it
- Contact custom fields (role, country, language) need to be added when names are confirmed
- Filters can be expanded based on requirements in later phases
- Always log API responses during development to understand data structure
