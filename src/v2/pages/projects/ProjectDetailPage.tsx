import { useCallback, useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { ExternalLink, Send } from '@/icons';
import type { Project } from '@/core/types';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { formatDateRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageSplit, PagePanel } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Textarea } from '@/v2/components/ui/textarea';
import { toast } from 'sonner';

interface Comment { id?: number; author_name?: string; content: string; created_at: string }
interface ProjectDoc { id: number; title: string; created_at: string }

export default function ProjectDetailPage() {
  const [, params] = useRoute('/v2/projects/:id');
  const projectId = Number(params?.id);
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<ProjectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    const [c, d] = await Promise.all([
      apiCommand<Comment[]>('get_project_comments', { project_id: projectId }).catch(() => [] as Comment[]),
      apiCommand<ProjectDoc[]>('get_project_documents', { project_id: projectId }).catch(() => [] as ProjectDoc[]),
    ]);
    setComments(Array.isArray(c) ? c : []);
    setDocuments(Array.isArray(d) ? d : []);
  }, [projectId]);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!projectId) return;
    const fromStore = projects.find((p) => p.id === projectId) ?? null;
    setProject(fromStore);
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [projectId, projects, loadData]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await apiCommand('add_project_comment', {
        project_id: projectId,
        content: newComment.trim(),
      });
      setNewComment('');
      await loadData();
      toast.success('Comentariu adăugat');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    } finally {
      setPosting(false);
    }
  };

  if (!projectId) {
    return <Page fill><p className="density-meta text-muted-foreground">Proiect invalid.</p></Page>;
  }

  return (
    <Page fill>
      <PageHeader
        title={project?.name ?? `Proiect #${projectId}`}
        description={project?.client_name}
        actions={
          <Button size="sm" variant="outline" onClick={() => { window.location.hash = `/v2/parts-tree/${projectId}`; }}>
            <ExternalLink className="mr-2 h-4 w-4" />Arbore piese
          </Button>
        }
      />
      <PageBody>
        <AsyncContent loading={loading && !project} error={null}>
          {project && (
            <PageSplit variant="detail">
              <PagePanel scroll>
                <div className="density-form space-y-4 p-[var(--density-card-p)] text-[length:var(--density-fs-body)]">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={project.status} />
                    {project.priority && <StatusBadge status={project.priority} />}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="density-meta text-muted-foreground">Etapă curentă</p>
                      <p className="font-medium">{project.stage || '—'}</p>
                    </div>
                    <div>
                      <p className="density-meta text-muted-foreground">Termen</p>
                      <p className="font-medium">{project.deadline ? formatDateRo(project.deadline) : '—'}</p>
                    </div>
                    <div>
                      <p className="density-meta text-muted-foreground">Client</p>
                      <p className="font-medium">{project.client_name || '—'}</p>
                    </div>
                    <div>
                      <p className="density-meta text-muted-foreground">Prioritate</p>
                      <p className="font-medium capitalize">{project.priority || '—'}</p>
                    </div>
                  </div>
                  {project.description && (
                    <div>
                      <p className="density-meta mb-1 text-muted-foreground">Descriere</p>
                      <p className="whitespace-pre-wrap">{project.description}</p>
                    </div>
                  )}
                  {documents.length > 0 && (
                    <div>
                      <p className="density-meta mb-2 font-semibold uppercase tracking-wide text-muted-foreground">Documente</p>
                      <ul className="space-y-1">
                        {documents.map((d) => (
                          <li key={d.id} className="density-list-item flex items-center gap-2 rounded border px-2">
                            <span className="flex-1 truncate">{d.title}</span>
                            <span className="density-meta text-muted-foreground">{formatDateRo(d.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </PagePanel>

              <PagePanel scroll className="flex flex-col">
                <div className="density-form flex flex-1 flex-col gap-3 p-[var(--density-card-p)]">
                  <h3 className="density-page-title font-semibold">Comentarii ({comments.length})</h3>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="density-meta text-muted-foreground">Niciun comentariu.</p>
                    ) : (
                      comments.map((c, i) => (
                        <div key={c.id ?? i} className="rounded border bg-muted/30 px-3 py-2">
                          <p className="density-meta mb-0.5 font-medium text-primary/80">{c.author_name || 'Tu'}</p>
                          <p className="text-[length:var(--density-fs-body)] whitespace-pre-wrap">{c.content}</p>
                          <p className="density-meta mt-1 text-muted-foreground">{formatDateRo(c.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Textarea
                      className="resize-none text-[length:var(--density-fs-body)]"
                      rows={2}
                      placeholder="Adaugă un comentariu…"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          void postComment();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={!newComment.trim() || posting}
                      onClick={() => void postComment()}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </PagePanel>
            </PageSplit>
          )}
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
