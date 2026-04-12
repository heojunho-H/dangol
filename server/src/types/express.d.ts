declare namespace Express {
  interface Request {
    userId: string;
    workspaceId: string;
    userRole: string;
  }
}
