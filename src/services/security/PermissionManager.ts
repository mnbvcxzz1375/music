export interface PermissionResult {
  granted: boolean;
  message: string;
  reason?: 'user_denied' | 'not_found' | 'not_supported' | 'unknown';
}

export type PermissionStatusValue = 'granted' | 'denied' | 'prompt';

export interface PermissionState {
  microphone: PermissionStatusValue | null;
  camera: PermissionStatusValue | null;
}

export class PermissionManager {
  private permissionState: PermissionState = {
    microphone: null,
    camera: null,
  };

  async requestMicrophonePermission(): Promise<PermissionResult> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.permissionState.microphone = 'granted';

      stream.getTracks().forEach((track) => track.stop());

      return {
        granted: true,
        message: '麦克风权限已授权',
      };
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === 'NotAllowedError') {
        this.permissionState.microphone = 'denied';
        return {
          granted: false,
          message: '麦克风权限被拒绝，无法进行音准检测',
          reason: 'user_denied',
        };
      }

      if (err.name === 'NotFoundError') {
        return {
          granted: false,
          message: '未检测到麦克风设备',
          reason: 'not_found',
        };
      }

      if (err.name === 'NotSupportedError') {
        return {
          granted: false,
          message: '当前浏览器不支持麦克风访问',
          reason: 'not_supported',
        };
      }

      return {
        granted: false,
        message: '麦克风权限请求失败',
        reason: 'unknown',
      };
    }
  }

  async checkMicrophonePermission(): Promise<PermissionStatusValue> {
    if (this.permissionState.microphone) {
      return this.permissionState.microphone;
    }

    if ('permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        this.permissionState.microphone = status.state as PermissionStatusValue;
        return status.state as PermissionStatusValue;
      } catch {
        return 'prompt';
      }
    }

    return 'prompt';
  }

  getPermissionState(): PermissionState {
    return this.permissionState;
  }

  hasMicrophonePermission(): boolean {
    return this.permissionState.microphone === 'granted';
  }

  getPermissionExplanation(): {
    title: string;
    content: string;
    bullets: string[];
  } {
    return {
      title: '麦克风权限说明',
      content: '我们需要麦克风权限来检测您的演奏音准。',
      bullets: [
        '音频仅在本地处理，不上传服务器',
        '不录制完整音频，仅提取音高信息',
        '您可随时关闭权限',
      ],
    };
  }

  getPrivacyPolicy(): string {
    return `
# 麦克风权限隐私政策

## 数据收集
我们仅在您授权后使用麦克风进行音准检测。

## 数据处理
- 所有音频分析在您的设备本地完成
- 使用Web Audio API进行实时频率分析
- 不录制、存储或传输完整音频数据

## 数据存储
- 音准偏差结果可选择保存到练习记录
- 练习记录存储在您的账户中，受加密保护

## 数据分享
- 我们不会与第三方分享您的音频数据
- 练习记录仅用于提供统计和反馈

## 用户权利
- 您可以随时撤销麦克风权限
- 您可以删除练习记录
- 您可以导出或删除所有个人数据
    `.trim();
  }
}

export const permissionManager = new PermissionManager();