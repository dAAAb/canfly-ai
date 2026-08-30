import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../i18n'
import {
  setSkipBoardingPreference,
  shouldSkipBoarding,
} from '../utils/boardingPreference'
import BoardingPreferenceToggle from './BoardingPreferenceToggle'

describe('BoardingPreferenceToggle', () => {
  beforeEach(() => {
    setSkipBoardingPreference(false)
  })

  afterEach(() => {
    setSkipBoardingPreference(false)
  })

  it('persists the switch and synchronizes duplicate controls', () => {
    render(
      <>
        <BoardingPreferenceToggle />
        <BoardingPreferenceToggle compact />
      </>,
    )

    const switches = screen.getAllByRole('checkbox', {
      name: 'Skip boarding next time',
    })

    expect(switches).toHaveLength(2)
    expect(switches[0]).not.toBeChecked()
    expect(switches[1]).not.toBeChecked()

    fireEvent.click(switches[0])

    expect(shouldSkipBoarding()).toBe(true)
    expect(switches[0]).toBeChecked()
    expect(switches[1]).toBeChecked()
  })
})
