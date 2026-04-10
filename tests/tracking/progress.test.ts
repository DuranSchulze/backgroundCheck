import test from "node:test";
import assert from "node:assert/strict";
import { ProgressStatus } from "@/lib/generated/prisma/enums";
import { rollupProgressStatus } from "@/lib/tracking/progress";

test("rollupProgressStatus returns queued for empty child sets", () => {
  assert.equal(rollupProgressStatus([]), ProgressStatus.QUEUED);
});

test("rollupProgressStatus returns completed when all children are completed", () => {
  assert.equal(
    rollupProgressStatus([ProgressStatus.COMPLETED, ProgressStatus.COMPLETED]),
    ProgressStatus.COMPLETED,
  );
});

test("rollupProgressStatus prioritizes active investigation over in progress and on hold", () => {
  assert.equal(
    rollupProgressStatus([
      ProgressStatus.QUEUED,
      ProgressStatus.ON_HOLD,
      ProgressStatus.ACTIVE_INVESTIGATION,
      ProgressStatus.IN_PROGRESS,
    ]),
    ProgressStatus.ACTIVE_INVESTIGATION,
  );
});

test("rollupProgressStatus returns in progress before on hold", () => {
  assert.equal(
    rollupProgressStatus([ProgressStatus.QUEUED, ProgressStatus.IN_PROGRESS]),
    ProgressStatus.IN_PROGRESS,
  );
});
