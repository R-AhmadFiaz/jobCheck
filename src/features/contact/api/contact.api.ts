import { apiRequest } from '@/lib/apiClient';

export interface ContactMessageInput {
  name: string;
  email: string;
  message: string;
}

// Thin client for the existing POST /api/v1/contact route (validation, rate
// limiting, and the actual Resend send all happen server-side — see
// src/modules/contact/*). Same apiRequest helper every other feature uses;
// no separate fetch logic, no email/provider details on this side.
export function submitContactMessage(input: ContactMessageInput): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/contact', { method: 'POST', body: input });
}
