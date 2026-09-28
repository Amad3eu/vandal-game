import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/admin/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin/components/ui/table'
import { errorText, type AdminApi, type LogEntry } from '../api'

const ACTIONS: Record<string, string> = {
  'player.rename': 'Trocou apelido',
  'player.clear-nickname': 'Apagou apelido',
  'player.hide': 'Escondeu do placar',
  'player.show': 'Voltou ao placar',
  'run.delete': 'Apagou partida',
  'artist.create': 'Cadastrou artista',
  'artist.update': 'Editou artista',
  'artist.delete': 'Apagou artista',
}

/** A readable summary of what changed (details saved by the server with each action). */
function describe(entry: LogEntry) {
  const d = entry.details ?? {}
  if (entry.action === 'player.rename') return `→ ${d.nickname}`
  if (entry.action === 'player.hide' || entry.action === 'player.show') return String(d.nickname ?? 'Anônimo')
  if (entry.action === 'run.delete') return `${d.score} pontos (${d.mode === 'free' ? 'Livre' : 'Corrida'})`
  if (entry.action.startsWith('artist.')) return `${d.name}${entry.action === 'artist.update' && d.active === false ? ' (inativo)' : ''}`
  return ''
}

/** What each admin did, newest first (last 100 actions). */
export default function LogView({ api }: { api: AdminApi }) {
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    api.log().then(setEntries).catch((e) => setError(errorText(e)))
  }, [api])
  useEffect(load, [load])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro</CardTitle>
        <CardDescription>Cada ação feita neste painel, com o nome de quem fez.</CardDescription>
        <CardAction>
          <Button variant="outline" size="icon" onClick={load} aria-label="Atualizar">
            <RefreshCw />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {entries === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação ainda.</p>
        ) : (
          <Table data-testid="admin-log">
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>O quê</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{entry.admin}</Badge>
                  </TableCell>
                  <TableCell>{ACTIONS[entry.action] ?? entry.action}</TableCell>
                  <TableCell className="text-muted-foreground">{describe(entry)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
