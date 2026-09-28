import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { AtSign, ImageUp, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/admin/components/ui/alert-dialog'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/admin/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/admin/components/ui/dialog'
import { Input } from '@/admin/components/ui/input'
import { Label } from '@/admin/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/admin/components/ui/select'
import { Switch } from '@/admin/components/ui/switch'
import { Textarea } from '@/admin/components/ui/textarea'
import { PHASES } from '@/data/phases'
import { errorText, type AdminApi, type Artist, type ArtistForm, type ArtistKind } from '../api'

const KINDS: Record<ArtistKind, string> = { graffiti: 'Grafite', dj: 'DJ', mc: 'MC', breaking: 'Breaking' }
const MAX_SIGNATURE_BYTES = 300 * 1024
const EMPTY: ArtistForm = { name: '', kind: 'graffiti', city: null, bio: null, instagram: null, color: '#ff4d9d', signature: null, minScore: 0, phase: 1, active: true }
const formOf = ({ id: _id, updatedAt: _updatedAt, ...form }: Artist): ArtistForm => form

/**
 * Real graffiti artists, DJs, MCs and b-boys/b-girls, with the phase and score where the game
 * will show them. For now the list is kept here; the game starts using it in the next stage.
 */
export default function ArtistsView({ api }: { api: AdminApi }) {
  const [artists, setArtists] = useState<Artist[] | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [editing, setEditing] = useState<{ id: string | null; form: ArtistForm } | null>(null)

  const load = useCallback(() => {
    api
      .artists()
      .then(setArtists)
      .catch((e) => {
        setArtists([])
        setMessage({ text: errorText(e), error: true })
      })
  }, [api])
  useEffect(load, [load])

  const save = async (id: string | null, form: ArtistForm) => {
    try {
      if (id) await api.updateArtist(id, form)
      else await api.createArtist(form)
      setMessage({ text: id ? `${form.name} atualizado.` : `${form.name} cadastrado.` })
      setEditing(null)
      load()
    } catch (e) {
      // The dialog stays open so nothing typed is lost.
      return errorText(e)
    }
    return null
  }

  const remove = async (artist: Artist) => {
    try {
      await api.deleteArtist(artist.id)
      setMessage({ text: `${artist.name} apagado.` })
      load()
    } catch (e) {
      setMessage({ text: errorText(e), error: true })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grafiteiros & DJs</CardTitle>
        <CardDescription>
          Artistas reais da cultura hip-hop. Cada um tem a fase e a pontuação a partir das quais o jogo pode mostrá-lo. Só os ativos aparecem para os
          jogadores.
        </CardDescription>
        <CardAction>
          <Button onClick={() => setEditing({ id: null, form: EMPTY })}>
            <Plus /> Novo artista
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message && (
          <p role="status" className={`text-sm ${message.error ? 'text-destructive' : 'text-spray-green'}`}>
            {message.text}
          </p>
        )}
        {artists === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : artists.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum artista cadastrado ainda. Comece pelo botão "Novo artista".</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-artists">
            {artists.map((artist) => (
              <Card key={artist.id} className={`gap-3 py-4 ${artist.active ? '' : 'opacity-60'}`} style={{ borderTop: `4px solid ${artist.color}` }}>
                <CardContent className="flex flex-col gap-3 px-4">
                  <div className="flex h-20 items-center justify-center overflow-hidden rounded-md bg-white">
                    {artist.signature ? (
                      <img src={artist.signature} alt={`Assinatura de ${artist.name}`} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-500">sem assinatura</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{artist.name}</span>
                    <Badge variant="secondary">{KINDS[artist.kind]}</Badge>
                    {!artist.active && <Badge variant="outline">inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {PHASES[artist.phase].emoji} Fase {artist.phase} · {PHASES[artist.phase].name} · a partir de {artist.minScore} pontos
                  </p>
                  {(artist.city || artist.instagram) && (
                    <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {artist.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" /> {artist.city}
                        </span>
                      )}
                      {artist.instagram && (
                        <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                          <AtSign className="size-3" />
                          {artist.instagram}
                        </a>
                      )}
                    </p>
                  )}
                  {artist.bio && <p className="text-sm">{artist.bio}</p>}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={artist.active}
                        onCheckedChange={(active) => save(artist.id, { ...formOf(artist), active }).then((error) => error && setMessage({ text: error, error: true }))}
                        aria-label={`${artist.name} ativo`}
                      />
                      Ativo
                    </label>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ id: artist.id, form: formOf(artist) })} aria-label={`Editar ${artist.name}`}>
                        <Pencil />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Apagar ${artist.name}`}>
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar {artist.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Para só tirar do jogo por um tempo, desligue "Ativo". Apagar não dá para desfazer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(artist)}>Apagar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {editing && <ArtistDialog initial={editing.form} isNew={editing.id === null} onClose={() => setEditing(null)} onSave={(form) => save(editing.id, form)} />}
    </Card>
  )
}

function ArtistDialog({
  initial,
  isNew,
  onClose,
  onSave,
}: {
  initial: ArtistForm
  isNew: boolean
  onClose: () => void
  onSave: (form: ArtistForm) => Promise<string | null>
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ArtistForm>(key: K, value: ArtistForm[K]) => setForm((current) => ({ ...current, [key]: value }))
  const text = (value: string) => (value.trim() ? value : null)

  const pickSignature = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type)) return setError('A assinatura precisa ser PNG, WebP ou JPEG.')
    if (file.size > MAX_SIGNATURE_BYTES) return setError('A assinatura precisa ter até 300 KB.')
    const reader = new FileReader()
    reader.onload = () => {
      setError(null)
      set('signature', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    setSaving(true)
    setError(await onSave(form))
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo artista' : `Editar ${initial.name}`}</DialogTitle>
          <DialogDescription>Confira com o artista antes de publicar o nome, a bio e a assinatura dele.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="artist-name">Nome</Label>
            <Input id="artist-name" value={form.name} maxLength={40} onChange={(e) => set('name', e.target.value)} placeholder="ex.: Nina Pixo" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select value={form.kind} onValueChange={(value) => set('kind', value as ArtistKind)}>
              <SelectTrigger className="w-full" aria-label="Tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KINDS) as ArtistKind[]).map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {KINDS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="artist-city">Cidade</Label>
            <Input id="artist-city" value={form.city ?? ''} maxLength={40} onChange={(e) => set('city', text(e.target.value))} placeholder="ex.: São Paulo" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="artist-instagram">Instagram</Label>
            <Input
              id="artist-instagram"
              value={form.instagram ?? ''}
              maxLength={31}
              onChange={(e) => set('instagram', text(e.target.value))}
              placeholder="@usuario"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="artist-color">Cor</Label>
            <div className="flex gap-2">
              <input
                id="artist-color"
                type="color"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
              />
              <Input value={form.color} maxLength={7} onChange={(e) => set('color', e.target.value)} aria-label="Cor em hexadecimal" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="artist-bio">Bio</Label>
            <Textarea id="artist-bio" value={form.bio ?? ''} maxLength={280} onChange={(e) => set('bio', text(e.target.value))} placeholder="O que o jogador lê no encontro" />
            <span className="text-right text-xs text-muted-foreground">{(form.bio ?? '').length}/280</span>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Aparece a partir da fase</Label>
            <Select value={String(form.phase)} onValueChange={(value) => set('phase', Number(value) as 1 | 2 | 3)}>
              <SelectTrigger className="w-full" aria-label="Fase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([1, 2, 3] as const).map((phase) => (
                  <SelectItem key={phase} value={String(phase)}>
                    {PHASES[phase].emoji} {phase} · {PHASES[phase].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="artist-score">E a partir de quantos pontos</Label>
            <Input
              id="artist-score"
              type="number"
              min={0}
              step={100}
              value={form.minScore}
              onChange={(e) => set('minScore', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Assinatura (PNG, WebP ou JPEG, até 300 KB)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 flex-1 items-center justify-center overflow-hidden rounded-md bg-white">
                {form.signature ? (
                  <img src={form.signature} alt="Assinatura" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-neutral-500">sem assinatura</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <ImageUp /> Escolher
                    <input type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" onChange={pickSignature} data-testid="signature-file" />
                  </label>
                </Button>
                {form.signature && (
                  <Button variant="ghost" size="sm" onClick={() => set('signature', null)}>
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={form.active} onCheckedChange={(active) => set('active', active)} /> Ativo (aparece para os jogadores)
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || form.name.trim().length < 2}>
            {saving ? 'Salvando…' : isNew ? 'Cadastrar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
