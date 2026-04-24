export type SecurityLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type DataType = 
  | 'musicXml'
  | 'practiceRecord'
  | 'userSettings'
  | 'userEmail'
  | 'userPhone'
  | 'password'
  | 'paymentInfo'
  | 'apiKey'
  | 'accessToken';

export interface DataClassification {
  type: DataType;
  level: SecurityLevel;
  storageLocation: 'local' | 'cloud' | 'thirdParty';
  encryptionRequired: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SecurityConfig {
  csrfEnabled: boolean;
  xssProtectionEnabled: boolean;
  inputValidationEnabled: boolean;
  secureStorageEnabled: boolean;
}

export type IncidentLevel = 'P1' | 'P2' | 'P3' | 'P4';

export interface SecurityIncident {
  id: string;
  level: IncidentLevel;
  type: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}