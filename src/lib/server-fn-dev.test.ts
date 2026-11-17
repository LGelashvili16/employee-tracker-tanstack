// @vitest-environment node
import { createServer } from 'vite'
import { expect, test } from 'vitest'

test('cold server function IDs resolve while unknown exports remain invalid', async () => {
  const server = await createServer({ server: { middlewareMode: true } })
  const validate = (feature: string, name: string) => {
    const id = Buffer.from(
      JSON.stringify({
        file: `/src/features/${feature}/${feature}.functions.ts?tss-serverfn-split`,
        export: `${name}_createServerFn_handler`,
      }),
    ).toString('base64url')

    return server.environments.ssr.transformRequest(
      `\0virtual:tanstack-start-validate-server-fn-id?id=${id}`,
    )
  }

  try {
    await expect(
      validate('notifications', 'getOwnNotifications'),
    ).resolves.toBeTruthy()
    await expect(
      validate('attendance', 'readMyAttendance'),
    ).resolves.toBeTruthy()
    await expect(validate('notifications', 'unknownFunction')).rejects.toThrow(
      'Invalid server function ID:',
    )
  } finally {
    await server.close()
  }
}, 30_000)
