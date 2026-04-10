"use server";

import { revalidatePath } from "next/cache";
import {
  createStaffUser,
  StaffDirectoryError,
  updateStaffUser,
} from "@/lib/tracking/staff";

export async function actionCreateStaff(payload: {
  name: string;
  email: string;
}) {
  try {
    await createStaffUser(payload);
  } catch (error) {
    if (error instanceof StaffDirectoryError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath("/admin");
}

export async function actionUpdateStaff(
  staffId: string,
  payload: { name?: string; email?: string; isActive?: boolean },
) {
  try {
    await updateStaffUser(staffId, payload);
  } catch (error) {
    if (error instanceof StaffDirectoryError) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath("/admin");
}
