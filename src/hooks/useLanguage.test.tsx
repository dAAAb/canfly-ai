import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n, { loadLanguage } from '../i18n'
import { useLanguage } from './useLanguage'

function SharedLayoutProbe() {
  const { currentLang, localePath } = useLanguage()
  return <output>{`${currentLang}|${localePath('/apps')}`}</output>
}

describe('useLanguage', () => {
  it('uses the URL prefix when rendered outside a matched route', async () => {
    await loadLanguage('zh-TW')
    await i18n.changeLanguage('en')

    const { unmount } = render(
      <MemoryRouter initialEntries={['/zh-tw']}>
        <SharedLayoutProbe />
      </MemoryRouter>,
    )

    expect(screen.getByText('zh-TW|/zh-tw/apps')).toBeInTheDocument()
    await waitFor(() => expect(i18n.language).toBe('zh-TW'))

    unmount()
    await i18n.changeLanguage('en')
  })
})
