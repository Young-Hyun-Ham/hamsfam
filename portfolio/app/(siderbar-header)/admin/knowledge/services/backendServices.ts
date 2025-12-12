import { KnowledgeProject, KnowledgeIntent, KnowledgeEntity } from "../types";
import * as firebaseApi from "../dto/firebaseApi";
import * as postgresApi from "../dto/postgresApi";

const backend =
  (process.env.NEXT_PUBLIC_BACKEND as "firebase" | "postgres" | undefined) ??
  "firebase";

const api = backend === "firebase" ? firebaseApi : postgresApi;

export async function getProjects(): Promise<KnowledgeProject[]> {
  return api.fetchProjects();
}

export async function createProject(payload: Partial<KnowledgeProject>) {
  return api.createProject(payload);
}

export async function getIntents(projectId: string): Promise<KnowledgeIntent[]> {
  return api.fetchIntents(projectId);
}

export async function getEntities(projectId: string): Promise<KnowledgeEntity[]> {
  return api.fetchEntities(projectId);
}