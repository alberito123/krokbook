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
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
    <div className="min-h-[100dvh] bg-zinc-50 px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 md:gap-8">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                <Swords className="h-3.5 w-3.5" />
                Battle Mode
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
                  Create your battle identity once and use it for live matches.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-zinc-500 md:text-base">
                  Battle is isolated from your study notes and progress. Pick a nickname, set a PIN,
                  and challenge online students with the same timed question set.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 md:min-w-[260px]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Mode</p>
                <p className="mt-2 font-medium text-zinc-900">Live 1v1</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Question source</p>
                <p className="mt-2 font-medium text-zinc-900">Main folders</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Winner</p>
                <p className="mt-2 font-medium text-zinc-900">Most correct</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Tie</p>
                <p className="mt-2 font-medium text-zinc-900">Draw</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create profile</TabsTrigger>
              <TabsTrigger value="login">Sign in</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <BattlePanel
                title="Create battle profile"
                description="You do this once. Later you use the same nickname and PIN to enter Battle."
                nickname={nickname}
                pin={pin}
                isLoading={isLoading}
                submitLabel="Create profile"
                onNicknameChange={setNickname}
                onPinChange={setPin}
                onSubmit={submitCreate}
              />
            </TabsContent>

            <TabsContent value="login">
              <BattlePanel
                title="Sign in"
                description="Use the battle nickname and PIN you already created."
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
    </div>
  )
}
