import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { GameMode } from '../types/game'
import { GAME_MODES } from '../data/gameModes'
import { PHASES } from '../data/phases'
import { localTop, type LocalScore } from '../data/scoreBoard'
import { formatDistance } from '../data/routeMap'
import type { LeaderboardRow, OnlineService } from '../online/online'

interface LeaderboardProps {
  /** The global leaderboard, when a server is set up. */
  online: OnlineService | null
  mode: GameMode
  /** Best runs on this device. */
  localBoard: LocalScore[]
}

const formatDate = (date: number) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

/** Scoreboards: this device's best runs, and the global board when a server is set up. */
export default function Leaderboard({ online, mode, localBoard }: LeaderboardProps) {
  const [tab, setTab] = useState<'local' | 'global'>('local')
  return (
    <div className="leaderboard">
      {online && (
        <div className="board-tabs" role="tablist" aria-label="Placar">
          <button type="button" role="tab" aria-selected={tab === 'local'} className={tab === 'local' ? 'active' : ''} onClick={() => setTab('local')}>
            📱 Neste aparelho
          </button>
          <button type="button" role="tab" aria-selected={tab === 'global'} className={tab === 'global' ? 'active' : ''} onClick={() => setTab('global')}>
            🌎 Global
          </button>
        </div>
      )}
      {tab === 'local' || !online ? <LocalBoard mode={mode} board={localBoard} /> : <GlobalBoard online={online} mode={mode} />}
    </div>
  )
}

function LocalBoard({ mode, board }: { mode: GameMode; board: LocalScore[] }) {
  const rows = localTop(board, mode)
  return (
    <>
      <p className="leaderboard-mode">
        {GAME_MODES[mode].icon} {GAME_MODES[mode].title} · suas melhores partidas, guardadas neste aparelho
      </p>
      {rows.length === 0 ? (
        <p className="leaderboard-empty">Jogue uma partida para aparecer aqui.</p>
      ) : (
        <ol className="leaderboard-list" data-testid="local-board">
          {rows.map((row, index) => (
            <li key={`${row.date}-${index}`}>
              <span className="leaderboard-rank">#{index + 1}</span>
              <span className="leaderboard-name">
                {PHASES[row.phase].emoji} fase {row.phase}
                {row.distance ? ` · ${formatDistance(row.distance)}` : ''} · {formatDate(row.date)}
                {row.continued && <span className="board-tag">continuou</span>}
              </span>
              <span className="leaderboard-score">{row.score}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

/** Top 20 of a mode on the server, with this player's row highlighted and a nickname field. */
function GlobalBoard({ online, mode }: { online: OnlineService; mode: GameMode }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [me, setMe] = useState<{ id: string; nickname: string | null } | null>(null)
  const [nickname, setNickname] = useState('')
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    online.leaderboard(mode).then((list) => !cancelled && setRows(list)).catch(() => !cancelled && setRows([]))
    online.me().then((player) => {
      if (cancelled || !player) return
      setMe(player)
      setNickname(player.nickname ?? '')
    })
    return () => {
      cancelled = true
    }
  }, [online, mode, saved])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const name = nickname.trim()
    if (name.length < 2 || name.length > 20) return
    setSaved('saving')
    setSaved((await online.setNickname(name)) ? 'saved' : 'error')
  }

  return (
    <>
      <p className="leaderboard-mode">
        {GAME_MODES[mode].icon} {GAME_MODES[mode].title} · só partidas desde a fase 1, conferidas pelo servidor
      </p>

      {rows === null ? (
        <p className="leaderboard-empty">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="leaderboard-empty">Ninguém no placar ainda. Seja o primeiro!</p>
      ) : (
        <ol className="leaderboard-list" data-testid="leaderboard">
          {rows.map((row) => (
            <li key={row.playerId} className={row.playerId === me?.id ? 'is-me' : ''}>
              <span className="leaderboard-rank">#{row.rank}</span>
              <span className="leaderboard-name">{row.nickname}</span>
              <span className="leaderboard-score">{row.score}</span>
            </li>
          ))}
        </ol>
      )}

      <form className="nickname-form" onSubmit={save}>
        <label htmlFor="nickname">Seu apelido no placar</label>
        <div className="nickname-row">
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setSaved('idle')
            }}
            minLength={2}
            maxLength={20}
            placeholder="ex.: Vandal_SP"
            autoComplete="nickname"
          />
          <button type="submit" className="sticker-btn is-small is-yellow" disabled={saved === 'saving'}>
            {saved === 'saved' ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
        {saved === 'error' && <p className="nickname-error">Não deu para salvar agora. Tente de novo.</p>}
      </form>
    </>
  )
}
