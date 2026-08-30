import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../i18n'
import {
  AvatarMediaExperience,
  AvatarMediaNotice,
} from './AvatarMediaExperience'

vi.mock('@runwayml/avatars-react', () => ({
  AvatarVideo: () => <div data-testid="avatar-video" />,
  UserVideo: () => <div data-testid="user-video" />,
  ScreenShareVideo: () => <div data-testid="screen-share-video" />,
  ControlBar: ({
    showCamera,
    showScreenShare,
  }: {
    showCamera: boolean
    showScreenShare: boolean
  }) => (
    <div
      data-testid="control-bar"
      data-camera={showCamera}
      data-screen-share={showScreenShare}
    />
  ),
  useLocalMedia: () => ({
    isCameraEnabled: true,
    cameraError: null,
    retryCamera: vi.fn(),
  }),
}))

describe('AvatarMediaExperience', () => {
  it('renders camera preview and screen-share controls when supported', () => {
    render(
      <AvatarMediaExperience
        capabilities={{
          camera: true,
          screenShare: true,
          braveMobile: false,
          secureContext: true,
        }}
      />,
    )

    expect(screen.getByTestId('avatar-video')).toBeInTheDocument()
    expect(screen.getByTestId('user-video')).toBeInTheDocument()
    expect(screen.getByTestId('screen-share-video')).toBeInTheDocument()
    expect(screen.getByTestId('control-bar')).toHaveAttribute('data-camera', 'true')
    expect(screen.getByTestId('control-bar')).toHaveAttribute(
      'data-screen-share',
      'true',
    )
    expect(
      screen.getByText('Camera is on — LittleLobster can see this feed.'),
    ).toBeInTheDocument()
  })

  it('explains Brave mobile limitations without disabling camera', () => {
    render(
      <AvatarMediaNotice
        capabilities={{
          camera: true,
          screenShare: false,
          braveMobile: true,
          secureContext: true,
        }}
      />,
    )

    expect(screen.getByText(/Brave mobile may block live camera playback/)).toBeInTheDocument()
  })

  it('confirms camera vision and screen sharing on supported browsers', () => {
    render(
      <AvatarMediaNotice
        capabilities={{
          camera: true,
          screenShare: true,
          braveMobile: false,
          secureContext: true,
        }}
      />,
    )

    expect(
      screen.getByText('Camera vision and screen sharing are available in this browser.'),
    ).toBeInTheDocument()
  })

  it('hides screen sharing when the browser does not expose it', () => {
    render(
      <AvatarMediaExperience
        capabilities={{
          camera: true,
          screenShare: false,
          braveMobile: false,
          secureContext: true,
        }}
      />,
    )

    expect(screen.queryByTestId('screen-share-video')).not.toBeInTheDocument()
    expect(screen.getByTestId('control-bar')).toHaveAttribute(
      'data-screen-share',
      'false',
    )
  })
})
