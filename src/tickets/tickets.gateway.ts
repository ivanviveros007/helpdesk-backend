import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface NewCommentPayload {
  ticketId: string;
  technicianId: string | null;
  userId: string | null;
  comment: {
    id: string;
    author_name: string;
    author_role: string;
    body: string;
    attachments: Array<{ url: string; filename: string; mimetype: string; key: string }>;
    created_at: string;
  };
}

export interface TicketUpdatedPayload {
  ticketId: string;
  status: string;
  category: string | null;
  priority: number | null;
  level: number | null;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  reasoning: string | null;
  createdByUserId: string | null;
  updatedAt: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
      cb(null, true);
    },
    credentials: true,
  },
  namespace: '/tickets',
})
export class TicketsGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TicketsGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized at /tickets');
  }

  handleConnection(client: Socket) {
    const technicianId = client.handshake.query.technicianId as string;
    const userId = client.handshake.query.userId as string;

    if (technicianId) {
      void client.join(`tech:${technicianId}`);
      this.logger.log(`Technician ${technicianId} connected (socket: ${client.id})`);
    } else if (userId) {
      void client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
    } else {
      this.logger.log(`Anonymous client connected (socket: ${client.id})`);
    }
  }

  emitNewComment(payload: NewCommentPayload): void {
    if (payload.technicianId) {
      this.server.to(`tech:${payload.technicianId}`).emit('ticket:new_comment', payload);
    }
    if (payload.userId) {
      this.server.to(`user:${payload.userId}`).emit('ticket:new_comment', payload);
    }
  }

  emitTicketUpdated(payload: TicketUpdatedPayload): void {
    // Notify the technician assigned to the ticket
    if (payload.assignedTechnicianId) {
      this.server
        .to(`tech:${payload.assignedTechnicianId}`)
        .emit('ticket:assigned_to_you', payload);
    }

    // Notify the user who created the ticket
    if (payload.createdByUserId) {
      this.server
        .to(`user:${payload.createdByUserId}`)
        .emit('ticket:status_changed', payload);
    }
  }
}
