// app/(sidebar-header)/admin/knowledge/types/index.ts

export type KnowledgeProjectStatus = "draft" | "active" | "archived";

export interface KnowledgeProject {
  id: string;
  name: string;
  description?: string;
  defaultLanguage: string;
  status: KnowledgeProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeIntent {
  id: string;
  projectId: string;
  name: string;
  displayName: string;
  description?: string;
  trainingPhrases: string[];
  responseTemplate?: string;
  tags?: string[];
  isFallback?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EntityKind = "list" | "regex" | "system";

export interface KnowledgeEntityValue {
  value: string;
  synonyms?: string[];
}

export interface KnowledgeEntity {
  id: string;
  projectId: string;
  name: string;
  displayName: string;
  kind: EntityKind;
  values: KnowledgeEntityValue[];
  regexPattern?: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}
