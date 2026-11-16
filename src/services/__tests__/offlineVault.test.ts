import { describe, expect, it } from 'vitest';
import { coalesceMutationQueue, QueuedMutation } from '../offlineVault';

describe('offlineVault mutation queue coalescing', () => {
  it('coalesces duplicate dedupeKey for the same uid while preserving ordering and other users', () => {
    const q1: QueuedMutation = {
      opId: 'op-1',
      dedupeKey: 'patch:config',
      uid: 'user-a',
      actionType: 'syncWorkspacePatch',
      payload: { config: { minRoomRate: 1500 } },
      createdAt: '2026-11-15T10:00:00.000Z',
      retryCount: 0,
    };
    const q2: QueuedMutation = {
      opId: 'op-2',
      dedupeKey: 'ledger:l-1',
      uid: 'user-a',
      actionType: 'createCloudLedgerEntry',
      payload: { id: 'l-1' },
      createdAt: '2026-11-15T10:01:00.000Z',
      retryCount: 0,
    };
    const qOtherUser: QueuedMutation = {
      opId: 'op-3',
      dedupeKey: 'patch:config',
      uid: 'user-b',
      actionType: 'syncWorkspacePatch',
      payload: { config: { minRoomRate: 2000 } },
      createdAt: '2026-11-15T10:02:00.000Z',
      retryCount: 0,
    };

    const incomingUpdate: QueuedMutation = {
      opId: 'op-4',
      dedupeKey: 'patch:config',
      uid: 'user-a',
      actionType: 'syncWorkspacePatch',
      payload: { config: { minRoomRate: 1800 } },
      createdAt: '2026-11-15T10:03:00.000Z',
      retryCount: 0,
    };

    const result = coalesceMutationQueue([q1, q2, qOtherUser], incomingUpdate);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.opId)).toEqual(['op-2', 'op-3', 'op-4']);
    expect(result[2].payload).toEqual({ config: { minRoomRate: 1800 } });
  });
});
