export interface PresentationReceipt {
  key: string; receipt_id: string; principal_id: string; grant_id: string;
  presentation_id: string; source_ref: string; digest: string;
  status: 'queued_for_review'; payload: Record<string, unknown>;
}
export interface DeliveryAdapters {
  resource: string;
  store: { get(key: string): Promise<PresentationReceipt | null> };
  authorize(request: { subject: string; grantId: string; resource: string;
    scope: 'wayglass:present'; action: 'deliver'; receiptId: string;
    presentationId: string }): Promise<boolean>;
  // Receiving host enforces Feather and deduplicates receipt_id atomically.
  deliver(request: { receipt_id: string; key: string; principal_id: string;
    grant_id: string; source_ref: string; digest: string;
    payload: Record<string, unknown> }): Promise<unknown>;
}
export function createPresentationDelivery(adapters: DeliveryAdapters):
  (request: { key: string; receipt_id: string }) => Promise<{
    receipt_id: string; status: 'submitted_for_review'; wayglass_reply: null;
  }>;
