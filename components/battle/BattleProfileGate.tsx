'use client'

import * as React from 'react'
import { Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BattleProfileGateProps {
  rememberedNickname: string
  error: string | null
  isLoading: boolean
  onCreateProfile: (credentials: { nickname: string; pin: string }) => Promise<void>
  onLogin: (credentials: { nickname: string; pin: string }) => Promise<void>
}

function BattlePanel({
  title,
  description,
  nickname,
  pin,
  isLoading,
  submitLabel,
  onNicknameChange,
  onPinChange,
  onSubmit,
}: {
  title: string
  description: string
  nickname: string
  pin: string
  isLoading: boolean
  submitLabel: string
  onNicknameChange: (value: string) => void
  onPinChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${title}-nickname`}>Nickname</Label>
          <Input
            id={`${title}-nickname`}
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder="For example: petro.iv"
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${title}-pin`}>PIN</Label>
          <Input
            id={`${title}-pin`}
            type="password"
            value={pin}
            onChange={(event) => onPinChange(event.target.value)}
            placeholder="At least 4 characters"
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && nickname.trim() && pin.trim()) {
                onSubmit()
              }
            }}
          />
        </div>

        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={isLoading || !nickname.trim() || !pin.trim()}
        >
          {isLoading ? 'Please wait...' : submitLabel}
        </Button>
      </div>
    </div>
  )
}

export function BattleProfileGate({
  rememberedNickname,
  error,
  isLoading,
  onCreateProfile,
  onLogin,
}: BattleProfileGateProps) {
  const [nickname, setNickname] = React.useState(rememberedNickname)
  const [pin, setPin] = React.useState('')
  const defaultTab = rememberedNickname ? 'login' : 'create'

  React.useEffect(() => {
    setNickname(rememberedNickname)
  }, [rememberedNickname])

  const submitCreate = React.useCallback(async () => {
    await onCreateProfile({ nickname, pin })
    setPin('')
  }, [nickname, onCreateProfile, pin])

  const submitLogin = React.useCallback(async () => {
    await onLogin({ nickname, pin })
    setPin('')
  }, [nickname, onLogin, pin])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            <Swords className="h-3.5 w-3.5" />
            Battle
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
              Enter Battle with a separate nickname and PIN.
            </h1>
            <p className="text-sm leading-6 text-zinc-500">
              Battle stays isolated from notes, progress, and study history. Create a profile once,
              then sign in with the same credentials on any device.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create profile</TabsTrigger>
            <TabsTrigger value="login">Sign in</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <BattlePanel
              title="Create battle profile"
              description="Do this once, then reuse the same nickname and PIN every time you enter Battle."
              nickname={nickname}
              pin={pin}
              isLoading={isLoading}
              submitLabel="Create profile"
              onNicknameChange={setNickname}
              onPinChange={setPin}
              onSubmit={submitCreate}
            />
          </TabsContent>

          <TabsContent value="login" className="mt-4">
            <BattlePanel
              title="Sign in"
              description="Use an existing battle nickname and PIN."
              nickname={nickname}
              pin={pin}
              isLoading={isLoading}
              submitLabel="Enter Battle"
              onNicknameChange={setNickname}
              onPinChange={setPin}
              onSubmit={submitLogin}
            />
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
