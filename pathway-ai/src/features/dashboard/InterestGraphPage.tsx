import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { buildInterestGraph, type GraphNodeKind } from '@/domain/engine/graph';
import { groupBy } from '@/lib/format';

/* Section 65 — interest graph. */

const KIND_ORDER: GraphNodeKind[] = ['interest', 'skill', 'activity', 'project', 'major', 'college', 'career'];
const KIND_ICON: Record<GraphNodeKind, IconName> = {
  interest: 'heart',
  skill: 'zap',
  activity: 'users',
  project: 'rocket',
  major: 'book',
  college: 'graduation',
  career: 'building',
};
const KIND_LABEL: Record<GraphNodeKind, string> = {
  interest: 'Interests',
  skill: 'Skills',
  activity: 'Activities',
  project: 'Projects',
  major: 'Majors',
  college: 'Colleges',
  career: 'Careers',
};

export function InterestGraphPage() {
  const ctx = useEngine();
  const graph = useMemo(() => buildInterestGraph(ctx), [ctx]);
  const [focused, setFocused] = useState<string | undefined>();

  const byKind = useMemo(() => groupBy(graph.nodes, (n) => n.kind), [graph.nodes]);
  const connected = useMemo(() => {
    if (!focused) return new Set<string>();
    const set = new Set<string>();
    for (const e of graph.edges) {
      if (e.from === focused) set.add(e.to);
      if (e.to === focused) set.add(e.from);
    }
    return set;
  }, [focused, graph.edges]);

  const focusedEdges = useMemo(
    () => (focused ? graph.edges.filter((e) => e.from === focused || e.to === focused) : []),
    [focused, graph.edges],
  );
  const focusedNode = graph.nodes.find((n) => n.id === focused);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Interest graph"
        title="How your interests actually connect"
        description="Interests lead to skills, skills show up in activities, activities point toward majors, and majors open onto colleges and careers. Select anything to see what it connects to and why."
      />

      <AIGuidanceNote>
        <strong>This is built from your own profile.</strong> Items marked as yours came from what you entered. Everything else
        is catalog data suggested because of a connection to something of yours.
      </AIGuidanceNote>

      {graph.discoveries.length ? (
        <section className="mt-6">
          <SectionHeader
            title="Routes you may not have considered"
            description="Combinations that cross categories are usually the most distinctive thing a student has."
          />
          <div className="grid-fit">
            {graph.discoveries.map((d, i) => (
              <Card key={i} pad="md" className="card-accent">
                <div className="row g-2 wrap items-center mb-3">
                  {d.path.map((p, pi) => (
                    <span key={pi} className="row g-2 items-center">
                      <Badge tone={pi === 0 ? 'accent' : 'default'}>{p}</Badge>
                      {pi < d.path.length - 1 ? <Icon name="arrow-right" size={12} className="subtle" /> : null}
                    </span>
                  ))}
                </div>
                <p className="t-sm muted">{d.insight}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {graph.nodes.length ? (
        <>
          <section className="mt-8">
            <SectionHeader
              title="Your graph"
              description="Columns run from what you like through to where it could lead. Select a node to highlight its connections."
              action={focused ? <Button size="sm" variant="ghost" icon="x" onClick={() => setFocused(undefined)}>Clear selection</Button> : undefined}
            />
            <div className="overflow-x">
              <div className="row items-start g-4" style={{ minWidth: 820 }}>
                {KIND_ORDER.filter((k) => byKind[k]?.length).map((kind, ki) => (
                  <div key={kind} className="col g-2" style={{ flex: '1 1 0', minWidth: 130 }}>
                    <div className="row g-2 items-center mb-1">
                      <Icon name={KIND_ICON[kind]} size={14} className="subtle" />
                      <p className="eyebrow">{KIND_LABEL[kind]}</p>
                    </div>
                    {byKind[kind].map((node) => {
                      const isFocused = node.id === focused;
                      const isConnected = connected.has(node.id);
                      const dimmed = focused && !isFocused && !isConnected;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          className={`card card-pad-sm ${isFocused ? 'card-accent' : 'card-hover'}`}
                          style={{
                            textAlign: 'left',
                            opacity: dimmed ? 0.32 : 1,
                            transition: 'opacity var(--dur-2) var(--ease-out)',
                          }}
                          onClick={() => setFocused(isFocused ? undefined : node.id)}
                          aria-pressed={isFocused}
                        >
                          <span className="t-xs w-600 clamp-2">{node.label}</span>
                          {node.fromProfile ? (
                            <span className="badge badge-accent mt-2" style={{ fontSize: 9 }}>
                              Yours
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                    {ki < KIND_ORDER.length - 1 ? null : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {focusedNode ? (
            <Card pad="md" className="mt-5">
              <SectionHeader
                title={`${focusedNode.label} connects to`}
                description={`${focusedEdges.length} connection${focusedEdges.length === 1 ? '' : 's'} in your graph.`}
                action={focusedNode.route ? <Button size="sm" to={focusedNode.route} iconRight="arrow-right">Open</Button> : undefined}
              />
              <ul className="col g-3">
                {focusedEdges.map((e, i) => {
                  const otherId = e.from === focused ? e.to : e.from;
                  const other = graph.nodes.find((n) => n.id === otherId);
                  return (
                    <li key={i} className="row-top g-3">
                      <Icon name={other ? KIND_ICON[other.kind] : 'link'} size={14} className="c-accent shrink-0" style={{ marginTop: 3 }} />
                      <div>
                        <button type="button" className="t-sm w-600" onClick={() => setFocused(otherId)}>
                          {other?.label ?? otherId}
                        </button>
                        <p className="t-xs subtle">{e.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="link"
          title="Not enough in your profile yet"
          description="Add some interests and activities and your graph appears. It gets more useful the more you put in."
          action={
            <Link to="/app/settings/profile" className="btn btn-primary">
              Update your profile
            </Link>
          }
        />
      )}

      <p className="t-2xs faint mt-8">
        {graph.nodes.length} nodes, {graph.edges.length} connections. Only the most relevant catalog entries are shown so the
        graph stays readable.
      </p>
    </div>
  );
}
