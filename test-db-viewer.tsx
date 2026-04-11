'use client';

import React from 'react';
import DbSchemaViewer from './app/chat/components/DbSchemaViewer';

const testMermaid = `erDiagram
    USERS {
        string id PK
        string email
        string password_hash
        string status
        datetime created_at
        datetime updated_at
        datetime last_login
    }

    ORGANIZATIONS {
        string id PK
        string owner_id FK
        string name
        string description
        datetime created_at
        datetime updated_at
    }

    ORGANIZATION_MEMBERS {
        string organization_id PK,FK
        string user_id PK,FK
        string role
        datetime joined_at
    }

    PLANS {
        string id PK
        string name
        string description
        decimal price_monthly
        decimal price_yearly
        json features
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTIONS {
        string id PK
        string organization_id FK
        string plan_id FK
        date start_date
        date end_date
        string status
        json payment_method_details
        datetime created_at
        datetime updated_at
    }

    WORKSPACES {
        string id PK
        string organization_id FK
        string created_by_user_id FK
        string name
        string description
        datetime created_at
        datetime updated_at
    }

    ITEMS {
        string id PK
        string workspace_id FK
        string created_by_user_id FK
        string title
        text content
        string status
        datetime created_at
        datetime updated_at
    }

    AUDIT_LOGS {
        string id PK
        string user_id FK
        string organization_id FK
        string event_type
        string entity_type
        string entity_id
        json old_value
        json new_value
        string ip_address
        datetime timestamp
    }

    USERS ||--o{ ORGANIZATIONS : owns
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
    USERS ||--o{ ORGANIZATION_MEMBERS : belongs_to
    ORGANIZATIONS ||--o{ SUBSCRIPTIONS : has
    PLANS ||--o{ SUBSCRIPTIONS : provides
    ORGANIZATIONS ||--o{ WORKSPACES : contains
    USERS ||--o{ WORKSPACES : creates
    WORKSPACES ||--o{ ITEMS : contains
    USERS ||--o{ ITEMS : creates
    USERS ||--o{ AUDIT_LOGS : performs
    ORGANIZATIONS ||--o{ AUDIT_LOGS : affects`;

export default function TestDbViewer() {
  return (
    <div style={{ padding: '20px', background: '#0a0a0a', minHeight: '100vh' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>Database Schema Test</h2>
      <DbSchemaViewer 
        mermaid={testMermaid}
        diagram=""
      />
    </div>
  );
}
