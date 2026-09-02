import { IPlan } from '../../models/plan.model';
import { BillingCycle, ISubscription } from '../../models/subscription.model';

export enum PlanTransitionType {
  FREE_TO_PAID = 'free_to_paid',
  PAID_TO_HIGHER_PAID = 'paid_to_higher_paid',
  PAID_TO_LOWER_PAID = 'paid_to_lower_paid',
  PAID_TO_SAME_PAID = 'paid_to_same_paid',
  PAID_TO_FREE = 'paid_to_free',
  FREE_TO_FREE = 'free_to_free',
}

export interface TransitionEvaluation {
  transitionType: PlanTransitionType;
  requiresPayment: boolean;
  amount: number; // In minor units (paise)
  currency: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
  description: string;
}

export class SubscriptionBillingPolicyService {
  /**
   * Convert currency amount (e.g. ₹499) to minor units (e.g. 49900 paise)
   */
  static toMinorUnits(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert minor units (e.g. 49900 paise) to major currency amount (e.g. 499)
   */
  static toMajorUnits(amountPaise: number): number {
    return Math.round(amountPaise) / 100;
  }

  /**
   * Calculate price in minor units for a given plan and billing cycle
   */
  static calculatePlanAmount(plan: IPlan, billingCycle: BillingCycle = BillingCycle.MONTHLY): number {
    const rawPrice =
      billingCycle === BillingCycle.YEARLY ? plan.pricing?.yearly || 0 : plan.pricing?.monthly || 0;
    return this.toMinorUnits(rawPrice);
  }

  /**
   * Evaluate plan change policy
   */
  static evaluateTransition(
    currentSub: ISubscription | null,
    currentPlan: IPlan | null,
    targetPlan: IPlan,
    targetCycle: BillingCycle = BillingCycle.MONTHLY,
  ): TransitionEvaluation {
    const targetPrice =
      targetCycle === BillingCycle.YEARLY ? targetPlan.pricing?.yearly || 0 : targetPlan.pricing?.monthly || 0;
    const targetAmountPaise = this.toMinorUnits(targetPrice);
    const currency = targetPlan.pricing?.currency || 'INR';

    const isCurrentFree = !currentPlan || (currentPlan.pricing?.monthly === 0 && currentPlan.pricing?.yearly === 0);
    const isTargetFree = targetPlan.pricing?.monthly === 0 && targetPlan.pricing?.yearly === 0;

    // 1. Free to Free
    if (isCurrentFree && isTargetFree) {
      return {
        transitionType: PlanTransitionType.FREE_TO_FREE,
        requiresPayment: false,
        amount: 0,
        currency,
        isUpgrade: false,
        isDowngrade: false,
        description: 'Free tier change',
      };
    }

    // 2. Free to Paid
    if (isCurrentFree && !isTargetFree) {
      return {
        transitionType: PlanTransitionType.FREE_TO_PAID,
        requiresPayment: true,
        amount: targetAmountPaise,
        currency,
        isUpgrade: true,
        isDowngrade: false,
        description: `Upgrade to ${targetPlan.name} (${targetCycle})`,
      };
    }

    // 3. Paid to Free
    if (!isCurrentFree && isTargetFree) {
      return {
        transitionType: PlanTransitionType.PAID_TO_FREE,
        requiresPayment: false,
        amount: 0,
        currency,
        isUpgrade: false,
        isDowngrade: true,
        description: `Downgrade to Free tier`,
      };
    }

    // 4. Paid to Paid
    const currentCycle = currentSub?.billingCycle || BillingCycle.MONTHLY;
    const currentPrice =
      currentCycle === BillingCycle.YEARLY ? currentPlan?.pricing?.yearly || 0 : currentPlan?.pricing?.monthly || 0;

    if (targetPrice > currentPrice) {
      return {
        transitionType: PlanTransitionType.PAID_TO_HIGHER_PAID,
        requiresPayment: true,
        amount: targetAmountPaise,
        currency,
        isUpgrade: true,
        isDowngrade: false,
        description: `Upgrade from ${currentPlan?.name} to ${targetPlan.name}`,
      };
    } else if (targetPrice < currentPrice) {
      return {
        transitionType: PlanTransitionType.PAID_TO_LOWER_PAID,
        requiresPayment: false,
        amount: 0,
        currency,
        isUpgrade: false,
        isDowngrade: true,
        description: `Downgrade from ${currentPlan?.name} to ${targetPlan.name}`,
      };
    } else {
      return {
        transitionType: PlanTransitionType.PAID_TO_SAME_PAID,
        requiresPayment: false,
        amount: targetAmountPaise,
        currency,
        isUpgrade: false,
        isDowngrade: false,
        description: `Cycle or Plan change for ${targetPlan.name}`,
      };
    }
  }
}
