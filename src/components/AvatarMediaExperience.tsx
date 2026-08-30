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
}

export function AvatarMediaNotice({
  capabilities,
}: AvatarMediaNoticeProps) {
  const { t } = useTranslation()

  if (!capabilities.secureContext) {
    return (
      <div className="avatar-media-notice avatar-media-notice--warning">
        <ShieldAlert aria-hidden="true" />
        <span>{t('avatar.secureContextRequired')}</span>
      </div>
    )
  }

  if (capabilities.braveMobile) {
    return (
      <div className="avatar-media-notice avatar-media-notice--warning">
        <ShieldAlert aria-hidden="true" />
        <span>{t('avatar.braveMobileHint')}</span>
      </div>
    )
  }

  if (!capabilities.camera) {
    return (
      <div className="avatar-media-notice avatar-media-notice--warning">
        <Camera aria-hidden="true" />
        <span>{t('avatar.cameraUnavailable')}</span>
      </div>
    )
  }

  if (!capabilities.screenShare) {
    return (
      <div className="avatar-media-notice">
        <MonitorUp aria-hidden="true" />
        <span>{t('avatar.screenShareUnavailable')}</span>
      </div>
    )
  }

  return null
}

interface AvatarMediaExperienceProps {
  capabilities: AvatarMediaCapabilities
}

export function AvatarMediaExperience({
  capabilities,
}: AvatarMediaExperienceProps) {
  const { t } = useTranslation()

  return (
    <>
      <AvatarVideo className="avatar-remote-video" />
      {capabilities.screenShare && (
        <ScreenShareVideo className="avatar-screen-preview" />
      )}
      {capabilities.camera && (
        <UserVideo
          className="avatar-local-preview"
          aria-label={t('avatar.yourCamera')}
        />
      )}
      <AvatarCameraStatus />
      <ControlBar
        showCamera={capabilities.camera}
        showScreenShare={capabilities.screenShare}
      />
    </>
  )
}

function AvatarCameraStatus() {
  const { t } = useTranslation()
  const {
    isCameraEnabled,
    cameraError,
    retryCamera,
  } = useLocalMedia()

  if (cameraError) {
    return (
      <div className="avatar-camera-error" role="alert">
        <Camera aria-hidden="true" />
        <span>{t('avatar.cameraError')}</span>
        <button type="button" onClick={() => void retryCamera()}>
          <RefreshCw aria-hidden="true" />
          {t('avatar.retryCamera')}
        </button>
      </div>
    )
  }

  if (!isCameraEnabled) return null

  return (
    <div className="avatar-camera-live" aria-live="polite">
      <span aria-hidden="true" />
      {t('avatar.cameraLive')}
    </div>
  )
}
