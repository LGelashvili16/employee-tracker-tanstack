import { Checkbox } from '#/components/ui/checkbox'
import { IconChevronDown } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Field, FieldLabel, FieldSet, FieldLegend } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  hasPermission,
  permissionSchema,
  roleLabels,
  roleSchema,
} from '#/lib/authorization/permissions'
import { permissionLabels } from '../admin-access.content'
import type { PermissionOverrides, Role } from '#/lib/authorization/permissions'

export function AccountRoleFields({
  value,
  onChange,
  owner,
  disabled,
  invalid,
}: {
  value: Array<Role>
  onChange: (value: Array<Role>) => void
  owner: boolean
  disabled: boolean
  invalid: boolean
}) {
  return (
    <FieldSet
      aria-invalid={invalid}
      aria-describedby="admin-roles-error"
      data-invalid={invalid}
    >
      <FieldLegend>
        როლები <span aria-hidden="true">*</span>
      </FieldLegend>
      <div className="grid gap-3 sm:grid-cols-2">
        {roleSchema.options.map((role) => (
          <Field key={role} orientation="horizontal">
            <Checkbox
              id={`role-${role}`}
              checked={value.includes(role)}
              disabled={disabled || (role === 'owner' && !owner)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...value, role]
                    : value.filter((item) => item !== role),
                )
              }
            />
            <FieldLabel htmlFor={`role-${role}`}>{roleLabels[role]}</FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  )
}
export function AccountPermissionFields({
  roles,
  value,
  onChange,
  disabled,
  invalid,
}: {
  roles: Array<Role>
  value: PermissionOverrides
  onChange: (value: PermissionOverrides) => void
  disabled: boolean
  invalid: boolean
}) {
  return (
    <Collapsible
      defaultOpen={value.allow.length > 0 || value.deny.length > 0 || invalid}
      className="flex min-w-0 flex-col gap-4"
    >
      <CollapsibleTrigger
        render={<Button type="button" variant="outline" depth="raised" />}
        className="group w-fit max-w-full"
      >
        ინდივიდუალური უფლებები ({value.allow.length + value.deny.length})
        <IconChevronDown
          className="size-4 group-data-panel-open:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <FieldSet
          data-invalid={invalid}
          aria-describedby="admin-permissions-error"
        >
          <FieldLegend className="sr-only">ინდივიდუალური უფლებები</FieldLegend>
          <p className="text-sm text-muted-foreground">
            როლის წესის შეცვლა მოქმედებს მხოლოდ ამ ანგარიშზე. აკრძალვას
            უპირატესობა აქვს.
          </p>
          <div className="flex flex-col gap-3">
            {permissionSchema.options.map((permission) => {
              const selected = value.deny.includes(permission)
                ? 'deny'
                : value.allow.includes(permission)
                  ? 'allow'
                  : 'inherit'
              const choices = [
                {
                  value: 'inherit',
                  label: `როლიდან: ${hasPermission(roles, permission) ? 'დაშვებულია' : 'აკრძალულია'}`,
                },
                { value: 'allow', label: 'დაშვება' },
                { value: 'deny', label: 'აკრძალვა' },
              ]
              return (
                <Field
                  key={permission}
                  className="sm:grid sm:grid-cols-[1fr_14rem] sm:items-center"
                >
                  <FieldLabel htmlFor={`permission-${permission}`}>
                    {permissionLabels[permission]}
                  </FieldLabel>
                  <Select
                    value={selected}
                    items={choices}
                    disabled={disabled}
                    onValueChange={(choice) => {
                      if (
                        choice !== 'allow' &&
                        choice !== 'deny' &&
                        choice !== 'inherit'
                      )
                        return
                      const next = {
                        allow: value.allow.filter(
                          (item) => item !== permission,
                        ),
                        deny: value.deny.filter((item) => item !== permission),
                      }
                      if (choice !== 'inherit') next[choice].push(permission)
                      onChange(next)
                    }}
                  >
                    <SelectTrigger
                      id={`permission-${permission}`}
                      className="w-full shadow-control-raised active:shadow-control-pressed"
                      aria-invalid={invalid}
                      aria-describedby="admin-permissions-error"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {choices.map((choice) => (
                          <SelectItem key={choice.value} value={choice.value}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )
            })}
          </div>
        </FieldSet>
      </CollapsibleContent>
    </Collapsible>
  )
}
