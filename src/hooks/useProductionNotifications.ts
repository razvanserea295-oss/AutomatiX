import { useNotificationStore, createBlockageNotification, createDeadlineNotification, createCompletionNotification } from '../store/notificationStore';





export const useProductionNotifications = () => {
  const { addNotification } = useNotificationStore();

  


  const notifyProjectBlocked = (projectId: number, projectName: string) => {
    addNotification(createBlockageNotification(projectId, projectName));
  };

  


  const notifyDeadlineApproaching = (projectId: number, projectName: string, hoursRemaining: number) => {
    addNotification(createDeadlineNotification(projectId, projectName, hoursRemaining));
  };

  


  const notifyPieceCompleted = (pieceId: number, pieceName: string) => {
    addNotification(createCompletionNotification(pieceId, pieceName));
  };

  return {
    notifyProjectBlocked,
    notifyDeadlineApproaching,
    notifyPieceCompleted,
  };
};
