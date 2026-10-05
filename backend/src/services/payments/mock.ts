import type { CheckInput, CheckResult, PaymentProvider, StartInput, StartResult } from './types.js';

// Simulation locale (PAYMENT_MODE=mock) : permet de tester tout le parcours sans compte marchand.
// L'état est stocké dans providerRef : mock:pending | mock:paid | mock:failed | mock:cancelled.
export function createMock(publicUrl: string): PaymentProvider {
  return {
    id: 'mock',
    async start(i: StartInput): Promise<StartResult> {
      return { redirectUrl: `${publicUrl}/dons/simulation?ref=${i.reference}`, providerRef: 'mock:pending' };
    },
    async check(i: CheckInput): Promise<CheckResult> {
      switch (i.providerRef) {
        case 'mock:paid': return { status: 'SUCCEEDED' };
        case 'mock:failed': return { status: 'FAILED' };
        case 'mock:cancelled': return { status: 'CANCELLED' };
        default: return { status: 'PENDING' };
      }
    },
  };
}
