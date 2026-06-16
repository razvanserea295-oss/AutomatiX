import { useEffect, useCallback } from 'react';
import { useProductionNotifications } from './useProductionNotifications';
import type { Project } from '@/core/types';

interface ProductionPiece {
  id: number;
  name: string;
  phases: Record<string, 'neinceput' | 'in_lucru' | 'finalizat'>;
}





export const useAutoNotifications = () => {
  const { notifyProjectBlocked, notifyDeadlineApproaching, notifyPieceCompleted } =
    useProductionNotifications();

  


  const checkProjectBlocked = useCallback((project: Project) => {
    if (project.status === 'blocked') {
      notifyProjectBlocked(project.id, project.name);
    }
  }, [notifyProjectBlocked]);

  


  const checkDeadlineApproaching = useCallback((project: Project) => {
    if (!project.deadline) return;
    const deadline = new Date(project.deadline);
    const now = new Date();
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining > 0 && hoursRemaining < 24) {
      notifyDeadlineApproaching(project.id, project.name, Math.round(hoursRemaining));
    }
  }, [notifyDeadlineApproaching]);

  


  const checkPieceCompleted = useCallback((piece: ProductionPiece) => {
    const allPhasesCompleted = Object.values(piece.phases).every(
      (status) => status === 'finalizat'
    );

    if (allPhasesCompleted) {
      notifyPieceCompleted(piece.id, piece.name);
    }
  }, [notifyPieceCompleted]);

  


  const monitorProjects = useCallback((projects: Project[]) => {
    projects.forEach((project) => {
      checkProjectBlocked(project);
      checkDeadlineApproaching(project);
    });
  }, [checkProjectBlocked, checkDeadlineApproaching]);

  


  const monitorPieces = useCallback((pieces: ProductionPiece[]) => {
    pieces.forEach((piece) => {
      checkPieceCompleted(piece);
    });
  }, [checkPieceCompleted]);

  return {
    monitorProjects,
    monitorPieces,
    checkProjectBlocked,
    checkDeadlineApproaching,
    checkPieceCompleted,
  };
};





export const useProductionPolling = (
  fetchProjects: () => Promise<Project[]>,
  fetchPieces: () => Promise<ProductionPiece[]>,
  pollInterval: number = 30000 
) => {
  const { monitorProjects, monitorPieces } = useAutoNotifications();

  useEffect(() => {
    const poll = async () => {
      try {
        const [projects, pieces] = await Promise.all([
          fetchProjects(),
          fetchPieces(),
        ]);

        monitorProjects(projects);
        monitorPieces(pieces);
      } catch (error) {
        console.error('Error polling production data:', error);
      }
    };

    
    poll();

    
    const interval = setInterval(poll, pollInterval);

    return () => clearInterval(interval);
  }, [fetchProjects, fetchPieces, pollInterval, monitorProjects, monitorPieces]);
};
