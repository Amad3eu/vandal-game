import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, History, Pencil, RefreshCw, Trash2 } from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin/components/ui/table'
import { errorText, type AdminApi, type AdminPlayer, type AdminRun } from '../api'

type Mode = 'runner' | 'free'
const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const shortId = (id: string) => id.slice(0, 8)

/** Global leaderboard moderation: rename, hide from the board, delete runs. */
export default function PlayersView({ api }: { api: AdminApi }) {
  const [mode, setMode] = useState<Mode>('runner')
  const [players, setPlayers] = useState<AdminPlayer[] | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [renaming, setRenaming] = useState<AdminPlayer | null>(null)
  const [runsOf, setRunsOf] = useState<AdminPlayer | null>(null)

  const load = useCallback(() => {
    setPlayers(null)
    api
      .players(mode)
      .then(setPlayers)
      .catch((e) => {
        setPlayers([])
        setMessage({ text: errorText(e), error: true })
      })
  }, [api, mode])

  useEffect(load, [load])

  const act = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action()
      setMessage({ text: done })
      load()
    } catch (e) {
      setMessage({ text: errorText(e), error: true })
    }
  }

  let rank = 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>Placar global</CardTitle>
        <CardDescription>
          Jogadores com partidas conferidas pelo servidor. Esconder tira do placar sem impedir de jogar; toda ação fica no Registro.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <SelectTrigger className="w-32" aria-label="Modo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="runner">🏃 Corrida</SelectItem>
              <SelectItem value="free">🕹️ Livre</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Atualizar">
            <RefreshCw />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {message && (
          <p role="status" className={`text-sm ${message.error ? 'text-destructive' : 'text-spray-green'}`}>
            {message.text}
          </p>
        )}
        {players === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém jogou este modo ainda.</p>
        ) : (
          <Table data-testid="admin-players">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead className="text-right">Melhor</TableHead>
                <TableHead className="text-right">Partidas</TableHead>
                <TableHead>Última</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id} className={player.hidden ? 'opacity-60' : ''}>
                  <TableCell>{player.hidden ? '—' : `#${++rank}`}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{player.nickname ?? 'Anônimo'}</span>
                      <span className="font-mono text-xs text-muted-foreground">{shortId(player.id)}</span>
                      {player.hidden && <Badge variant="destructive">escondido</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{player.best}</TableCell>
                  <TableCell className="text-right">{player.runs}</TableCell>
                  <TableCell className="text-muted-foreground">{dateTime(player.lastRunAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setRenaming(player)} aria-label={`Renomear ${player.nickname ?? 'Anônimo'}`}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setRunsOf(player)} aria-label={`Partidas de ${player.nickname ?? 'Anônimo'}`}>
                        <History />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={player.hidden ? 'Mostrar no placar' : 'Esconder do placar'}
                        onClick={() =>
                          act(() => api.updatePlayer(player.id, { hidden: !player.hidden }), player.hidden ? 'Voltou para o placar.' : 'Escondido do placar.')
                        }
                      >
                        {player.hidden ? <Eye /> : <EyeOff />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <RenameDialog
        player={renaming}
        onClose={() => setRenaming(null)}
        onSave={(nickname) => act(() => api.updatePlayer(renaming!.id, { nickname }), nickname ? 'Apelido trocado.' : 'Apelido apagado.')}
      />
      <RunsDialog
        api={api}
        player={runsOf}
        onClose={() => setRunsOf(null)}
        onDeleted={() => {
          setMessage({ text: 'Partida apagada.' })
          load()
        }}
      />
    </Card>
  )
}

function RenameDialog({ player, onClose, onSave }: { player: AdminPlayer | null; onClose: () => void; onSave: (nickname: string | null) => Promise<void> }) {
  const [value, setValue] = useState('')
  useEffect(() => setValue(player?.nickname ?? ''), [player])
  const save = async (nickname: string | null) => {
    await onSave(nickname)
    onClose()
  }
  return (
    <Dialog open={player !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar apelido</DialogTitle>
          <DialogDescription>Para apelidos ofensivos ou que se passam por outra pessoa. O jogador pode trocar de novo depois.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rename">Apelido</Label>
          <Input id="rename" value={value} maxLength={20} onChange={(event) => setValue(event.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => save(null)}>
            Apagar apelido
          </Button>
          <Button onClick={() => save(value.trim())} disabled={value.trim().length < 2}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RunsDialog({ api, player, onClose, onDeleted }: { api: AdminApi; player: AdminPlayer | null; onClose: () => void; onDeleted: () => void }) {
  const [runs, setRuns] = useState<AdminRun[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!player) return
    setRuns(null)
    api.playerRuns(player.id).then(setRuns).catch((e) => setError(errorText(e)))
  }, [api, player])
  useEffect(load, [load])

  const remove = async (run: AdminRun) => {
    try {
      await api.deleteRun(run.id)
      onDeleted()
      load()
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <Dialog
      open={player !== null}
      onOpenChange={(open) => {
        if (open) return
        setError(null)
        onClose()
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Partidas de {player?.nickname ?? 'Anônimo'}</DialogTitle>
          <DialogDescription>As últimas 100, nos dois modos. Apague uma partida suspeita para ela sair do placar.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {runs === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma partida.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{dateTime(run.createdAt)}</TableCell>
                    <TableCell>{run.mode === 'runner' ? 'Corrida' : 'Livre'}</TableCell>
                    <TableCell className="text-right font-mono">{run.score}</TableCell>
                    <TableCell className="text-right">{run.seconds}s</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Apagar partida">
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar esta partida?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {run.score} pontos em {dateTime(run.createdAt)}. Ela sai do placar e não dá para desfazer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(run)}>Apagar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
