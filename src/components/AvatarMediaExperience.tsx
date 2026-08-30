import {
  AvatarVideo,
  ControlBar,
  ScreenShareVideo,
  UserVideo,
  useLocalMedia,
} from '@runwayml/avatars-react'
import { Camera, MonitorUp, RefreshCw, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AvatarMediaCapabilities } from '../utils/avatarMediaCapabilities'

interface AvatarMediaNoticeProps {
  capabilities: AvatarMediaCapabilities
  visualContextSupported?: boolean
}

export function AvatarMediaNotice({
  capabilities,
  visualContextSupported = true,
}: AvatarMediaNoticeProps) {
  const { t } = useTranslation()
  const notices: Array<{
    key: string
    icon: 'camera' | 'screen' | 'shield'
    tone: 'info' | 'ready' | 'warning'
    text: string
  }> = []

  if (!capabilities.secureContext) {
    notices.push({
      key: 'secure',
      icon: 'shield',
      tone: 'warning',
      text: t('avatar.secureContextRequired'),
    })
  } else {
    if (!visualContextSupported) {
      notices.push({
        key: 'voice',
        icon: 'camera',
        tone: 'warning',
        text: t('avatar.customVoiceNoVision'),
      })
    }

    if (capabilities.braveMobile) {
      notices.push({
        key: 'brave',
        icon: 'shield',
        tone: 'warning',
        text: t('avatar.braveMobileHint'),
      })
    } else if (visualContextSupported && !capabilities.camera) {
      notices.push({
        key: 'camera',
        icon: 'camera',
        tone: 'warning',
        text: t('avatar.cameraUnavailable'),
      })
    }

    if (visualContextSupported && !capabilities.screenShare) {
      notices.push({
        key: 'screen',
        icon: 'screen',
        tone: 'info',
        text: t('avatar.screenShareUnavailable'),
      })
    }

    if (
      visualContextSupported
      && capabilities.camera
      && capabilities.screenShare
      && !capabilities.braveMobile
    ) {
      notices.push({
        key: 'ready',
        icon: 'camera',
        tone: 'ready',
        text: t('avatar.mediaReady'),
      })
    }
  }

  if (notices.length === 0) return null

  return (
    <div className="avatar-media-notices">
      {notices.map((notice) => {
        const Icon =
          notice.icon === 'camera'
            ? Camera
            : notice.icon === 'screen'
              ? MonitorUp
              : ShieldAlert

        return (
          <div
            key={notice.key}
            className={`avatar-media-notice avatar-media-notice--${notice.tone}`}
          >
            <Icon aria-hidden="true" />
            <span>{notice.text}</span>
          </div>
        )
      })}
    </div>
  )
}

interface AvatarMediaExperienceProps {
  capabilities: AvatarMediaCapabilities
  visualContextSupported?: boolean
}

export function AvatarMediaExperience({
  capabilities,
  visualContextSupported = true,
}: AvatarMediaExperienceProps) {
  const { t } = useTranslation()
  const cameraEnabled = capabilities.camera && visualContextSupported
  const screenShareEnabled =
    capabilities.screenShare && visualContextSupported

  return (
    <>
      <AvatarVideo className="avatar-remote-video" />
      {screenShareEnabled && (
        <ScreenShareVideo className="avatar-screen-preview" />
      )}
      {cameraEnabled && (
        <UserVideo
          className="avatar-local-preview"
          aria-label={t('avatar.yourCamera')}
        />
      )}
      <AvatarMediaStatus cameraExpected={cameraEnabled} />
      <ControlBar
        showCamera={cameraEnabled}
        showScreenShare={screenShareEnabled}
      />
    </>
  )
}

function AvatarMediaStatus({ cameraExpected }: { cameraExpected: boolean }) {
  const { t } = useTranslation()
  const {
    isMicEnabled,
    isCameraEnabled,
    micError,
    cameraError,
    retryMic,
    retryCamera,
  } = useLocalMedia()

  if (micError || cameraError) {
    return (
      <div className="avatar-camera-error" role="alert">
        <ShieldAlert aria-hidden="true" />
        <span>
          {micError ? t('avatar.microphoneError') : t('avatar.cameraError')}
        </span>
        {micError && (
          <button type="button" onClick={() => void retryMic()}>
            <RefreshCw aria-hidden="true" />
            {t('avatar.retryMicrophone')}
          </button>
        )}
        {cameraError && (
          <button type="button" onClick={() => void retryCamera()}>
            <RefreshCw aria-hidden="true" />
            {t('avatar.retryCamera')}
          </button>
        )}
      </div>
    )
  }

  if (!isMicEnabled && !(cameraExpected && isCameraEnabled)) return null

  return (
    <div className="avatar-camera-live" aria-live="polite">
      <span aria-hidden="true" />
      {cameraExpected && isCameraEnabled
        ? t('avatar.mediaPublished')
        : t('avatar.microphoneLive')}
    </div>
  )
}
