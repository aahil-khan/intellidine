import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketBroadcastService {
  private server: Server;
  private readonly logger = new Logger(SocketBroadcastService.name);

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Broadcast order event to orders room
   */
  broadcastOrderEvent(
    tenantId: string,
    eventType: 'created' | 'status_changed' | 'completed' | 'cancelled',
    data: any,
  ) {
    if (!this.server) return;

    const roomName = `orders:${tenantId}`;
    this.server.to(roomName).emit(`order:${eventType}`, {
      timestamp: new Date().toISOString(),
      eventType,
      data,
    });

    this.logger.log(
      `Broadcast order:${eventType} to ${roomName} - Order ID: ${data.order_id}`,
    );
  }

  /**
   * Broadcast to kitchen display system
   */
  broadcastKitchenEvent(
    tenantId: string,
    eventType: 'order_received' | 'order_ready' | 'order_serving',
    data: any,
  ) {
    if (!this.server) return;

    const roomName = `kitchen:${tenantId}`;
    this.server.to(roomName).emit(`kitchen:${eventType}`, {
      timestamp: new Date().toISOString(),
      eventType,
      data,
    });

    this.logger.log(
      `Broadcast kitchen:${eventType} to ${roomName} - Order ID: ${data.order_id}`,
    );
  }

  /**
   * Broadcast to managers
   */
  broadcastManagerEvent(
    tenantId: string,
    eventType:
      | 'payment_confirmed'
      | 'inventory_low'
      | 'order_spike'
      | 'alert',
    data: any,
  ) {
    if (!this.server) return;

    const roomName = `managers:${tenantId}`;
    this.server.to(roomName).emit(`manager:${eventType}`, {
      timestamp: new Date().toISOString(),
      eventType,
      data,
    });

    this.logger.log(
      `Broadcast manager:${eventType} to ${roomName} - Data: ${JSON.stringify(data).substring(0, 50)}...`,
    );
  }

  /**
   * Broadcast to customer (direct emit to user)
   */
  broadcastToCustomer(
    tenantId: string,
    userId: string,
    eventType: string,
    data: any,
  ) {
    if (!this.server) return;

    const roomName = `customer:${tenantId}:${userId}`;
    this.server.to(roomName).emit(`customer:${eventType}`, {
      timestamp: new Date().toISOString(),
      eventType,
      data,
    });

    this.logger.log(`Broadcast customer:${eventType} to ${roomName}`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    if (!this.server) return 0;
    return this.server.engine.clientsCount;
  }

  /**
   * Emit event to tenant (all connected users in tenant)
   */
  broadcastToTenant(tenantId: string, eventType: string, data: any) {
    if (!this.server) return;

    // Send to all rooms starting with tenant ID
    const rooms = Array.from(this.server.sockets.adapter.rooms.keys());
    const tenantRooms = rooms.filter(
      (room) => room.includes(tenantId) && !room.startsWith('socket.io'),
    );

    tenantRooms.forEach((room) => {
      this.server.to(room).emit(`tenant:${eventType}`, {
        timestamp: new Date().toISOString(),
        eventType,
        data,
      });
    });

    this.logger.log(
      `Broadcast tenant:${eventType} to ${tenantRooms.length} rooms`,
    );
  }
}
