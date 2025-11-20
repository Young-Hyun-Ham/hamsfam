export type User = {
    uid: string;
    email: string;
    username: string;
    roles?: string[];
    provider?: string;
    provider_id?: string;
}
