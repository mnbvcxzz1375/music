export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  specialChars: string;
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export function validatePassword(
  password: string,
  policy: PasswordPolicy = defaultPasswordPolicy
): PasswordValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;

  if (password.length < policy.minLength) {
    errors.push(`密码长度至少${policy.minLength}位`);
  } else {
    strengthScore += Math.min(password.length - policy.minLength, 8);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码需包含大写字母');
  } else if (/[A-Z]/.test(password)) {
    strengthScore += 1;
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码需包含小写字母');
  } else if (/[a-z]/.test(password)) {
    strengthScore += 1;
  }

  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('密码需包含数字');
  } else if (/[0-9]/.test(password)) {
    strengthScore += 1;
  }

  const specialCharRegex = new RegExp(`[${policy.specialChars}]`);
  if (policy.requireSpecialChar && !specialCharRegex.test(password)) {
    errors.push('密码需包含特殊字符');
  } else if (specialCharRegex.test(password)) {
    strengthScore += 2;
  }

  const uniqueChars = new Set(password).size;
  strengthScore += Math.min(uniqueChars - 4, 4);

  const strength = getStrengthLevel(strengthScore);

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

function getStrengthLevel(score: number): 'weak' | 'medium' | 'strong' | 'very_strong' {
  if (score < 4) return 'weak';
  if (score < 7) return 'medium';
  if (score < 10) return 'strong';
  return 'very_strong';
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'weak':
      return '#f44336';
    case 'medium':
      return '#ff9800';
    case 'strong':
      return '#4caf50';
    case 'very_strong':
      return '#2196f3';
    default:
      return '#9e9e9e';
  }
}

export function getPasswordStrengthText(strength: string): string {
  switch (strength) {
    case 'weak':
      return '弱';
    case 'medium':
      return '中等';
    case 'strong':
      return '强';
    case 'very_strong':
      return '非常强';
    default:
      return '未知';
  }
}