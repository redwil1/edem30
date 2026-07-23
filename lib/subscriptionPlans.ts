import "server-only";

import { sql } from "@/lib/db";

export type SubscriptionPlan = {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  description: string | null;
  active: boolean;
  createdAt: string;
};

type SubscriptionPlanRow = {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description: string | null;
  active: boolean;
  created_at: string;
};

function toPlan(r: SubscriptionPlanRow): SubscriptionPlan {
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    durationDays: r.duration_days,
    description: r.description,
    active: r.active,
    createdAt: r.created_at,
  };
}

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const rows = await sql<SubscriptionPlanRow[]>`
    SELECT id, name, price, duration_days, description, active, created_at
    FROM subscription_plans
    ORDER BY price ASC
  `;

  return rows.map(toPlan);
}

export type CreateSubscriptionPlanInput = {
  name: string;
  price: number;
  durationDays: number;
  description: string | null;
};

export async function createSubscriptionPlan(
  input: CreateSubscriptionPlanInput
): Promise<SubscriptionPlan | { error: string }> {
  const name = input.name.trim();

  if (!name || name.length > 60) {
    return { error: "Укажите название тарифа" };
  }

  if (!Number.isInteger(input.price) || input.price < 0) {
    return { error: "Некорректная цена" };
  }

  if (!Number.isInteger(input.durationDays) || input.durationDays <= 0) {
    return { error: "Некорректный срок действия" };
  }

  const rows = await sql<SubscriptionPlanRow[]>`
    INSERT INTO subscription_plans (name, price, duration_days, description)
    VALUES (${name}, ${input.price}, ${input.durationDays}, ${input.description})
    RETURNING id, name, price, duration_days, description, active, created_at
  `;

  return toPlan(rows[0]);
}

export async function setSubscriptionPlanActive(id: number, active: boolean): Promise<boolean> {
  const result = await sql`UPDATE subscription_plans SET active = ${active} WHERE id = ${id}`;

  return result.count > 0;
}

export async function deleteSubscriptionPlan(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM subscription_plans WHERE id = ${id}`;

  return result.count > 0;
}
