import { prisma } from "@/lib/prisma";
import type { StaffUserView } from "@/lib/tracking/types";

export class StaffDirectoryError extends Error {}

function mapStaff(staff: {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): StaffUserView {
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    isActive: staff.isActive,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function listStaffUsers() {
  const rows = await prisma.staffUser.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return rows.map(mapStaff);
}

export async function createStaffUser(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new StaffDirectoryError("Staff payload must be an object.");
  }

  const body = payload as Record<string, unknown>;
  const name = typeof body.name === "string" ? normalizeName(body.name) : "";
  const email =
    typeof body.email === "string" ? normalizeEmail(body.email) : "";

  if (!name) {
    throw new StaffDirectoryError("Staff name is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StaffDirectoryError("A valid staff email is required.");
  }

  try {
    await prisma.staffUser.create({
      data: { name, email },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      /unique|duplicate/i.test(error.message)
    ) {
      throw new StaffDirectoryError("That email is already in use.");
    }

    throw error;
  }
}

export async function updateStaffUser(staffId: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new StaffDirectoryError("Staff payload must be an object.");
  }

  const body = payload as Record<string, unknown>;
  const data: {
    name?: string;
    email?: string;
    isActive?: boolean;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || normalizeName(body.name).length === 0) {
      throw new StaffDirectoryError("Staff name cannot be empty.");
    }

    data.name = normalizeName(body.name);
  }

  if (body.email !== undefined) {
    if (
      typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(body.email))
    ) {
      throw new StaffDirectoryError("A valid staff email is required.");
    }

    data.email = normalizeEmail(body.email);
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new StaffDirectoryError("Staff active state must be true or false.");
    }

    data.isActive = body.isActive;
  }

  try {
    await prisma.staffUser.update({
      where: { id: staffId },
      data,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      /unique|duplicate/i.test(error.message)
    ) {
      throw new StaffDirectoryError("That email is already in use.");
    }

    throw error;
  }
}
