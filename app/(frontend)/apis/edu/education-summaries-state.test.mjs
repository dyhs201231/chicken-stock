import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getEducationSummariesState } from "./education-summaries-state.ts";

describe("getEducationSummariesState", () => {
  it("does not block summary rendering while user progress is loading", () => {
    assert.deepEqual(
      getEducationSummariesState({
        hasSummaries: true,
        isProgressLoading: true,
        isSummariesLoading: false,
      }),
      {
        isLoading: false,
        isProgressLoading: true,
      },
    );
  });

  it("blocks rendering while summaries are still loading", () => {
    assert.deepEqual(
      getEducationSummariesState({
        hasSummaries: false,
        isProgressLoading: false,
        isSummariesLoading: true,
      }),
      {
        isLoading: true,
        isProgressLoading: false,
      },
    );
  });
});
