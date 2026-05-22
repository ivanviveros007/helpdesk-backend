import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

export interface TicketUpdatedPayload {
  ticketId: string;
  status: string;
  category: string | null;
  priority: number | null;
  level: number | null;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  reasoning: string | null;
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
    if (technicianId) {
      void client.join(`tech:${technicianId}`);
      this.logger.log(`Technician ${technicianId} connected (socket: ${client.id})`);
    } else {
      this.logger.log(`Anonymous client connected (socket: ${client.id})`);
    }
  }

  emitTicketUpdated(payload: TicketUpdatedPayload): void {
    this.server.emit('ticket:updated', payload);

    if (payload.assignedTechnicianId) {
      this.server
        .to(`tech:${payload.assignedTechnicianId}`)
        .emit('ticket:assigned_to_you', payload);
    }
  }
}
