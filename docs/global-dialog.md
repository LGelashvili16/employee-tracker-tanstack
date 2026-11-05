# Global dialog

`AppProviders` mounts `ModalProvider` in the root document. Providers live in
`src/providers`, context definitions in `src/contexts`, and consumer hooks in
`src/hooks`. React components throughout the application can use the dialog actions:

```tsx
import type { ReactNode } from 'react'
import { useModal } from '#/hooks/use-modal'
import { Button } from '#/components/ui/button'

function HelpContent({ children }: { children: ReactNode }) {
  const { closeModal } = useModal()
  return (
    <div className="flex flex-col gap-4">
      {children}
      <Button onClick={closeModal}>დახურვა</Button>
    </div>
  )
}

function HelpButton() {
  const { openModal } = useModal()

  return (
    <Button
      onClick={() =>
        openModal(
          <HelpContent>
            <p>დახმარებისთვის მიმართეთ ადმინისტრატორს.</p>
          </HelpContent>,
          {
            title: 'დახმარება',
            description: 'სამუშაო სივრცის გამოყენება',
            size: 'default',
          },
        )
      }
    >
      დახმარება
    </Button>
  )
}
```

The title is required and supplies the accessible dialog name. Description and
size are optional; size defaults to `default`, with `wide` available for larger
content. The provider supplies the dialog shell and header. Pass the body rather
than another `DialogContent` or `DialogTitle`.

For an in-flight mutation, supply `canClose: () => !submitting.current` using a
caller-owned ref. All dismissals, including `closeModal()`, respect this guard.
Reset the ref before closing after success and in `finally` after failure. The
dialog body must also disable repeat submission and show the pending spinner.

Call `closeModal()` from dialog content after a successful action. Escape,
outside presses, and the close button also dismiss the dialog. Opening another
dialog replaces the current content and resets its local state. Closed content
is released after Base UI finishes the exit animation.

The dialog is rendered at the root and inherits root providers. Context providers
local to the calling feature do not wrap its content. Passed JSX captures its
props when opened; dialog bodies should read changing server data through Query
and manage form state themselves. Existing feature dialogs can remain local.
Authorization and Zod validation remain the responsibility of the owning feature.
