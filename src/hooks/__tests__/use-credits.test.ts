import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock setup ---

let mockUser: { id: string } | null = { id: "user-123" };
let mockProfileData: { study_count: number; role: string } | null = { study_count: 1, role: "free" };
let realtimeCallback: ((payload: unknown) => void) | null = null;
const mockRemoveChannel = vi.fn();

const mockChannel = {
  on: vi.fn().mockImplementation((_event, _filter, cb) => {
    realtimeCallback = cb;
    return mockChannel;
  }),
  subscribe: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: { user: mockUser } }),
    ),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: mockProfileData, error: null }),
        ),
      }),
    }),
  }),
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
};

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserClient: () => mockSupabase,
}));

import { useCredits } from "../use-credits";

describe("useCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-123" };
    mockProfileData = { study_count: 1, role: "free" };
    realtimeCallback = null;

    mockChannel.on.mockImplementation((_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
      realtimeCallback = cb;
      return mockChannel;
    });
    mockChannel.subscribe.mockReturnValue(mockChannel);

    mockSupabase.auth.getUser.mockImplementation(() =>
      Promise.resolve({ data: { user: mockUser } }),
    );
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() =>
            Promise.resolve({ data: mockProfileData, error: null }),
          ),
        }),
      }),
    });
    mockSupabase.channel.mockReturnValue(mockChannel);
  });

  it("should return isLoading=true initially and then creditsRemaining after fetch", async () => {
    // Arrange & Act
    const { result } = renderHook(() => useCredits());

    // Assert — initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.creditsRemaining).toBeNull();

    // Assert — after fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.creditsRemaining).toBe(2); // max(0, 3 - 1)
  });

  it("should optimistically decrement creditsRemaining before server confirms", async () => {
    // Arrange
    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.creditsRemaining).toBe(2);

    // Act — optimistic decrement
    act(() => {
      result.current.decrementCredits();
    });

    // Assert — immediately decremented without waiting for server
    expect(result.current.creditsRemaining).toBe(1);

    // Act — decrement again
    act(() => {
      result.current.decrementCredits();
    });

    // Assert
    expect(result.current.creditsRemaining).toBe(0);
  });

  it("should return null creditsRemaining when no authenticated user", async () => {
    // Arrange
    mockUser = null;

    // Act
    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(result.current.creditsRemaining).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("should update creditsRemaining when real-time subscription fires", async () => {
    // Arrange
    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.creditsRemaining).toBe(2);

    // Act — simulate real-time update (study_count goes to 2 => credits = max(0, 3-2) = 1)
    act(() => {
      realtimeCallback?.({ new: { id: "user-123", study_count: 2, role: "free" } });
    });

    // Assert
    expect(result.current.creditsRemaining).toBe(1);
  });

  it("should call cleanup (removeChannel) on unmount", async () => {
    // Arrange
    const { result, unmount } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Act
    unmount();

    // Assert
    expect(mockRemoveChannel).toHaveBeenCalledOnce();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("should not decrement below null when creditsRemaining is null", async () => {
    // Arrange
    mockUser = null;
    const { result } = renderHook(() => useCredits());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Act
    act(() => {
      result.current.decrementCredits();
    });

    // Assert — stays null, doesn't crash
    expect(result.current.creditsRemaining).toBeNull();
  });
});
