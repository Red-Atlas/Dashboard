/**
 * Shared between the Stripe route and the client panel. Kept in its own module
 * so the client can import the types without pulling the Stripe SDK into the
 * browser bundle.
 */

export type TransactionStatus =
  | "succeeded"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "pending"
  | "failed";

export interface Transaction {
  id: string;
  amount: number;
  amount_refunded: number;
  /** amount − amount_refunded. */
  net_amount: number;
  email: string;
  customer_name: string | null;
  /** YYYY-MM-DD in America/Puerto_Rico. */
  date: string;
  time: string;
  /** Unix seconds, used for ordering and new-activity detection. */
  created: number;
  currency: string;
  /** Derived: accounts for refunds and disputes. */
  status: TransactionStatus;
  /** Raw Stripe charge status, for cross-referencing in Stripe. */
  stripe_status: string;
  refunded_at: string | null;
  refund_reason: string | null;
  dispute_status: string | null;
  coupon_name: string | null;
  amount_saved: number | null;
  failure_reason: string | null;
  failure_code: string | null;
}
