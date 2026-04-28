/**
 * Reward Claim type definition
 * Represents a reward claim from the actum_rewardclaim Dataverse table
 */

export interface RewardClaim {
  actum_rewardclaimid: string;           // Primary key (GUID)
  actum_name: string;                    // Name (e.g., "Reward Claim")
  _actum_account_value: string;          // Lookup to Account
  _actum_contact_value: string;          // Lookup to Contact (who claimed)
  _actum_reward_value?: string | null;   // Lookup to Reward (nullable)
  statecode: number;                     // 0 = Active, 1 = Inactive
  statuscode: number;                    // Status reason
  createdon: string;                     // ISO timestamp
  modifiedon: string;                    // ISO timestamp
}

/**
 * Reward Claim with formatted values from OData annotations
 */
export interface RewardClaimOData extends RewardClaim {
  'createdon@OData.Community.Display.V1.FormattedValue'?: string;
  'modifiedon@OData.Community.Display.V1.FormattedValue'?: string;
}
