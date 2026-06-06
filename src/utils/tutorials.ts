/**
 * Skill slugs that have a real `/learn/<slug>-integration` tutorial page
 * (see the `tutorials` registry in src/pages/TutorialPage.tsx).
 *
 * Agent skill cards link to `/learn/<slug>-integration`, but only the slugs
 * below actually resolve — every other slug rendered a "View tutorial" link
 * that 404'd. Gate those links with `hasIntegrationTutorial()` so we never
 * surface a dead link, and add slugs here as new tutorials ship.
 */
export const INTEGRATION_TUTORIAL_SLUGS = new Set<string>([
  'elevenlabs',
])

export function hasIntegrationTutorial(slug?: string | null): boolean {
  return !!slug && INTEGRATION_TUTORIAL_SLUGS.has(slug.toLowerCase())
}
