/**
 * Reward type definition
 * Represents a reward from the actum_reward Dataverse table
 */

export interface Reward {
  actum_rewardid: string;              // Primary key (GUID)
  actum_name: string;                  // Reward name
  actum_description?: string | null;   // Description text (nullable)
  actum_pointamount: number;           // Point cost (NOTE: field name is actum_pointamount, not actum_pointcost)
  statecode: number;                   // 0 = Active, 1 = Inactive
  statuscode: number;                  // Status reason
  createdon: string;                   // ISO timestamp
  modifiedon: string;                  // ISO timestamp
}

/**
 * Reward with formatted values from OData annotations
 */
export interface RewardOData extends Reward {
  'actum_pointamount@OData.Community.Display.V1.FormattedValue'?: string;
}
