'use client';

import { use } from 'react';
import { AuthGate } from '@/components/auth/auth-gate';
import { ProjectDetail } from '@/components/projects/project-detail';

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <AuthGate>{(user) => <ProjectDetail userId={user.uid} projectId={projectId} />}</AuthGate>;
}
