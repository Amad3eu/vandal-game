import { CheckCircle2, CircleDashed, ExternalLink, Lightbulb, Loader } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/admin/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/admin/components/ui/card'
import { Progress } from '@/admin/components/ui/progress'
import { DECISIONS, PHASES, REPO_URL, ROADMAP_UPDATED, VISION, type RoadmapItem, type Status } from '../roadmap'

const STATUS: Record<Status, { label: string; icon: ReactNode; className: string }> = {
  feito: { label: 'Feito', icon: <CheckCircle2 />, className: 'border-spray-green/40 bg-spray-green/15 text-spray-green' },
  andamento: { label: 'Em andamento', icon: <Loader />, className: 'border-spray-yellow/40 bg-spray-yellow/15 text-spray-yellow' },
  proximo: { label: 'Próximo', icon: <CircleDashed />, className: 'border-spray-cyan/40 bg-spray-cyan/15 text-spray-cyan' },
  ideia: { label: 'Ideia', icon: <Lightbulb />, className: 'border-border bg-secondary text-muted-foreground' },
}

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const done = (items: RoadmapItem[]) => items.filter((item) => item.status === 'feito').length

function StatusBadge({ status }: { status: Status }) {
  const { label, icon, className } = STATUS[status]
  return (
    <Badge variant="outline" className={className}>
      {icon}
      {label}
    </Badge>
  )
}

function PrLink({ pr }: { pr: number }) {
  return (
    <a href={`${REPO_URL}/pull/${pr}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      #{pr} <ExternalLink className="size-3" />
    </a>
  )
}

/** The project roadmap (data in src/admin/roadmap.ts). */
export default function RoadmapView() {
  const all = PHASES.flatMap((phase) => phase.items)
  const counts = (Object.keys(STATUS) as Status[]).map((status) => ({ status, count: all.filter((item) => item.status === status).length }))
  const shipped = PHASES.flatMap((phase) => phase.items.filter((item) => item.date).map((item) => ({ ...item, phase: phase.title }))).sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '') || (b.pr ?? 0) - (a.pr ?? 0)
  )

  return (
    <div className="flex flex-col gap-6" data-testid="roadmap">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Para onde o jogo vai</CardTitle>
          <CardDescription>Atualizado em {formatDate(ROADMAP_UPDATED)} · muda a cada entrega</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{VISION}</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span>Progresso geral</span>
              <span className="text-muted-foreground">
                {done(all)} de {all.length} itens feitos
              </span>
            </div>
            <Progress value={(done(all) / all.length) * 100} />
          </div>
          <div className="flex flex-wrap gap-2">
            {counts.map(({ status, count }) => (
              <span key={status} className="inline-flex items-center gap-2 text-sm">
                <StatusBadge status={status} /> {count}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PHASES.map((phase) => (
          <Card key={phase.id} data-testid="roadmap-phase">
            <CardHeader>
              <CardTitle>{phase.title}</CardTitle>
              <CardDescription>{phase.goal}</CardDescription>
              <div className="flex items-center gap-3 pt-1">
                <Progress value={(done(phase.items) / phase.items.length) * 100} className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  {done(phase.items)}/{phase.items.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {phase.items.map((item) => (
                  <li key={item.title} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.pr && <PrLink pr={item.pr} />}
                    </div>
                    {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas entregas</CardTitle>
            <CardDescription>O que já está no jogo, do mais novo para o mais antigo</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
              {shipped.map((item) => (
                <li key={`${item.pr}-${item.title}`} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.date!)} · {item.phase} {item.pr && <PrLink pr={item.pr} />}
                  </p>
                  <p className="text-sm">{item.title}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decisões</CardTitle>
            <CardDescription>Os caminhos escolhidos e por quê</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {DECISIONS.map((decision) => (
              <div key={decision.title} className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{formatDate(decision.date)}</p>
                <p className="text-sm font-medium">{decision.title}</p>
                <p className="text-sm">{decision.choice}</p>
                <p className="text-xs text-muted-foreground">{decision.why}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
