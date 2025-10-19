import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketBroadcastService } from '../services/socket-broadcast.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedClients = new Map<string, ClientInfo>();

  constructor(private readonly broadcastService: SocketBroadcastService) {
    this.broadcastService.setServer(this.server);
  }

  handleConnection(client: Socket) {
    const clientId = client.id;
    const { user_id, tenant_id, type } = client.handshake.query;

    const userType = (type as string)?.toLowerCase() === 'staff' ? 'staff' : 'customer';

    const clientInfo: ClientInfo = {
      socketId: clientId,
      userId: user_id as string,
      tenantId: tenant_id as string,
      userType,
      connectedAt: new Date(),
    };

    this.connectedClients.set(clientId, clientInfo);
    this.logger.log(
      `Client connected: ${clientId} (user: ${user_id}, type: ${userType})`,
    );

    // Emit connection confirmation
    client.emit('connection:established', {
      socketId: clientId,
      message: 'Connected to notification service',
    });
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    const clientInfo = this.connectedClients.get(clientId);

    this.connectedClients.delete(clientId);
    this.logger.log(
      `Client disconnected: ${clientId} (user: ${clientInfo?.userId})`,
    );
  }

  @SubscribeMessage('subscribe:orders')
  handleSubscribeOrders(client: Socket, data: { tenant_id: string }) {
    const roomName = `orders:${data.tenant_id}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to ${roomName}`);
    return { success: true, room: roomName };
  }

  @SubscribeMessage('unsubscribe:orders')
  handleUnsubscribeOrders(client: Socket, data: { tenant_id: string }) {
    const roomName = `orders:${data.tenant_id}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);
    return { success: true, room: roomName };
  }

  @SubscribeMessage('subscribe:kitchen')
  handleSubscribeKitchen(client: Socket, data: { tenant_id: string }) {
    const roomName = `kitchen:${data.tenant_id}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to ${roomName}`);
    return { success: true, room: roomName };
  }

  @SubscribeMessage('unsubscribe:kitchen')
  handleUnsubscribeKitchen(client: Socket, data: { tenant_id: string }) {
    const roomName = `kitchen:${data.tenant_id}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);
    return { success: true, room: roomName };
  }

  @SubscribeMessage('subscribe:managers')
  handleSubscribeManagers(client: Socket, data: { tenant_id: string }) {
    const roomName = `managers:${data.tenant_id}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to ${roomName}`);
    return { success: true, room: roomName };
  }

  @SubscribeMessage('unsubscribe:managers')
  handleUnsubscribeManagers(client: Socket, data: { tenant_id: string }) {
    const roomName = `managers:${data.tenant_id}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from ${roomName}`);
    return { success: true, room: roomName };
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): { pong: boolean } {
    return { pong: true };
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getClientInfo(socketId: string): ClientInfo | undefined {
    return this.connectedClients.get(socketId);
  }
}

interface ClientInfo {
  socketId: string;
  userId: string;
  tenantId: string;
  userType: 'staff' | 'customer';
  connectedAt: Date;
}
