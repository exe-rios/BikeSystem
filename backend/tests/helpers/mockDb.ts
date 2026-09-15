import { vi } from 'vitest';

export interface MockClient {
  query: any;
  release: any;
}

export interface MockPool {
  query: any;
  connect: any;
  on: any;
}

export function createMockClient(): MockClient {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  };
}

export function setupPoolMock(): { mockPool: MockPool; mockClient: MockClient } {
  const mockClient = createMockClient();
  const mockPool: MockPool = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(mockClient),
    on: vi.fn(),
  };

  return { mockPool, mockClient };
}
