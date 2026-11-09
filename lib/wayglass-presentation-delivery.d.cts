export interface PresentationReceipt {
  schema: 'wayglass.presentation-receipt/v1'; math_spine: 'hearthgate.math-spine/v1.8'; resource: string;
  key: string; receipt_id: string; principal_id: string; grant_id: string;
  presentation_id: string; source_ref: string; digest: string; created_at: string;
  status: 'queued_for_review'; wayglass_reply: null; payload: Record<string, unknown>;
}
export interface PresentationStore {
  get(key: string): Promise<PresentationReceipt | null>;
  putIfAbsent(key: string, record: PresentationReceipt): Promise<boolean>;
  listQueued(options: {resource: string; after?: string; limit?: number}): Promise<{
    records: Array<{key: string; receipt_id: string; resource: string}>; next: string | null;
  }>;
}
export interface DeliveryAdapters {
  resource: string; store: Pick<PresentationStore, 'get'>;
  isStopped(): Promise<boolean> | boolean;
  authorize(request: {subject: string; grantId: string; resource: string;
    scope: 'wayglass:present'; action: 'deliver'; receiptId: string;
    presentationId: string}): Promise<boolean>;
  // Receiver owns Feather at the side-effect boundary and atomic deduplication.
  deliver(request: {receipt_id: string; key: string; resource: string;
    principal_id: string; grant_id: string; source_ref: string; digest: string;
    payload: Record<string, unknown>}): Promise<{accepted: true; receipt_id: string}>;
}
export function createPresentationDelivery(adapters: DeliveryAdapters):
  (request: {key: string; receipt_id: string}) => Promise<{
    receipt_id: string; status: 'submitted_for_review'; wayglass_reply: null;
  }>;
