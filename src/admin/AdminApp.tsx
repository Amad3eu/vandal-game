import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { KeyRound, LogOut, Map as MapIcon, Palette, ScrollText, Trophy } from 'lucide-react'
import { Button } from '@/admin/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/admin/components/ui/card'
import { Input } from '@/admin/components/ui/input'
import { Label } from '@/admin/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/admin/components/ui/tabs'
import { SERVER_URL, createAdminApi, errorText } from './api'
import ArtistsView from './views/ArtistsView'
import LogView from './views/LogView'
import PlayersView from './views/PlayersView'
import RoadmapView from './views/RoadmapView'

/** The key stays in this tab only (sessionStorage): closing the tab signs out. */
const KEY_STORAGE = 'vandalAdminKey'

function readKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE)
  } catch {
    return null
  }
}

function writeKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key)
    else sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    // blocked storage: the admin signs in again on reload
  }
}

/**
 * Admin page (/admin): the roadmap, leaderboard moderation, the real artists and DJs, and the log
 * of what each admin did. Everything is behind an admin key checked by the leaderboard server.
 */
export default function AdminApp() {
  const [key, setKey] = useState<string | null>(readKey)
  const [admin, setAdmin] = useState<string | null>(null)
  const [checking, setChecking] = useState(Boolean(key))
  const [error, setError] = useState<string | null>(null)
  const api = useMemo(() => (key ? createAdminApi(key) : null), [key])

  useEffect(() => {
    if (!api) return
    let cancelled = false
    setChecking(true)
    api
      .me()
      .then(({ name }) => !cancelled && setAdmin(name))
      .catch((e) => {
        if (cancelled) return
        setError(errorText(e))
        setKey(null)
        writeKey(null)
      })
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [api])

  const signIn = (value: string) => {
    setError(null)
    writeKey(value)
    setKey(value)
  }

  const signOut = () => {
    writeKey(null)
    setKey(null)
    setAdmin(null)
  }

  if (!api || !admin) return <Login onSubmit={signIn} checking={checking} error={error} />

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide">
            <span className="text-spray-pink">Vandal</span> <span className="text-spray-yellow">Game</span>{' '}
            <span className="text-muted-foreground">· admin</span>
          </h1>
          <p className="text-sm text-muted-foreground">Roadmap, placar global e artistas do jogo</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground" data-testid="admin-name">
            Entrou como <strong className="text-foreground">{admin}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut /> Sair
          </Button>
        </div>
      </header>

      <Tabs defaultValue="roadmap" className="gap-4">
        <TabsList className="grid w-full grid-cols-2 group-data-[orientation=horizontal]/tabs:h-auto sm:flex sm:w-fit sm:group-data-[orientation=horizontal]/tabs:h-9">
          <TabsTrigger value="roadmap">
            <MapIcon /> Roadmap
          </TabsTrigger>
          <TabsTrigger value="players">
            <Trophy /> Placar
          </TabsTrigger>
          <TabsTrigger value="artists">
            <Palette /> Grafiteiros & DJs
          </TabsTrigger>
          <TabsTrigger value="log">
            <ScrollText /> Registro
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roadmap">
          <RoadmapView />
        </TabsContent>
        <TabsContent value="players">
          <PlayersView api={api} />
        </TabsContent>
        <TabsContent value="artists">
          <ArtistsView api={api} />
        </TabsContent>
        <TabsContent value="log">
          <LogView api={api} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Login({ onSubmit, checking, error }: { onSubmit: (key: string) => void; checking: boolean; error: string | null }) {
  const [value, setValue] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-wide">
            <span className="text-spray-pink">Vandal</span> <span className="text-spray-yellow">Game</span> · admin
          </CardTitle>
          <CardDescription>Área do time: roadmap, placar e artistas. Entre com a sua chave de admin.</CardDescription>
        </CardHeader>
        <CardContent>
          {SERVER_URL ? (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Label htmlFor="admin-key">Chave de admin</Label>
              <Input
                id="admin-key"
                type="password"
                autoComplete="current-password"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="cole aqui a sua chave"
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={checking || !value.trim()}>
                <KeyRound /> {checking ? 'Conferindo…' : 'Entrar'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              O servidor do placar não está configurado neste build (<code>VITE_LEADERBOARD_URL</code>).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
